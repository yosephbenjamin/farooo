/**
 * The door engine, v2 (see BUILD_SPEC.md).
 *
 * A door has five parts, in order:
 *   1. why now    market entry first (new national company of a foreign firm, then expansion
 *                 news), fresh rounds second; always a concrete date and a source
 *   2. why you    the partnership they'll need: customer, integration or distribution
 *   3. where      Slush 2026, if they attend
 *   4. warm path  a shared investor, and whether they led
 *   5. who        people with roles from Cala, else a Google X-ray link
 *
 * Tiers: 1 entry + Slush + warm path, 2 entry + Slush, 3 entry, 4 fresh round + warm path.
 * Nothing else is shown.
 */
import { normalizeFund, normalizeCompany } from "./normalize";
import { seedSlugForName } from "./seed";
import { bestWhyYou, partnerTypes, PARTNER_TYPES, type PartnerType, type WhyYou } from "./partner";
import type { Industry, Person, Profile, RankedSource } from "./profile";

export const DAY = 86_400_000;
/** A new national company counts as "entering" for this long after its registry founding date. */
export const ENTRY_WINDOW_DAYS = 365;
/** Expansion news and fresh rounds count for this long. */
export const NEWS_WINDOW_DAYS = 180;
export const ROUND_WINDOW_DAYS = 120;

// ---------- inputs ----------
export interface MarketEntry {
  id: string;
  kind: "subsidiary" | "news";
  /** The foreign company (the door). */
  doorId: string;
  doorName: string;
  /** The new national company, for subsidiaries. */
  local: { id: string; name: string } | null;
  market: string; // country entered, or "the Nordics"
  date: string; // YYYY-MM-DD
  source: RankedSource;
  /** How the local company was tied to the foreign one. */
  match: "website" | "registry-parent" | "news";
}

export interface FreshRound {
  id: string;
  companyId: string;
  date: string;
  label: string | null;
  amount: number | null;
  currency: string | null;
  sources: RankedSource[];
  investors: { id: string; name: string; lead: boolean }[];
}

export interface Pool {
  profiles: Record<string, Profile>;
  entries: MarketEntry[];
  rounds: FreshRound[];
  /** Slush 2026 attendees: ids and normalised names. */
  slush: { ids: string[]; names: string[] };
}

// ---------- outputs ----------
export interface Reason {
  kind: "entry" | "news" | "round";
  date: string;
  text: string; // "opened Acme Finland Oy in Finland", "is entering Sweden", "raised a €9M Series A"
  source: RankedSource;
}

export interface Door {
  id: string;
  name: string;
  country: string | null;
  whyNow: Reason;
  /** Every partnership the data supports; the one shown depends on the user's taps. */
  whyYou: WhyYou[];
  slush: boolean;
  warm: { investor: string; led: boolean }[];
  people: Person[];
  xray: string;
  entering: boolean;
}

export interface StartupSummary {
  id: string | null;
  name: string;
  country: string | null;
  industries: Industry[];
  investors: { key: string; name: string }[];
  resolvedFrom: "dataset" | "cala" | "domain" | "none";
}

export interface DoorReport {
  now: string;
  startup: StartupSummary;
  doors: Door[]; // unranked; rank at render time with the user's taps
}

export interface Taps {
  /** +1 per "more like this", -1 per "not now", by partnership type. */
  weights: Partial<Record<PartnerType, number>>;
  /** Doors dismissed with "not now". */
  hidden: string[];
  /** Any tap at all: after the first one, the log stops being the three-door first look. */
  touched: boolean;
}

export const NO_TAPS: Taps = { weights: {}, hidden: [], touched: false };

// ---------- helpers ----------
export function investorKey(name: string): string {
  return seedSlugForName(name) ?? normalizeFund(name).replace(/\s+/g, "-");
}

export function isConcreteDate(d: string | null | undefined): d is string {
  return !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
}

const daysAgo = (now: string, d: string) => Math.round((Date.parse(now) - Date.parse(d)) / DAY);

export function fmtAmount(amount: number | null, currency: string | null): string | null {
  if (!amount || amount <= 0) return null;
  const sym = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency === "GBP" ? "£" : currency ? `${currency} ` : "";
  const v = amount >= 1e9 ? `${+(amount / 1e9).toFixed(1)}B` : amount >= 1e6 ? `${+(amount / 1e6).toFixed(1)}M` : amount >= 1e3 ? `${Math.round(amount / 1e3)}K` : String(amount);
  return `${sym}${v}`;
}

/** "SERIES_A" -> "Series A", "PRE_SEED" -> "pre-seed", "SEED" -> "seed". */
export function prettyRound(t: string | null): string | null {
  if (!t) return null;
  const x = t.replace(/_/g, " ").trim().toLowerCase();
  if (/^(other|unknown|undisclosed|funding round|equity round|not specified)$/.test(x)) return null;
  const m = x.match(/^series ([a-z])(\+?)$/);
  if (m) return `Series ${m[1].toUpperCase()}${m[2]}`;
  if (x === "pre seed" || x === "pre-seed") return "pre-seed";
  return x;
}

