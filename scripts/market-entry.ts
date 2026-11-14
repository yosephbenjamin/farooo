/**
 * npm run market  (M3b)
 *
 * Nightly: ask /knowledge/search which companies are entering the Nordic markets. Each claim
 * in `explainability` cites KnowBits, which carry source URLs. From each claim extract
 * {company, market, date, source}, drop anything that isn't an outside company entering a
 * market, keep concrete dates only, resolve the company, and save events.
 *
 * Extraction uses the LLM if ANTHROPIC_API_KEY is set, otherwise regex on the claim and URL.
 */
import { createHash } from "node:crypto";
import { knowledgeSearch, searchEntities, type SearchAnswer } from "../src/lib/cala";
import { concreteDateInText, concreteDateInUrl } from "../src/lib/dates";
import { findInDataset } from "../src/lib/doors";
import { hostOf } from "../src/lib/graph";
import { loadDataset, saveEvents, today, writeJson } from "../src/lib/data";
import { extractClaims, llmEnabled } from "../src/lib/llm";
import { normalizeCompany } from "../src/lib/normalize";
import type { FaroEvent } from "../src/lib/events";

const log = (...a: unknown[]) => console.log("[market]", ...a);
const MARKETS = ["Finland", "Sweden", "Norway", "Denmark", "the Nordics"];

const NOT_ENTRY = /\b(forecast|market (size|is expected|will grow)|cagr|merg(e|er|ed)|acquir|acquisition|alliance|partnership with|joint venture|takeover|funding|raised|invest(s|ed|ment) in (a|the) (startup|company)|ipo|layoffs?|exit(s|ed)? the|withdraw|leav(e|es|ing) the)\b/i;
const ENTRY = /\b(expand(s|ed|ing)? (in)?to|enter(s|ed|ing)?|launch(es|ed|ing)? (in|its)|open(s|ed|ing)? (an? |its )?(new )?(office|store|hub|data cent(er|re)|headquarters|factory|plant)|set(s|ting)? up|establish(es|ed|ing)?|arriv(es|ed|ing)? in|debut(s|ed)? in|roll(s|ed)? out in|first (store|market)|to build|plans to (open|build|develop))\b/i;

interface Claim {
  index: number;
  market: string;
  text: string;
  url: string;
  sourceName: string;
  knowbit: string;
}

function claimsOf(ans: SearchAnswer, market: string, start: number): Claim[] {
  const ctx = new Map((ans.context ?? []).map((k) => [k.id, k]));
  const out: Claim[] = [];
  for (const step of ans.explainability ?? []) {
    const kb = (step.references ?? []).map((r) => ctx.get(r)).find((k) => k?.origins?.length);
    const o = kb?.origins?.[0];
    const url = o?.document?.url || o?.source?.url;
    if (!url) continue;
    out.push({ index: start + out.length, market, text: step.content, url, sourceName: o?.source?.name || hostOf(url), knowbit: kb?.content ?? "" });
  }
  return out;
}

/** Heuristic extraction: leading proper-noun phrase + entry verb, date from text or URL. */
function heuristic(c: Claim) {
  if (NOT_ENTRY.test(c.text) || !ENTRY.test(c.text)) return { company: null, date: null, isEntry: false };
  const m = c.text.match(/^(?:\*\*)?([A-Z0-9][\w&.'’-]*(?:\s+(?:[A-Z0-9][\w&.'’-]*|of|de|&))*?)(?:\s*\([^)]*\))?\s+(?:has|have|is|was|will|plans|announced|launched|opened|signed|said|reported|expanded|entered|set|established|unveiled|revealed|confirmed|began|started|is set|debuted|rolled|chose|picked|selected)\b/);
  const company = m ? m[1].replace(/^(The|US|U\.S\.|German|Swedish|Chinese|French|British|American|Japanese)\s+/, "").trim() : null;
  if (!company || /^(Multiple|Several|Many|Some|Companies|Firms|Startups)$/i.test(company.split(" ")[0])) return { company: null, date: null, isEntry: false };
  const date = concreteDateInText(c.text) ?? concreteDateInUrl(c.url) ?? concreteDateInText(c.knowbit);
  return { company, date, isEntry: true };
}

