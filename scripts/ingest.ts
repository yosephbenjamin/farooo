/**
 * npm run ingest  (v2, entity endpoints only + /v1/knowledge/search for news)
 *
 * Cala allows ~10 requests per rolling minute on this key, so the ingest is door-centric and
 * prioritised. Each stage writes data/pool.json, so partial progress is always usable, and
 * every call is cached, so a rerun only fetches what's missing. Stops cleanly on HTTP 402.
 *
 *   1. users     demo startups -> profiles
 *   2. rounds    companies in the users' investors' keyrings with recent rounds -> profiles +
 *                FundingRound participants (is_lead)
 *   3. news      expansion news per Nordic market -> resolve company -> profile
 *   4. slush     Slush 2026 attendee profiles (Nordic legal names first) -> new national
 *                companies with a FILING founding date -> foreign parent by website or registry
 *                parent link -> market entries
 *   5. entrants  the other direction: for each foreign Slush attendee, search its brand for a
 *                recently founded Nordic company (from the search description), then confirm with
 *                a FILING founding date and a website / registry-parent match
 *
 *   3b. wide     widened news searches (opens office in / launches in / expands to / enters the …
 *                market / hires country manager; FI SE NO DK DE UK NL FR), --searches=N (default 150)
 *   3c. investors investors of every entrant (profile INVESTED_IN + FundingRound participants)
 *   3d. signals   new money / new hires / new acquisitions for the demo startups' keyrings, --calls=N (default 150)
 *
 * Flags: --stage=users,rounds,news,wide,investors,slush,entrants  --budget=N (max new API calls this run)
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { calaRequest, getEntity, knowledgeSearch, searchEntities, CalaError, calaStats, type GetEntityResponse } from "../src/lib/cala";
import { parseSignals, latestHeadcount, SIGNAL_QUERY, type TimedEvent } from "../src/lib/signals";
import { relAll, fetchProfileRaw, PROFILE_QUERY } from "../src/lib/graph";
import { readJson, writeJson, today, DATA_DIR } from "../src/lib/data";
import { parseProfile, filingFounding, rankedSources, type Profile, type RankedSource } from "../src/lib/profile";
import { claimedCountry, claimsOf, heuristic, NEWS_MARKETS, WIDE_MARKETS, type Claim } from "../src/lib/news";
import { extractClaims, llmEnabled } from "../src/lib/llm";
import { normalizeCompany } from "../src/lib/normalize";
import { resolveByName, summarize } from "../src/lib/identity";
import { ENTRY_WINDOW_DAYS, ROUND_WINDOW_DAYS, investorKey, isGiant, isWeaponsMaker, type FreshRound, type MarketEntry, type Pool } from "../src/lib/doors";
import type { DemoStartup } from "../src/lib/report";
import type { Dataset } from "../src/lib/types";

const SLUSH = "bc844d56-6ab4-452b-96bf-2661e86e592b";
const MARKETS = new Set(["Finland", "Sweden", "Norway", "Denmark", "Iceland"]);
const log = (...a: unknown[]) => console.log("[ingest]", ...a);
const MARKET_WORDS: Record<string, string[]> = {
  Finland: ["Finland", "Finnish", "Helsinki"], Sweden: ["Sweden", "Swedish", "Stockholm"], Norway: ["Norway", "Norwegian", "Oslo"],
  Denmark: ["Denmark", "Danish", "Copenhagen"], "the Nordics": [],
  Germany: ["Germany", "German", "Berlin", "Munich"], "United Kingdom": ["United Kingdom", "British", "UK", "London", "England"],
  Netherlands: ["Netherlands", "Dutch", "Amsterdam"], France: ["France", "French", "Paris"],
};

const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const STAGES = new Set((arg("stage") ?? "users,rounds,news,slush,entrants").split(","));
let budget = Number(arg("budget") ?? Infinity);
let outOfCredit = false;

const now = today();
const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

// ---------- cache-aware calls with a budget ----------
const cacheDir = path.join(DATA_DIR, "cache", "cala");
function isOut(e: unknown) {
  return e instanceof CalaError && e.status === 402;
}
async function spend<T>(fn: () => Promise<T>): Promise<T | null> {
  if (outOfCredit || budget <= 0) return null;
  try {
    const r = await fn();
    return r;
  } catch (e) {
    if (isOut(e) || String((e as Error)?.message).includes("402")) {
      outOfCredit = true;
      log("HTTP 402: out of credit. Stopping new calls; everything so far is cached.");
    }
    return null;
  } finally {
    budget--; // cache hits cost a budget unit too; good enough as a brake
  }
}

const profiles: Record<string, Profile> = {};
async function profile(id: string): Promise<Profile | null> {
  if (profiles[id]) return profiles[id];
  const r = await spend(() => fetchProfileRaw(id));
  if (!r || "__error" in r) return null;
  const p = parseProfile(r);
  profiles[id] = p;
  return p;
}

/** Every profile already in the cache (from any run), so the pool includes them for free. */
function loadCachedProfiles() {
  let n = 0;
  for (const f of readdirSync(cacheDir)) {
    try {
      const r = JSON.parse(readFileSync(path.join(cacheDir, f), "utf8"));
      if (r.method === "POST" && r.body?.relationships?.incoming?.IS_ULTIMATE_PARENT_OF && r.body?.properties?.includes?.("founding_date__precision") && r.response?.id) {
        profiles[r.response.id] = parseProfile(r.response);
        n++;
      }
    } catch {}
  }
  return n;
}

