/**
 * The door engine (M2).
 *
 * startup -> its investors -> their keyrings -> candidate doors, each with
 *   - a fit sentence ("why you"),
 *   - a reason (why now) when there is a dated, sourced event,
 *   - the warm path (shared investor).
 * Plus Door Count per investor.
 */
import { fetchCompany, fetchRound, hostOf, searchEntities } from "./graph";
import { normalizeCompany } from "./normalize";
import { seedSlugForName } from "./seed";
import { fitBetween, isBoilerplate, sectorsOf, type Fit, type Sector } from "./sectors";
import type { Company, Dataset, Source } from "./types";
import type { FaroEvent } from "./events";

export const DAY = 86_400_000;
/** A door "opened" if its reason is at most this old. */
export const OPEN_WINDOW_DAYS = 120;

export interface Reason {
  kind: "round" | "market-entry";
  date: string; // YYYY-MM-DD, always concrete
  text: string; // "raised a €9M Series A"
  source: { name: string; url: string };
}

export interface WarmPath {
  investorId: string;
  investorName: string;
}

export interface Door {
  companyId: string;
  name: string;
  country: string | null;
  blurb: string | null;
  sectors: Sector[];
  fit: Fit;
  via: WarmPath[];
  reason: Reason | null;
  /** Market-entry door without a shared investor. */
  timed?: boolean;
}

export interface StartupProfile {
  id: string | null;
  name: string;
  description: string;
  country: string | null;
  sectors: Sector[];
  investors: WarmPath[];
  resolvedFrom: "dataset" | "cala" | "none";
}

export interface DoorReport {
  now: string;
  startup: StartupProfile;
  /** Doors with a reason inside the window, newest first. */
  opened: Door[];
  /** Market-entry doors without a warm path whose market matches the startup's. */
  timed: Door[];
  /** All candidate doors (fit-ranked), for the map and the count. */
  doors: Door[];
  doorCount: { investorId: string; investorName: string; count: number; keyring: number }[];
}

// ---------- helpers ----------
const AGGREGATOR = /tracxn|crunchbase|pitchbook|openvc|dealroom|cbinsights|owler|zoominfo|craft\.co|golden\.com/;

export function isConcreteDate(d: string | null | undefined): d is string {
  return !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY);
}

export function fmtAmount(amount: number | null, currency: string | null): string | null {
  if (!amount || amount <= 0) return null;
  const sym = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "SEK" ? "SEK " : currency ? `${currency} ` : "";
  const v = amount >= 1e9 ? `${+(amount / 1e9).toFixed(1)}B` : amount >= 1e6 ? `${+(amount / 1e6).toFixed(1)}M` : amount >= 1e3 ? `${Math.round(amount / 1e3)}K` : String(amount);
  return `${sym}${v}`;
}

/** Pick the best source for an event on a date: press near the date, then anything. */
export function pickSource(sources: Source[], date: string): { name: string; url: string } | null {
  if (!sources.length) return null;
  const ranked = [...sources].sort((a, b) => rank(b) - rank(a));
  const s = ranked[0];
  return { name: s.name && !/^https?:/.test(s.name) && s.name.length < 40 ? s.name : hostOf(s.url), url: s.url };
  function rank(x: Source) {
    let r = 0;
    if (!AGGREGATOR.test(x.url)) r += 4;
    if (x.date && Math.abs(daysBetween(x.date, date)) <= 10) r += 3;
    if (x.url.includes(date.slice(0, 4))) r += 1;
    return r;
  }
}

/** "SERIES_A" -> "Series A", "PRE_SEED" -> "pre-seed", "SEED" -> "seed". */
export function prettyRound(t: string | null): string | null {
  if (!t || /^(other|unknown|undisclosed|not specified|n\/a)$/i.test(t.replace(/_/g, " "))) return null;
  const x = t.replace(/_/g, " ").trim().toLowerCase();
  const m = x.match(/^series ([a-z])(\+?)$/);
  if (m) return `Series ${m[1].toUpperCase()}${m[2]}`;
  if (x === "pre seed" || x === "pre-seed") return "pre-seed";
  if (x === "seed" || x === "angel" || x === "grant" || x === "growth" || x === "venture" || x === "bridge") return x;
  return x.replace(/\b(\w)/, (c) => c.toLowerCase());
}