function marketCountry(market: string): string[] {
  return market === "the Nordics" ? ["Finland", "Sweden", "Norway", "Denmark", "Iceland"] : [market];
}

async function main() {
  const ds = loadDataset();
  const now = today();
  const year = now.slice(0, 4);
  const cutoff = new Date(Date.parse(now) - 120 * 86400000).toISOString().slice(0, 10);

  const claims: Claim[] = [];
  for (const m of MARKETS) {
    for (const q of [
      `Which companies announced expanding into ${m} in ${year}?`,
      `Which foreign startups and tech companies launched or opened offices in ${m} in the last three months of ${year}?`,
    ]) {
      const ans = await knowledgeSearch(q).catch((e) => {
        log("search failed", q, e.message);
        return null;
      });
      if (ans) claims.push(...claimsOf(ans, m, claims.length));
    }
  }
  log(`${claims.length} claims with sources`);

  const llm = llmEnabled() ? await extractClaims(claims.map((c) => ({ index: c.index, text: c.text, url: c.url }))) : null;
  const llmBy = new Map((llm ?? []).map((x) => [x.index, x]));

  const stats = { claims: claims.length, notEntry: 0, noCompany: 0, noDate: 0, outOfWindow: 0, localCompany: 0, kept: 0, duplicate: 0 };
  const drops: { text: string; reason: string }[] = [];
  const events: FaroEvent[] = [];
  const seen = new Set<string>();

  for (const c of claims) {
    const x = llmBy.get(c.index);
    const h = heuristic(c);
    const company = x ? x.company : h.company;
    const isEntry = x ? x.isEntry : h.isEntry;
    const date = (x?.date && /^\d{4}-\d{2}-\d{2}$/.test(x.date) ? x.date : null) ?? h.date ?? concreteDateInUrl(c.url);
    const market = x?.market ?? c.market;
    if (!isEntry) { stats.notEntry++; drops.push({ text: c.text.slice(0, 140), reason: "not a market entry" }); continue; }
    if (!company) { stats.noCompany++; drops.push({ text: c.text.slice(0, 140), reason: "no single company" }); continue; }
    if (!date) { stats.noDate++; drops.push({ text: c.text.slice(0, 140), reason: "no concrete date" }); continue; }
    if (date < cutoff || date > now) { stats.outOfWindow++; continue; }

    // resolve company; drop local companies "entering" their own market
    const key = normalizeCompany(company);
    const cands = await searchEntities(company, { types: ["Company", "Organization"], limit: 5 }).catch(() => []);
    const ent = cands.find((e) => normalizeCompany(e.name) === key) ?? null;
    const desc = ent?.description ?? "";
    const home = marketCountry(c.market).some((mc) => desc.includes(mc) || desc.includes(mc.replace(/land$/, "nish").replace(/den$/, "dish").replace(/way$/, "wegian").replace(/mark$/, "ish")));
    if (home && c.market !== "the Nordics") { stats.localCompany++; drops.push({ text: c.text.slice(0, 140), reason: "local company" }); continue; }
    const id = createHash("sha256").update(`entry|${key}|${market}|${date}`).digest("hex").slice(0, 16);
    const dupKey = `${key}|${market}`;
    if (seen.has(dupKey)) { stats.duplicate++; continue; }
    seen.add(dupKey);
    const local = (ent && ds.idIndex[ent.id]?.kind === "company" ? ds.companies[ds.idIndex[ent.id].id] : null) ?? findInDataset(ds, company);
    events.push({
      id,
      kind: "market-entry",
      companyId: local?.id ?? null,
      calaId: ent?.id ?? null,
      companyName: local?.name ?? company,
      date,
      text: `is entering ${market.replace(/^the /, "the ")}`,
      market,
      source: { name: c.sourceName, url: c.url },
      description: c.text,
      origin: "search",
      detectedAt: new Date().toISOString(),
    });
    stats.kept++;
  }
  const all = saveEvents(events);
  writeJson("market-report.json", { ranAt: new Date().toISOString(), now, extraction: llm ? "llm" : "heuristic", stats, drops: drops.slice(0, 200) });
  log("stats", stats, `events.json now ${all.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