// ---------- pool state ----------
const prev = readJson<Pool | null>("pool.json", null);
const entries = new Map<string, MarketEntry>((prev?.entries ?? []).map((e) => [e.id, e]));
const rounds = new Map<string, FreshRound>((prev?.rounds ?? []).map((r) => [r.id, r]));
let slush: Pool["slush"] = prev?.slush ?? { ids: [], names: [] };
const events = new Map<string, TimedEvent>((prev?.events ?? []).map((e) => [e.id, e]));
const headcount: Record<string, number> = { ...(prev?.headcount ?? {}) };

/** Merge with what's on disk, so two stages running at once don't overwrite each other. */
function save(stage: string) {
  const disk = readJson<Pool | null>("pool.json", null);
  for (const [id, p] of Object.entries(disk?.profiles ?? {})) if (!profiles[id]) profiles[id] = p;
  for (const e of disk?.entries ?? []) if (!entries.has(e.id)) entries.set(e.id, e);
  for (const r of disk?.rounds ?? []) if (!rounds.has(r.id)) rounds.set(r.id, r);
  for (const e of disk?.events ?? []) if (!events.has(e.id)) events.set(e.id, e);
  for (const [k, v] of Object.entries(disk?.headcount ?? {})) if (headcount[k] == null) headcount[k] = v;
  const pool: Pool = { profiles, entries: [...entries.values()], rounds: [...rounds.values()], slush, events: [...events.values()], headcount };
  writeJson("pool.json", pool);
  log(`saved after ${stage}: ${Object.keys(profiles).length} profiles, ${entries.size} entries, ${rounds.size} rounds${Number.isFinite(budget) ? `, budget left ${budget}` : ""}`);
}

// ---------- stage 2 helper: a FundingRound with its participants ----------
async function fundingRound(id: string, companyId: string): Promise<FreshRound | null> {
  const r = await spend(() =>
    getEntity(id, {
      properties: ["name", "round_label", "announcement_date", "event_date", "transaction_value", "transaction_value_units"],
      relationships: { incoming: { PARTICIPATES_IN_FUNDING_ROUND: { limit: 60 } } },
    }),
  );
  if (!r || "__error" in r) return null;
  const p = (r.properties ?? {}) as Record<string, { value?: unknown; sources?: never[] }>;
  const date = (p.announcement_date?.value ?? p.event_date?.value) as string | undefined;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parts = r.relationships?.incoming?.PARTICIPATES_IN_FUNDING_ROUND ?? [];
  const sources: RankedSource[] = rankedSources([
    ...(p.announcement_date?.sources ?? []),
    ...(p.event_date?.sources ?? []),
    ...(p.transaction_value?.sources ?? []),
    ...(p.name?.sources ?? []),
  ]);
  return {
    id,
    companyId,
    date,
    label: (p.round_label?.value as string) ?? (p.name?.value as string) ?? r.name ?? null,
    amount: (p.transaction_value?.value as number) ?? null,
    currency: (p.transaction_value_units?.value as string) ?? null,
    sources,
    investors: parts
      .filter((x) => String(x.properties?.role ?? "") === "INVESTOR" || String(x.properties?.role ?? "") === "LENDER")
      .map((x) => ({ id: x.id, name: x.name, lead: x.properties?.is_lead === true })),
  };
}

// ---------- stage 4 helpers ----------
const LEGAL = /\b(oy|oyj|ab|ab \(publ\)|a\/s|as|asa|aps|ehf|hf|ltd|limited|gmbh|inc|llc|sa|sas|bv|nv|plc|oü|ou|uab|sia)\.?$/i;
const COUNTRY_WORDS = /\b(finland|suomi|sweden|sverige|norway|norge|denmark|danmark|nordic|nordics|scandinavia|iceland)\b/gi;
function brandOf(name: string) {
  return name.replace(LEGAL, "").replace(COUNTRY_WORDS, "").replace(/[,.\s]+$/g, "").trim();
}