function roundText(roundType: string | null, amount: number | null, currency: string | null) {
  const amt = fmtAmount(amount, currency);
  const t0 = prettyRound(roundType);
  const t = t0 && /^(seed|pre-seed|angel|bridge|growth|venture)$/.test(t0) ? `${t0} round` : t0;
  if (amt && t) return `raised ${/^[aeiou]/i.test(amt) ? "an" : "a"} ${amt} ${t}`;
  if (amt) return `raised ${amt}`;
  if (t) return `closed ${/^[aeiou]/i.test(t) ? "an" : "a"} ${t.endsWith("round") ? t : `${t} round`}`;
  return "raised a round";
}

/** Latest concrete, sourced reason for a company. */
export function reasonFor(ds: Dataset, c: Company, events: FaroEvent[], now: string): Reason | null {
  const cands: Reason[] = [];
  for (const rid of c.roundIds) {
    const r = ds.rounds[rid];
    if (!r || !isConcreteDate(r.date) || r.date > now) continue;
    const src = pickSource(r.sources, r.date);
    if (!src) continue;
    cands.push({ kind: "round", date: r.date, text: roundText(r.roundType, r.amount, r.currency), source: src });
  }
  for (const e of events) {
    if (e.companyId !== c.id || !isConcreteDate(e.date) || e.date > now) continue;
    cands.push({ kind: e.kind, date: e.date, text: e.text, source: e.source });
  }
  cands.sort((a, b) => b.date.localeCompare(a.date));
  // de-duplicate the same round reported by both the graph and the daily job
  return cands[0] ?? null;
}

export function blurbOf(c: { description: string | null }): string | null {
  if (isBoilerplate(c.description)) return null;
  let d = (c.description ?? "").trim().replace(/\.$/, "");
  d = d.charAt(0).toLowerCase() + d.slice(1);
  return d.length > 120 ? d.slice(0, 117).replace(/\s\S*$/, "") + "…" : d;
}

/**
 * Sector evidence for a company: its description, enrichment, the titles and URL slugs of the
 * sources behind its rounds ("vensum-power-raises-eur9m-to-cut-power-loss"), and what the daily
 * job reported alongside its events. Evidence only; none of it is shown verbatim.
 */
export function companySectors(c: Company, enrich?: Record<string, string>, ds?: Dataset, events: FaroEvent[] = []): Sector[] {
  const parts = [c.name, c.description ?? "", enrich?.[c.id] ?? ""];
  if (ds) {
    const token = normalizeCompany(c.name).split(" ")[0];
    for (const rid of c.roundIds) {
      for (const src of ds.rounds[rid]?.sources ?? []) {
        // only sources that are about this company (skip roundups and aggregator pages)
        const about = token.length >= 3 && `${src.name} ${src.url}`.toLowerCase().replace(/[^a-z0-9]+/g, "").includes(token.replace(/ /g, ""));
        if (about && !/tracxn|crunchbase|pitchbook|dealroom|prh\.fi/.test(src.url)) {
          if (/\s/.test(src.name)) parts.push(src.name.replace(/\|[^|]*$/, "")); // article titles, not "site.com"
          try {
            parts.push(decodeURIComponent(new URL(src.url).pathname).replace(/[-_/]+/g, " "));
          } catch {}
        }
      }
    }
  }
  for (const e of events) if (e.companyId === c.id && e.description) parts.push(e.description);
  return sectorsOf(parts.join(" "), c.industries).filter((x) => x !== "consumer" || !!c.description);
}

// ---------- startup resolution ----------
/** Words that may trail a brand in a legal name: "Oura" finds "Oura Health". */
const BRAND_TRAIL = new Set(["health", "technologies", "technology", "tech", "group", "labs", "lab", "ai", "app", "games", "studios", "studio", "energy", "power", "systems", "solutions", "software", "holding", "holdings", "international", "global", "nordic", "finland", "sweden", "norway", "denmark", "io", "hq"]);

export function findInDataset(ds: Dataset, name: string): Company | null {
  const key = normalizeCompany(name);
  if (!key) return null;
  const squash = key.replace(/ /g, "");
  let best: Company | null = null;
  let bestRank = -1;
  for (const c of Object.values(ds.companies)) {
    for (const k of [c.name, ...c.aliases].map(normalizeCompany)) {
      let rank = -1;
      if (k === key) rank = 3;
      else if (k.replace(/ /g, "") === squash) rank = 2;
      else if (k.startsWith(key + " ") && k.slice(key.length + 1).split(" ").every((t) => BRAND_TRAIL.has(t))) rank = 1;
      else if (key.startsWith(k + " ") && key.slice(k.length + 1).split(" ").every((t) => BRAND_TRAIL.has(t))) rank = 1;
      if (rank > bestRank || (rank === bestRank && rank >= 0 && best && c.investors.length > best.investors.length)) {
        if (rank >= 0) {
          best = c;
          bestRank = rank;
        }
      }
    }
  }
  return best;
}

