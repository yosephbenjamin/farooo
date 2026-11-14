/**
 * npm run screen  (offline: reads data/pool.json, no Cala calls)
 *
 * Rank seed-stage Nordic startups by the strength of their market-entry doors, to pick the demo:
 * best top-door tier first, then how many entry doors with a warm path, then entry doors at all.
 */
import { readJson } from "../src/lib/data";
import { buildReport, rankDoors, tierOf, NO_TAPS, type Pool } from "../src/lib/doors";
import { summarize } from "../src/lib/identity";
import type { Dataset } from "../src/lib/types";

const NORDIC = new Set(["Finland", "Sweden", "Norway", "Denmark", "Iceland"]);
const SEED = /^(PRE_?SEED|SEED|ANGEL)$/i;
const pool = readJson<Pool>("pool.json", { profiles: {}, entries: [], rounds: [], slush: { ids: [], names: [] } });
const ds = readJson<Dataset | null>("dataset.json", null);
const now = process.env.FARO_NOW ?? new Date().toISOString().slice(0, 10);
const all = process.argv.includes("--all");

const rows = [];
for (const p of Object.values(pool.profiles)) {
  if (!p.country || !NORDIC.has(p.country)) continue;
  if (!all && !SEED.test(p.fundingStage ?? "")) continue;
  const r = buildReport(pool, summarize(p, ds, p.name, "cala"), { now });
  const ranked = rankDoors(r.doors, NO_TAPS);
  const entry = ranked.filter((d) => d.entering);
  if (!entry.length) continue;
  rows.push({
    p, ranked, top: tierOf(ranked[0]),
    warmEntry: entry.filter((d) => d.warm.length).length, entry: entry.length,
    types: new Set(ranked.slice(0, 6).flatMap((d) => d.whyYou.map((w) => w.type))).size,
  });
}
rows.sort((a, b) => a.top - b.top || b.warmEntry - a.warmEntry || b.entry - a.entry || b.types - a.types || b.ranked.length - a.ranked.length);
for (const x of rows.slice(0, Number(process.env.TOP ?? 25))) {
  console.log(`T${x.top} | ${x.p.name} (${x.p.country}, ${x.p.fundingStage ?? "?"}, ${x.p.id}) | entry ${x.entry}, warm entry ${x.warmEntry}, doors ${x.ranked.length}, types ${x.types} | inv ${x.p.investors.slice(0, 4).map((i) => i.name).join("; ")}`);
  for (const d of x.ranked.slice(0, 3)) console.log(`    T${tierOf(d)} ${d.whyNow.date} ${d.name} ${d.whyNow.text} | ${d.whyYou.map((w) => w.type).join("/")} | warm ${d.warm.map((w) => w.investor + (w.led ? "*" : "")).join(", ") || "-"} | slush ${d.slush}`);
}
console.log(`${rows.length} candidates with an entry door${all ? "" : " (seed stage)"}`);