export function roundText(label: string | null, amount: number | null, currency: string | null): string {
  const amt = fmtAmount(amount, currency);
  const t0 = prettyRound(label);
  const t = t0 && /^(seed|pre-seed|seed\+|angel|bridge|growth|venture)$/.test(t0) ? `${t0} round` : t0;
  const a = (w: string) => (/^[aeiou]/i.test(w) ? "an" : "a");
  if (amt && t) return `raised ${a(amt)} ${amt} ${t}`;
  if (amt) return `raised ${amt}`;
  if (t) return `closed ${a(t)} ${t}`;
  return "raised a round";
}

/** Press near the date beats a registry or the company itself; aggregators last. */
export function pickSource(sources: RankedSource[], date: string): RankedSource | null {
  if (!sources.length) return null;
  const score = (s: RankedSource) =>
    ({ FILING: 3, PRESS: 3, PRIMARY: 2, AGGREGATOR: 0 } as Record<string, number>)[s.rank ?? ""] ??
    (/tracxn|crunchbase|pitchbook|dealroom|cbinsights/.test(s.url) ? 0 : 1) +
    (s.date && Math.abs(daysAgo(date, s.date)) <= 10 ? 2 : 0);
  return [...sources].sort((a, b) => score(b) - score(a))[0];
}