const NORDIC = /(Finland|Finnish|Sweden|Swedish|Norway|Norwegian|Denmark|Danish|Iceland|Estonia|Helsinki|Stockholm|Oslo|Copenhagen)/;

export async function resolveStartup(
  ds: Dataset,
  name: string,
  description: string,
  opts: { live: boolean },
): Promise<StartupProfile> {
  const invName = (id: string) => ds.investors.find((i) => i.id === id)?.name ?? id;
  const local = findInDataset(ds, name);
  if (local) {
    const typed = name.trim();
    const brandOnly = normalizeCompany(typed) !== normalizeCompany(local.name) && typed.length < local.name.length;
    return {
      id: local.id,
      name: brandOnly ? typed : local.name,
      description: description || local.description || "",
      country: local.country,
      sectors: sectorsOf([local.name, description, local.description ?? ""].join(" "), local.industries),
      investors: local.investors.map((l) => ({ investorId: l.investorId, investorName: invName(l.investorId) })),
      resolvedFrom: "dataset",
    };
  }
  if (opts.live) {
    const cands = await searchEntities(name, { types: ["Company", "Organization"], limit: 10 }).catch(() => []);
    const key = normalizeCompany(name);
    const exact = cands.filter((c) => normalizeCompany(c.name) === key);
    const pick = exact.find((c) => NORDIC.test(c.description ?? "")) ?? exact[0] ?? null;
    if (pick) {
      const raw = await fetchCompany(pick.id);
      if (raw) {
        const inv = new Map<string, string>();
        for (const i of raw.investors) {
          const s = (ds.idIndex[i.id]?.kind === "investor" ? ds.idIndex[i.id].id : undefined) ?? seedSlugForName(i.name);
          if (s && ds.keyrings[s]) inv.set(s, invName(s));
        }
        for (const r of raw.rounds.slice(0, 12)) {
          const round = await fetchRound(r.id, r.kind).catch(() => null);
          for (const i of round?.investors ?? []) {
            const s = (ds.idIndex[i.id]?.kind === "investor" ? ds.idIndex[i.id].id : undefined) ?? seedSlugForName(i.name);
            if (s && ds.keyrings[s]) inv.set(s, invName(s));
          }
        }
        return {
          id: raw.id,
          name: raw.aliases.find((a) => a.length < raw.name.length) ?? raw.name,
          description: description || raw.description || "",
          country: raw.country,
          sectors: sectorsOf([raw.name, description, raw.description ?? ""].join(" "), raw.industries),
          investors: [...inv.entries()].map(([investorId, investorName]) => ({ investorId, investorName })),
          resolvedFrom: "cala",
        };
      }
    }
  }
  return { id: null, name, description, country: null, sectors: sectorsOf(`${name} ${description}`), investors: [], resolvedFrom: "none" };
}