/** For a new national company, find the foreign company it belongs to. */
async function foreignParent(local: Profile): Promise<{ parent: Profile; match: MarketEntry["match"] } | null> {
  // (a) registry parent link (GLEIF): strongest
  for (const pr of local.parents) {
    const p = await profile(pr.id);
    if (p && p.country && p.country !== local.country) {
      if (local.website && p.website && p.website !== local.website && !p.domains.includes(local.website)) continue;
      return { parent: p, match: "registry-parent" };
    }
  }
  // (b) same website, different country
  if (!local.website) return null;
  const brand = brandOf(local.legalName ?? local.name) || brandOf(local.name);
  if (brand.length < 3) return null;
  const cands = (await spend(() => searchEntities(brand, { types: ["Company"], limit: 10 }))) ?? [];
  const key = normalizeCompany(brand);
  const likely = cands.filter((c) => c.id !== local.id && normalizeCompany(c.name).includes(key.split(" ")[0])).slice(0, 3);
  for (const c of likely) {
    const p = await profile(c.id);
    if (p && p.country && p.country !== local.country && (p.website === local.website || p.domains.includes(local.website))) return { parent: p, match: "website" };
  }
  return null;
}

/**
 * How close a foreign attendee is to the demo startups' industries, so the entrants pass reaches
 * them first: Oura (health, wearables, medical devices, hardware, software), Verda (AI, cloud,
 * data centres) and RiACT (robotics, drones, defence, automation). Cached profile industries when
 * we have them, else the attendee's name. Order only; it never decides a door.
 */
const NEAR_CODE: [RegExp, number][] = [
  [/HEALTH|MEDICAL|PHARMA|BIOTECH/, 3], [/HARDWARE|AEROSPACE|DEFEN|ROBOT|MACHINERY|SEMICONDUCTOR/, 3],
  [/INTERNET|TELECOM|CLOUD|DATA/, 2], [/SOFTWARE/, 1],
];
const NEAR_LABEL = /^(ai|robo|dualUseTech|deeptech|health|medtechPharma|consumerElectronics|cloud.*|Cloud.*)$/;
const NEAR_NAME: [RegExp, number][] = [
  [/health|medic|\bmed|care\b|clinic|cardio|neuro|pharma|therap|sleep|wearable|biosens|diagnos|\bbio/i, 3],
  [/robot|drone|\baero|defen[cs]e|space|orbit|satell|autonom|uav|hardware|sensor|chip|semicon|photon|quantum|device/i, 3],
  [/\bai\b|\.ai\b|ai$|cloud|\bdata|compute|gpu|datacent|infra/i, 2],
];
function nearDemos(name: string, p: Profile | undefined): number {
  if (p?.industries.length) {
    let s = 0;
    for (const i of p.industries) {
      s = Math.max(s, NEAR_CODE.find(([re]) => re.test(i.code))?.[1] ?? 0);
      if (i.label && NEAR_LABEL.test(i.label)) s = Math.max(s, 2);
    }
    return s;
  }
  return NEAR_NAME.find(([re]) => re.test(name))?.[1] ?? 0;
}

// ---------- news claims -> market entries (shared by the news and wide stages) ----------
type NewsStats = { claims: number; notEntry: number; noDate: number; old: number; unresolved: number; local: number; kept: number; keptNames: string[] };
const newsStats = (): NewsStats => ({ claims: 0, notEntry: 0, noDate: 0, old: 0, unresolved: 0, local: 0, kept: 0, keptNames: [] });
const newEntrants = new Set<string>();

async function keepClaim(c: Claim, x: { company: string | null; date: string | null; isEntry: boolean; market?: string | null } | undefined, stats: NewsStats) {
  const h = heuristic(c);
  const company = x ? x.company : h.company;
  const date = (x?.date && /^\d{4}-\d{2}-\d{2}$/.test(x.date) ? x.date : null) ?? h.date;
  if (!(x ? x.isEntry : h.isEntry) || !company) { stats.notEntry++; return; }
  if (!date) { stats.noDate++; return; }
  if (date > now || dayDiff(date, now) > 180) { stats.old++; return; }
  const p = await resolveByName(company, profiles);
  if (!p || !plausibleEntrant(company, p, c.text, c.url)) { stats.unresolved++; return; }
  profiles[p.id] = p;
  const market = x?.market ?? c.market;
  if (await alreadyLocal(company, market, p)) { stats.local++; return; }
  const id = createHash("sha256").update(`news|${p.id}|${market}|${date}`).digest("hex").slice(0, 16);
  // one article, one door: the same source and market already gave another entity (OpenAI / OpenAI Group PBC)
  if ([...entries.values()].some((e) => e.id !== id && e.kind === "news" && e.market === market && e.source.url === c.url)) { stats.local++; return; }
  if (!entries.has(id)) {
    newEntrants.add(p.id);
    stats.keptNames.push(`${p.name} -> ${market} (${date})`);
  }
  entries.set(id, { id, kind: "news", doorId: p.id, doorName: p.name, local: null, market, date, source: { name: c.sourceName, url: c.url, date, rank: null }, match: "news", claim: c.text, evidence: c.knowbit.slice(0, 1200) });
  stats.kept++;
}