/** Google X-ray link to people at the company. Link only; nothing is fetched. */
export function xrayLink(company: string, country: string | null, type: PartnerType | null): string {
  const roles =
    type === "integration"
      ? `(partnerships OR "head of product" OR CTO)`
      : type === "distribution"
        ? `("country manager" OR "business development" OR "head of sales")`
        : `("country manager" OR "head of operations" OR procurement)`;
  const q = `site:linkedin.com/in "${company}" ${roles}${country ? ` ${country}` : ""}`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

const NORDICS = ["Finland", "Sweden", "Norway", "Denmark", "Iceland"];
export function marketMatches(market: string, country: string | null): boolean {
  if (!country) return false;
  if (/nordic|scandinavia/i.test(market)) return NORDICS.includes(country);
  return market.toLowerCase().includes(country.toLowerCase());
}

/** Roles worth showing (Cala's WORKS_AT roles sometimes hold scraps like "per an exhibitor listing"). */
function goodRole(r: string) {
  return r.length <= 40 && !/\b(per|listing|according|source)\b/i.test(r);
}

/** A source on the company's own domain is PRIMARY even when Cala didn't label it. */
function withOwnRank(s: RankedSource, p: Profile | undefined): RankedSource {
  if (s.rank || !p) return s;
  try {
    const h = new URL(s.url).hostname.replace(/^www\./, "");
    if (p.domains.some((d) => h === d || h.endsWith(`.${d}`))) return { ...s, rank: "PRIMARY" };
  } catch {}
  return s;
}

// ---------- the engine ----------
export function buildReport(pool: Pool, startup: StartupSummary, opts: { now: string }): DoorReport {
  const { now } = opts;
  const youKeys = new Map(startup.investors.map((i) => [i.key, i.name]));
  const slushIds = new Set(pool.slush.ids);
  const slushNames = new Set(pool.slush.names);
  const selfName = normalizeCompany(startup.name);
  const doors = new Map<string, Door>();

  const isSlush = (p: Profile | undefined, ...ids: (string | null | undefined)[]) =>
    !!p?.slush || ids.some((id) => id && slushIds.has(id)) || (!!p && slushNames.has(normalizeCompany(p.name)));

  const warmOf = (p: Profile | undefined, roundInvestors: FreshRound["investors"]) => {
    const out: Door["warm"] = [];
    const leads = new Set(roundInvestors.filter((i) => i.lead).map((i) => investorKey(i.name)));
    for (const i of [...(p?.investors ?? []), ...roundInvestors]) {
      const k = investorKey(i.name);
      if (youKeys.has(k) && !out.some((w) => w.investor === youKeys.get(k))) out.push({ investor: youKeys.get(k)!, led: leads.has(k) });
    }
    return out;
  };

  const roundsOf = (id: string) => pool.rounds.filter((r) => r.companyId === id);

  // 1. market entry: new national companies and expansion news into the startup's market
  for (const e of pool.entries) {
    if (!isConcreteDate(e.date) || e.date > now) continue;
    const win = e.kind === "subsidiary" ? ENTRY_WINDOW_DAYS : NEWS_WINDOW_DAYS;
    if (daysAgo(now, e.date) > win) continue;
    if (!marketMatches(e.market, startup.country)) continue;
    const p = pool.profiles[e.doorId];
    const local = e.local ? pool.profiles[e.local.id] : undefined;
    if (normalizeCompany(e.doorName) === selfName || startup.id === e.doorId) continue;
    const industries = p?.industries.length ? p.industries : local?.industries ?? [];
    const whyYou = partnerTypes({
      you: startup,
      door: { name: e.doorName, industries, country: p?.country ?? null },
      entering: true,
      market: startup.country,
    });
    if (!whyYou.length) continue; // no real reason: drop
    const rs = roundsOf(e.doorId).flatMap((r) => r.investors);
    const prev = doors.get(e.doorId);
    if (prev && prev.whyNow.date >= e.date) continue;
    const people = [...(local?.people ?? []), ...(p?.people ?? [])].filter((x) => goodRole(x.role)).slice(0, 2);
    doors.set(e.doorId, {
      id: e.doorId,
      name: p?.name ?? e.doorName,
      country: p?.country ?? null,
      whyNow: {
        kind: e.kind === "subsidiary" ? "entry" : "news",
        date: e.date,
        text: e.kind === "subsidiary" && e.local ? `registered ${e.local.name} in ${startup.country}` : `is entering ${e.market}`,
        source: e.source,
      },
      whyYou,
      slush: isSlush(p, e.doorId, e.local?.id) || isSlush(local),
      warm: warmOf(p, rs),
      people,
      xray: xrayLink(p?.name ?? e.doorName, startup.country, whyYou[0].type),
      entering: true,
    });
  }

  // 2. fresh rounds, only with a warm path; newest round per company wins
  for (const r of [...pool.rounds].sort((a, b) => b.date.localeCompare(a.date))) {
    if (!isConcreteDate(r.date) || r.date > now || daysAgo(now, r.date) > ROUND_WINDOW_DAYS) continue;
    if (doors.has(r.companyId) || r.companyId === startup.id) continue;
    const p = pool.profiles[r.companyId];
    if (!p || normalizeCompany(p.name) === selfName) continue;
    const warm = warmOf(p, r.investors);
    if (!warm.length) continue;
    const src0 = pickSource(r.sources, r.date);
    if (!src0) continue;
    const src = withOwnRank(src0, p);
    const whyYou = partnerTypes({ you: startup, door: { name: p.name, industries: p.industries, country: p.country }, entering: false, market: startup.country });
    if (!whyYou.length) continue;
    doors.set(r.companyId, {
      id: r.companyId,
      name: p.name,
      country: p.country,
      whyNow: { kind: "round", date: r.date, text: roundText(r.label, r.amount, r.currency), source: src },
      whyYou,
      slush: isSlush(p, r.companyId),
      warm,
      people: p.people.filter((x) => goodRole(x.role)).slice(0, 2),
      xray: xrayLink(p.name, p.country, whyYou[0].type),
      entering: false,
    });
  }

  return { now, startup, doors: [...doors.values()] };
}

// ---------- ranking (render time) ----------
export function tierOf(d: Door): number {
  if (d.entering && d.slush && d.warm.length) return 1;
  if (d.entering && d.slush) return 2;
  if (d.entering) return 3;
  return 4;
}

/** The partnership to lead with for this user. */
export function leadWhyYou(d: Door, taps: Taps): WhyYou {
  const w = taps.weights;
  return [...d.whyYou].sort((a, b) => (w[b.type] ?? 0) - (w[a.type] ?? 0) || PARTNER_TYPES.indexOf(a.type) - PARTNER_TYPES.indexOf(b.type))[0];
}

export function rankDoors(doors: Door[], taps: Taps): Door[] {
  const hidden = new Set(taps.hidden);
  const w = (d: Door) => taps.weights[leadWhyYou(d, taps).type] ?? 0;
  return doors
    .filter((d) => !hidden.has(d.id))
    .filter((d) => (taps.weights[leadWhyYou(d, taps).type] ?? 0) > -3) // three "not now"s mute a type
    .sort((a, b) => tierOf(a) - tierOf(b) || w(b) - w(a) || b.whyNow.date.localeCompare(a.whyNow.date));
}

/**
 * The first look: three doors of different partnership types, best tier first.
 * Falls back to the next best doors if the data supports fewer than three types.
 */
export function firstLook(doors: Door[]): { door: Door; type: PartnerType }[] {
  const ranked = rankDoors(doors, NO_TAPS);
  const out: { door: Door; type: PartnerType }[] = [];
  for (const t of PARTNER_TYPES) {
    const d = ranked.find((x) => !out.some((o) => o.door.id === x.id) && x.whyYou.some((y) => y.type === t));
    if (d) out.push({ door: d, type: t });
  }
  for (const d of ranked) {
    if (out.length >= 3) break;
    if (!out.some((o) => o.door.id === d.id)) out.push({ door: d, type: leadWhyYou(d, NO_TAPS).type });
  }
  return out.sort((a, b) => tierOf(a.door) - tierOf(b.door) || b.door.whyNow.date.localeCompare(a.door.whyNow.date)).slice(0, 3);
}

export { bestWhyYou };
