/**
 * npm run screen  (offline: reads data/pool.json, no Cala calls)
 *
 * Demo candidates: seed-stage Nordic startups whose log has at least one warm-path door, at least
 * three doors, and three different reasons in the first look; built as the demos are (no weapons
 * makers). Ranked by warm-path doors, then reasons shown, then the top door's freshness.
 */
import { readJson } from "../src/lib/data";
import { buildReport, firstLook, rankDoors, tierOf, NO_TAPS, type Door, type Pool } from "../src/lib/doors";
import { summarize } from "../src/lib/identity";
import type { Dataset } from "../src/lib/types";

const NORDIC = new Set(["Finland", "Sweden", "Norway", "Denmark", "Iceland"]);
const SEED = /^(PRE_?SEED|SEED|ANGEL)$/i;
const pool = readJson<Pool>("pool.json", { profiles: {}, entries: [], rounds: [], slush: { ids: [], names: [] } });
const ds = readJson<Dataset | null>("dataset.json", null);
const now = process.env.FARO_NOW ?? new Date().toISOString().slice(0, 10);
const reason = (d: Door) => (d.whyNow.kind === "news" || d.whyNow.kind === "entry" ? "entry" : d.whyNow.kind);

const rows = [];
for (const p of Object.values(pool.profiles)) {
  if (!p.country || !NORDIC.has(p.country) || !SEED.test(p.fundingStage ?? "")) continue;
  const r = buildReport(pool, summarize(p, ds, p.name, "cala"), { now, noWeapons: true });
  const ranked = rankDoors(r.doors, NO_TAPS);
  const warm = ranked.filter((d) => d.warm.length);
  const fl = firstLook(r.doors);
  const reasons = new Set(fl.map((x) => reason(x.door))).size;
  rows.push({ p, ranked, fl, warm: warm.length, reasons, ok: warm.length >= 1 && ranked.length >= 3 && reasons >= 3 });
}
rows.sort((a, b) => Number(b.ok) - Number(a.ok) || b.warm - a.warm || b.reasons - a.reasons || (b.ranked[0]?.whyNow.date ?? "").localeCompare(a.ranked[0]?.whyNow.date ?? ""));
for (const x of rows.slice(0, Number(process.env.TOP ?? 15))) {
  console.log(`${x.ok ? "OK " : "-- "}${x.p.name} (${x.p.country}, ${x.p.fundingStage}, ${x.p.id}) | warm doors ${x.warm}, reasons ${x.reasons}, doors ${x.ranked.length} | inv ${x.p.investors.slice(0, 4).map((i) => i.name).join("; ")}`);
  for (const { door: d, type } of x.fl) console.log(`    T${tierOf(d)} [${reason(d)}] ${d.whyNow.date} ${d.name} ${d.whyNow.text} | ${type} | warm ${d.warm.map((w) => w.investor + (w.led ? "*" : "")).join(", ") || "-"} | slush ${d.slush}`);
}
console.log(`${rows.filter((x) => x.ok).length} of ${rows.length} seed-stage Nordic startups qualify`);