/**
 * The resolved company must be the one the claim names: an exact name, legal name or alias, or a
 * longer legal name whose own website carries the brand (never "CATL" -> "CATL GROUPE", a French
 * bank, or "Advantech" -> "ADVANTECH SURGICAL LTD"). And it must have a home country, or it can't
 * be "entering" anywhere.
 */
/** Same-named strangers caught by eye in news resolution (like seed.ts's exclusions): id -> why. */
const MISRESOLVED: Record<string, string> = {
  "38b41366-98b3-5a23-9ed8-76d83f3be4da": "ATHLETICA, a French retailer in Loudéac, is not the Athletica in the Finland-office story",
};

function plausibleEntrant(company: string, p: Profile, text = "", url = ""): boolean {
  if (!p.country || MISRESOLVED[p.id]) return false;
  // the company's own press page (eip.com for "EIP"): the entity must own that domain
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  const squashed = normalizeCompany(company).replace(/[^a-z0-9]/g, "");
  if (host && squashed.length >= 3 && host.split(".").some((x) => x.replace(/[^a-z0-9]/g, "") === squashed) && !p.domains.some((d) => host === d || host.endsWith(`.${d}`))) return false;
  const claimed = claimedCountry(text, company);
  if (claimed && claimed !== p.country) return false; // "Ukrainian defence firm Fire Point" is not FIRE POINT S.R.L. of Italy
  const key = normalizeCompany(company);
  if ([p.name, p.legalName ?? "", ...p.aliases].map(normalizeCompany).includes(key)) return true;
  const squash = key.replace(/[^a-z0-9]/g, "");
  return squash.length >= 3 && p.domains.some((d) => d.split(".")[0].replace(/[^a-z0-9]/g, "").includes(squash));
}

/**
 * Already in that market: headquartered there, or a same-brand company described as based there
 * (Netcompany A/S vs NETCOMPANY UK LIMITED; Google Sweden AB, so a Google data centre in Sweden is
 * expansion, not entry). The search is cached after the first time.
 */
async function alreadyLocal(company: string, market: string, p: Profile): Promise<boolean> {
  if (p.country && market.toLowerCase().includes(p.country.toLowerCase())) return true;
  const words = MARKET_WORDS[market] ?? [];
  const bkey = normalizeCompany(company);
  const sameBrand = ((await spend(() => searchEntities(company, { types: ["Company"], limit: 10 }))) ?? []).filter((e) => normalizeCompany(e.name) === bkey || normalizeCompany(e.name).startsWith(bkey + " "));
  return sameBrand.some((e) => e.id !== p.id && words.some((w) => new RegExp(`\\b${w}\\b`, "i").test(e.description ?? "")));
}

/** Re-check every stored news entry against the current rules (claim text, source, entity). */
async function recheckNews() {
  let dropped = 0;
  const seen = new Set<string>();
  for (const [id, e] of [...entries].sort(([, a], [, b]) => Number(!!b.evidence) - Number(!!a.evidence))) {
    if (e.kind === "news") {
      const k = `${e.market}|${e.source.url}`;
      if (seen.has(k)) {
        entries.delete(id);
        dropped++;
        log(`recheck: dropped duplicate ${e.doorName} -> ${e.market} (same article)`);
        continue;
      }
      seen.add(k);
    }
    if (e.kind !== "news" || !e.claim) continue;
    const h = heuristic({ index: 0, market: e.market, text: e.claim, url: e.source.url, sourceName: e.source.name, knowbit: e.evidence ?? "" });
    const p = profiles[e.doorId];
    // the old entries' dates may come from the KnowBit, which isn't stored: judge entry-ness and the entity only
    if (!h.isEntry || !h.company || !p || !plausibleEntrant(h.company, p, e.claim, e.source.url) || (await alreadyLocal(h.company, e.market, p))) {
      entries.delete(id);
      dropped++;
      log(`recheck: dropped ${e.doorName} -> ${e.market} (${e.date})`);
    }
  }
  return dropped;
}