// ---------- the engine ----------
export function buildReport(
  ds: Dataset,
  startup: StartupProfile,
  opts: { now: string; events: FaroEvent[]; enrich?: Record<string, string>; fitOverrides?: Record<string, string> },
): DoorReport {
  const { now, events } = opts;
  const own = new Set<string>(startup.id ? [startup.id, ...(ds.companies[startup.id]?.ids ?? [])] : []);
  const doorsById = new Map<string, Door>();

  for (const inv of startup.investors) {
    for (const cid of ds.keyrings[inv.investorId] ?? []) {
      if (own.has(cid)) continue;
      const c = ds.companies[cid];
      if (!c) continue;
      if (normalizeCompany(c.name) === normalizeCompany(startup.name)) continue;
      let d = doorsById.get(cid);
      if (!d) {
        const sectors = companySectors(c, opts.enrich, ds, events);
        const blurb = blurbOf(c) ?? (opts.enrich?.[cid] ? opts.enrich[cid].replace(/\.$/, "") : null);
        const fit = fitBetween(
          { name: startup.name, sectors: startup.sectors, country: startup.country },
          { name: c.name, sectors, country: c.country, blurb },
        );
        const override = opts.fitOverrides?.[`${startup.id ?? startup.name}::${cid}`];
        d = {
          companyId: cid,
          name: c.name,
          country: c.country,
          blurb,
          sectors,
          fit: override ? { ...fit, sentence: override } : fit,
          via: [],
          reason: reasonFor(ds, c, events, now),
        };
        doorsById.set(cid, d);
      }
      if (!d.via.some((v) => v.investorId === inv.investorId)) d.via.push(inv);
    }
  }

  // Fresh rounds from the daily job where a shared investor took part, even if the company
  // isn't in a cached keyring yet (a brand-new portfolio company is a door too).
  const startupInv = new Map(startup.investors.map((i) => [i.investorId, i]));
  for (const e of events) {
    if (e.kind !== "round" || !e.investorIds?.length || !isConcreteDate(e.date) || e.date > now) continue;
    const shared = e.investorIds.filter((id) => startupInv.has(id)).map((id) => startupInv.get(id)!);
    if (!shared.length) continue;
    const key = e.companyId ?? `event:${normalizeCompany(e.companyName)}`;
    if (normalizeCompany(e.companyName) === normalizeCompany(startup.name) || own.has(key)) continue;
    const existing = doorsById.get(key);
    if (existing) {
      for (const s of shared) if (!existing.via.some((v) => v.investorId === s.investorId)) existing.via.push(s);
      continue;
    }
    const sectors = sectorsOf(`${e.companyName} ${e.description ?? ""}`);
    const blurb = e.description ? e.description.replace(/\.$/, "").replace(/^./, (ch) => ch.toLowerCase()) : null;
    doorsById.set(key, {
      companyId: key,
      name: e.companyName,
      country: null,
      blurb,
      sectors,
      fit: fitBetween({ name: startup.name, sectors: startup.sectors, country: startup.country }, { name: e.companyName, sectors, blurb }),
      via: shared,
      reason: { kind: "round", date: e.date, text: e.text, source: e.source },
    });
  }

  const doors = [...doorsById.values()].sort(
    (a, b) => b.fit.score - a.fit.score || b.via.length - a.via.length || (b.reason?.date ?? "").localeCompare(a.reason?.date ?? ""),
  );
  const cutoff = new Date(Date.parse(now) - OPEN_WINDOW_DAYS * DAY).toISOString().slice(0, 10);
  const opened = doors
    .filter((d) => d.reason && d.reason.date >= cutoff && d.reason.date <= now)
    .sort((a, b) => b.reason!.date.localeCompare(a.reason!.date) || b.fit.score - a.fit.score);

  // Timed doors: outside companies entering the startup's market, no warm path.
  const timed: Door[] = [];
  for (const e of events) {
    if (e.kind !== "market-entry" || !e.market || !startup.country) continue;
    if (!marketMatches(e.market, startup.country)) continue;
    if (!isConcreteDate(e.date) || e.date < cutoff || e.date > now) continue;
    if (e.companyId && doorsById.has(e.companyId)) continue; // already a warm door
    timed.push({
      companyId: e.companyId ?? e.calaId ?? e.companyName,
      name: e.companyName,
      country: null,
      blurb: null,
      sectors: [],
      fit: { score: 1, sentence: `${e.companyName} is coming to ${e.market}, where you already are.`, kind: "adjacent" },
      via: [],
      reason: { kind: "market-entry", date: e.date, text: e.text, source: e.source },
      timed: true,
    });
  }
  timed.sort((a, b) => b.reason!.date.localeCompare(a.reason!.date));

  const doorCount = startup.investors
    .map((inv) => ({
      investorId: inv.investorId,
      investorName: inv.investorName,
      count: doors.filter((d) => d.fit.score >= 2 && d.via.some((v) => v.investorId === inv.investorId)).length,
      keyring: (ds.keyrings[inv.investorId] ?? []).filter((id) => !own.has(id)).length,
    }))
    .sort((a, b) => b.count - a.count || b.keyring - a.keyring);

  return { now, startup, opened, timed, doors, doorCount };
}

const MARKET_ALIASES: Record<string, string[]> = {
  Finland: ["finland"],
  Sweden: ["sweden"],
  Norway: ["norway"],
  Denmark: ["denmark"],
  Iceland: ["iceland"],
};
function marketMatches(market: string, country: string) {
  const m = market.toLowerCase();
  if (m.includes("nordic") || m.includes("scandinavia")) return ["Finland", "Sweden", "Norway", "Denmark", "Iceland"].includes(country);
  return (MARKET_ALIASES[country] ?? [country.toLowerCase()]).some((a) => m.includes(a));
}