/** The widened searches, in priority order: Nordic markets, the demo startups' industries, then DE/UK/NL/FR. */
function wideQueries(year: string): { q: string; market: string }[] {
  const say = (m: string) => (m === "United Kingdom" ? "the UK" : m === "Netherlands" ? "the Netherlands" : m);
  const T = [
    (i: string, m: string) => `Which ${i}companies opened an office in ${say(m)} in ${year}?`,
    (i: string, m: string) => `Which ${i}companies launched in ${say(m)} in ${year}?`,
    (i: string, m: string) => `Which ${i}companies expanded to ${say(m)} in ${year}?`,
    (i: string, m: string, a: string) => `Which ${i}companies entered the ${a} market in ${year}?`,
    (i: string, m: string) => `Which ${i}companies hired a country manager for ${say(m)} in ${year}?`,
  ];
  const nordic = WIDE_MARKETS.slice(0, 4);
  const big = WIDE_MARKETS.slice(4);
  const demoInd = ["health tech ", "medical device ", "AI ", "cloud and data centre ", "robotics ", "defence and drone "];
  const out: { q: string; market: string }[] = [];
  const add = (ms: typeof WIDE_MARKETS, inds: string[], ts: number[]) => {
    for (const i of inds) for (const t of ts) for (const m of ms) out.push({ q: T[t](i, m.market, m.adj), market: m.market });
  };
  add(nordic, [""], [0, 1, 2, 3, 4]);
  add(nordic, demoInd, [0, 2, 3]);
  add(big, [""], [0, 1, 2, 3, 4]);
  add(nordic, ["software ", "fintech ", "energy "], [0]);
  add(big, ["health tech ", "AI ", "robotics "], [0]);
  add(nordic, demoInd, [4]);
  return out;
}

async function main() {
  const cached = loadCachedProfiles();
  log(`${cached} profiles already cached; now ${now}`);
  const ds = readJson<Dataset | null>("dataset.json", null);
  const demos = readJson<DemoStartup[]>("demo/startups.json", []);

  // Slush attendees (cached after the first run)
  const att = (await spend(() => relAll(SLUSH, "incoming", "PARTICIPATES_IN_EVENT"))) ?? [];
  if (att.length) slush = { ids: att.map((a) => a.id), names: [...new Set(att.map((a) => normalizeCompany(a.name)))] };
  log(`${slush.ids.length} Slush 2026 attendees`);

  // ---------- 1. users ----------
  const users: Profile[] = [];
  if (STAGES.has("users")) {
    for (const d of demos) {
      const p = (d.calaId ? await profile(d.calaId) : null) ?? (await resolveByName(d.name));
      if (p) {
        profiles[p.id] = p;
        users.push(p);
        log(`user ${d.name} -> ${p.name} (${p.country ?? "?"}, ${p.industries.map((i) => i.code).join("/") || "no industry"}, ${p.investors.length} investors)`);
      } else log(`user ${d.name}: not resolved`);
    }
    save("users");
  }

  // ---------- 2. fresh rounds in the users' investors' keyrings ----------
  if (STAGES.has("rounds") && ds) {
    const cutoff = new Date(Date.parse(now) - ROUND_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
    // v1 rounds tell us which keyring companies raised recently; fetch their FundingRounds for leads
    const recentCompanies = new Set(Object.values(ds.rounds).filter((r) => r.companyId && r.date && r.date >= cutoff && r.date <= now).map((r) => r.companyId!));
    log(`${recentCompanies.size} keyring companies with a recent round`);
    for (const cid of recentCompanies) {
      const c = ds.companies[cid];
      let p: Profile | null = null;
      for (const id of c.ids) {
        p = await profile(id);
        if (p) break;
      }
      if (!p) continue;
      for (const fr of p.fundingRounds.filter((f) => f.role === "ISSUER")) {
        const r = await fundingRound(fr.id, p.id);
        if (r && r.date >= cutoff && r.date <= now) rounds.set(r.id, r);
      }
      // keep the v1 dated round (with its sources) when no FundingRound landed in the window
      if (![...rounds.values()].some((r) => r.companyId === p!.id)) {
        for (const rid of c.roundIds) {
          const v1 = ds.rounds[rid];
          if (v1?.date && v1.date >= cutoff && v1.date <= now && v1.sources.length) {
            rounds.set(rid, {
              id: rid, companyId: p.id, date: v1.date, label: v1.roundType, amount: v1.amount, currency: v1.currency,
              sources: v1.sources.map((s) => ({ ...s, rank: null })),
              investors: v1.investorNames.map((n) => ({ id: "", name: n, lead: false })),
            });
          }
        }
      }
      if (outOfCredit) break;
    }
    // de-duplicate the same financing recorded twice (FundingRound + filing): same company, same date
    const seen = new Set<string>();
    for (const r of [...rounds.values()].sort((a, b) => b.investors.length - a.investors.length)) {
      const k = `${r.companyId}|${r.date}`;
      if (seen.has(k)) rounds.delete(r.id);
      else seen.add(k);
    }
    save("rounds");
  }

  // ---------- 3. expansion news ----------
  if (STAGES.has("news")) {
    const year = now.slice(0, 4);
    const claims: Claim[] = [];
    for (const m of NEWS_MARKETS) {
      const ans = await spend(() => knowledgeSearch(`Which companies announced expanding into ${m} in ${year}?`));
      if (ans) claims.push(...claimsOf(ans, m, claims.length));
    }
    const llm = llmEnabled() ? await extractClaims(claims.map((c) => ({ index: c.index, text: c.text, url: c.url }))) : null;
    const llmBy = new Map((llm ?? []).map((x) => [x.index, x]));
    const stats = newsStats();
    stats.claims = claims.length;
    for (const c of claims) await keepClaim(c, llmBy.get(c.index), stats);
    writeJson("news-report.json", { ranAt: new Date().toISOString(), now, extraction: llm ? "llm" : "heuristic", stats });
    log("news", stats);
    save("news");
  }

  // ---------- 3a. recheck stored news entries against the current rules ----------
  if (STAGES.has("recheck")) {
    log(`recheck: ${await recheckNews()} news entries dropped`);
    writeJson("pool.json", { profiles, entries: [...entries.values()], rounds: [...rounds.values()], slush, events: [...events.values()], headcount }); // overwrite, no merge: drops must stick
  }

  // ---------- 3b. widened news: more phrasings and markets, capped, yield every 50 ----------
  if (STAGES.has("wide")) {
    const cap = Number(arg("searches") ?? 150);
    const qs = wideQueries(now.slice(0, 4)).slice(0, cap);
    const stats = newsStats();
    let searches = 0;
    const reports: unknown[] = [];
    const report = () => {
      const r = { searches, ...stats, keptNames: [...stats.keptNames], searchCallsSent: calaStats.searches, entityCallsSent: calaStats.entity, statuses: { ...calaStats.status } };
      reports.push(r);
      log(`wide yield after ${searches} searches: ${stats.claims} claims, ${stats.notEntry} not entries, ${stats.noDate} undated, ${stats.old} old, ${stats.unresolved} unresolved, ${stats.local} local, ${stats.kept} kept (${stats.keptNames.length} new); calls sent this run: ${r.searchCallsSent} searches, ${r.entityCallsSent} entity`);
      for (const k of stats.keptNames) log(`   new entry: ${k}`);
      writeJson("wide-report.json", { ranAt: new Date().toISOString(), now, planned: qs.length, reports, queries: qs.map((q) => q.q) });
      save(`wide ${searches}`);
    };
    for (let i = 0; i < qs.length && !outOfCredit; i += 5) {
      const batch = qs.slice(i, i + 5);
      const answers = await Promise.all(batch.map((x) => spend(() => knowledgeSearch(x.q))));
      for (let j = 0; j < batch.length; j++) {
        searches++;
        const ans = answers[j];
        if (ans) {
          const cs = claimsOf(ans, batch[j].market, 0);
          stats.claims += cs.length;
          for (const c of cs) await keepClaim(c, undefined, stats);
        }
        if (searches % 50 === 0) report();
      }
    }
    if (searches % 50 !== 0) report();
  }

  // ---------- 3c. investors of every entrant, so warm paths can appear ----------
  if (STAGES.has("investors")) {
    const ids = [...new Set([...entries.values()].map((e) => e.doorId))];
    const st = { entrants: ids.length, roundsFetched: 0, investors: 0 };
    for (const id of ids) {
      if (outOfCredit) break;
      const p = await profile(id);
      if (!p) continue;
      for (const fr of p.fundingRounds.filter((f) => f.role === "ISSUER").slice(0, 8)) {
        if (rounds.has(fr.id)) continue;
        const r = await fundingRound(fr.id, p.id);
        st.roundsFetched++;
        if (r) rounds.set(r.id, r); // older rounds never make a round door (window); they carry investors for warm paths
      }
      const inv = new Set([...p.investors.map((i) => i.name), ...[...rounds.values()].filter((r) => r.companyId === id).flatMap((r) => r.investors.map((i) => i.name))]);
      st.investors += inv.size;
      log(`investors: ${p.name}: ${inv.size} (${[...inv].slice(0, 6).join(", ")})`);
    }
    log("investors", st);
    save("investors");
  }

  // ---------- 3d. new money, new hires, new acquisitions in the demo startups' keyrings ----------
  if (STAGES.has("signals")) {
    const cap = Number(arg("calls") ?? 150);
    const sent0 = calaStats.sent;
    const left = () => cap - (calaStats.sent - sent0);
    const st = { portfolios: 0, companies: 0, events: 0, byKind: {} as Record<string, number>, targets: 0 };
    // public agencies and global funds make weak warm paths and huge keyrings: not walked
    const SKIP = /^(gv|google ventures|business finland|tesi|eifo|innovation norway|vinnova|almi)$/i;
    const keyrings: { demo: string; ids: string[] }[] = [];
    for (const d of demos) {
      const u = d.calaId ? profiles[d.calaId] : undefined;
      if (!u) continue;
      const ids: string[] = [];
      for (const inv of u.investors) {
        if (SKIP.test(inv.name.trim())) continue;
        const kr = ds?.keyrings?.[investorKey(inv.name)] as string[] | undefined;
        if (kr?.length) {
          for (const cid of kr) { const c = ds!.companies[cid]; if (c?.ids[0]) ids.push(c.ids[0]); }
          continue;
        }
        if (left() <= 0) break;
        const r = await spend(() => getEntity(inv.id, { properties: ["name"], relationships: { outgoing: { INVESTED_IN: { limit: 100 } } } }));
        st.portfolios++;
        for (const x of r?.relationships?.outgoing?.INVESTED_IN ?? []) if (x.entity_type !== "Person") ids.push(x.id);
      }
      const nordic = (id: string) => { const p = profiles[id]; return p?.country ? MARKETS.has(p.country) : null; };
      // Nordic first, unknown next, foreign last; never giants or weapons makers we already know
      const uniq = [...new Set(ids)].filter((id) => id !== u.id && !isGiant(profiles[id], headcount[id]) && !isWeaponsMaker(profiles[id]));
      uniq.sort((a, b) => Number(nordic(b) === true) - Number(nordic(a) === true) || Number(nordic(a) === false) - Number(nordic(b) === false));
      keyrings.push({ demo: d.name, ids: uniq });
      log(`signals: ${d.name}: ${uniq.length} keyring companies`);
    }
    // round-robin across the demo startups so each gets its share of the budget
    const queue: string[] = [];
    for (let i = 0; keyrings.some((k) => i < k.ids.length); i++) for (const k of keyrings) if (k.ids[i] && !queue.includes(k.ids[i])) queue.push(k.ids[i]);
    for (const id of queue) {
      if (left() <= 0 || outOfCredit) break;
      const res = await spend(() => calaRequest<GetEntityResponse>("POST", `/v1/entities/${id}`, SIGNAL_QUERY));
      if (!res || "__error" in res) continue;
      st.companies++;
      const p = parseProfile(res);
      profiles[p.id] = p;
      const hc = latestHeadcount(res);
      if (hc != null) headcount[p.id] = hc;
      for (const ev of parseSignals(res)) {
        if (ev.date > now) continue;
        events.set(ev.id, ev);
        st.events++;
        st.byKind[ev.kind] = (st.byKind[ev.kind] ?? 0) + 1;
      }
      if (st.companies % 20 === 0) save(`signals ${st.companies}`);
    }
    // name the target of recent acquisitions (one call each, while budget lasts)
    for (const ev of [...events.values()].filter((e) => e.kind === "acquisition" && e.eventId && e.text === "completed an acquisition" && dayDiff(e.date, now) <= 180)) {
      if (left() <= 0 || outOfCredit) break;
      const r = await spend(() => getEntity(ev.eventId!, { properties: ["name"], relationships: { incoming: { PARTICIPATES_IN_CORPORATE_EVENT: { limit: 10 } } } }));
      const target = (r?.relationships?.incoming?.PARTICIPATES_IN_CORPORATE_EVENT ?? []).find((x) => String(x.properties?.role ?? "") === "TARGET");
      if (target) { ev.text = `acquired ${target.name}`; st.targets++; }
    }
    writeJson("signals-report.json", { ranAt: new Date().toISOString(), now, cap, callsSent: calaStats.sent - sent0, ok: calaStats.ok, statuses: calaStats.status, ...st, keyrings: keyrings.map((k) => ({ demo: k.demo, companies: k.ids.length })) });
    log("signals", JSON.stringify(st), `calls sent ${calaStats.sent - sent0}/${cap}`);
    save("signals");
  }

  // ---------- 4. Slush attendees -> new national companies of foreign firms ----------
  if (STAGES.has("slush") && att.length) {
    const nordicName = (n: string) => /\b(oy|oyj|ab|a\/s|as|aps|asa|ehf)\b\.?$/i.test(n.trim()) || COUNTRY_WORDS.test(n);
    const order = [...att].sort((a, b) => Number(nordicName(b.name)) - Number(nordicName(a.name)));
    const stats = { profiled: 0, local: 0, recentFiling: 0, entries: 0 };
    let i = 0;
    for (const a of order) {
      if (outOfCredit || budget <= 0) break;
      const p = await profile(a.id);
      i++;
      if (i % 100 === 0) save(`slush ${i}/${order.length}`);
      if (!p) continue;
      stats.profiled++;
      if (!p.country || !MARKETS.has(p.country)) continue;
      stats.local++;
      const f = filingFounding(p);
      if (!f || f.date > now || dayDiff(f.date, now) > ENTRY_WINDOW_DAYS) continue;
      stats.recentFiling++;
      const fp = await foreignParent(p);
      if (!fp) continue;
      const id = createHash("sha256").update(`sub|${fp.parent.id}|${p.id}`).digest("hex").slice(0, 16);
      entries.set(id, {
        id, kind: "subsidiary", doorId: fp.parent.id, doorName: fp.parent.name,
        local: { id: p.id, name: p.legalName ?? p.name }, market: p.country, date: f.date, source: f.source, match: fp.match,
      });
      stats.entries++;
      log(`entry: ${fp.parent.name} (${fp.parent.country}) -> ${p.legalName ?? p.name} (${p.country}) on ${f.date} [${fp.match}]`);
    }
    log("slush", stats, `${i}/${order.length} attendees visited`);
    save("slush");
  }

  // ---------- 5. foreign Slush attendees -> their new Nordic companies ----------
  if (STAGES.has("entrants") && att.length) {
    const NORDIC_WORD = /\b(Finnish|Finland|Swedish|Sweden|Norwegian|Norway|Danish|Denmark|Icelandic|Iceland)\b/;
    const RECENT = new RegExp(`\\b(${Number(now.slice(0, 4)) - 1}|${now.slice(0, 4)})\\b`);
    const isNordicName = (n: string) => /\b(oy|oyj|ab|a\/s|as|aps|asa|ehf)\b\.?$/i.test(n.trim());
    const foreign = att
      .filter((a) => {
        const p = profiles[a.id];
        return p ? !!p.country && !MARKETS.has(p.country) : !isNordicName(a.name);
      })
      .map((a, i) => ({ a, i, near: nearDemos(a.name, profiles[a.id]) }))
      .sort((x, y) => y.near - x.near || x.i - y.i)
      .map((x) => x.a);
    log(`entrants: ${foreign.length} foreign attendees, ${foreign.filter((a) => nearDemos(a.name, profiles[a.id]) > 0).length} next to the demo startups' industries first`);
    const stats = { visited: 0, searched: 0, candidates: 0, entries: 0, entryNames: [] as string[] };
    const sent0 = calaStats.sent;
    for (const a of foreign) {
      if (outOfCredit || budget <= 0) break;
      stats.visited++;
      if (stats.visited % 25 === 0) log(`entrants ${stats.visited}/${foreign.length}: ${calaStats.sent - sent0} calls sent, ${calaStats.cacheHits} cache hits, statuses ${JSON.stringify(calaStats.status)}, ${stats.candidates} candidates, ${stats.entries} entries`);
      const brand = brandOf(a.name);
      if (brand.length < 3) continue;
      const res = (await spend(() => searchEntities(brand, { types: ["Company"], limit: 10 }))) ?? [];
      stats.searched++;
      const key = normalizeCompany(brand).split(" ")[0];
      const cands = res.filter((c) => c.id !== a.id && normalizeCompany(c.name).startsWith(key) && NORDIC_WORD.test(c.description ?? "") && RECENT.test(c.description ?? "")).slice(0, 2);
      for (const c of cands) {
        stats.candidates++;
        const local = await profile(c.id);
        if (!local?.country || !MARKETS.has(local.country)) continue;
        const f = filingFounding(local);
        if (!f || f.date > now || dayDiff(f.date, now) > ENTRY_WINDOW_DAYS) continue;
        const parent = await profile(a.id);
        if (!parent || parent.country === local.country) continue;
        const byWebsite = !!local.website && (parent.website === local.website || parent.domains.includes(local.website));
        const byRegistry = local.parents.some((q) => q.id === parent.id);
        if (!byWebsite && !byRegistry) continue;
        const id = createHash("sha256").update(`sub|${parent.id}|${local.id}`).digest("hex").slice(0, 16);
        entries.set(id, { id, kind: "subsidiary", doorId: parent.id, doorName: parent.name, local: { id: local.id, name: local.legalName ?? local.name }, market: local.country, date: f.date, source: f.source, match: byRegistry ? "registry-parent" : "website" });
        stats.entries++;
        stats.entryNames.push(`${parent.name} -> ${local.legalName ?? local.name} (${local.country}, ${f.date}, ${byRegistry ? "registry-parent" : "website"})`);
        log(`entry: ${parent.name} (${parent.country}) -> ${local.legalName ?? local.name} (${local.country}) on ${f.date}`);
      }
      if (stats.searched % 100 === 0) save(`entrants ${stats.searched}/${foreign.length}`);
    }
    log("entrants", stats, `of ${foreign.length} foreign attendees`);
    const sent = calaStats.sent - sent0;
    const left = foreign.length - stats.visited;
    writeJson("entrants-report.json", {
      ranAt: new Date().toISOString(), now, foreign: foreign.length, ...stats, outOfCredit,
      calls: { sent, ok: calaStats.ok, status: calaStats.status, cacheHits: calaStats.cacheHits },
      remaining: { attendees: left, estimatedCalls: Math.round(left * (stats.visited ? Math.max(1, sent / stats.visited) : 1.05)) },
    });
    save("entrants");
  }

  // summaries for the demo users, for a quick look
  for (const d of demos) {
    const u = (d.calaId && profiles[d.calaId]) || Object.values(profiles).find((p) => normalizeCompany(p.name) === normalizeCompany(d.name));
    if (u) log(`summary ${d.name}:`, JSON.stringify(summarize(u, ds, d.name)).slice(0, 300));
  }
  log(outOfCredit ? "stopped: out of credit" : "done");
}

void PROFILE_QUERY;
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
