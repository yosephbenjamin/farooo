/**
 * npm run demo
 *
 * Freeze the booth demo: for each startup in data/demo/startups.json, build the door report
 * from data/pool.json and save it to data/demo/<slug>.json. Precomputed startups skip identity,
 * and the booth works offline. The scripted door (the top-ranked one) goes to scripted.json.
 */
import { readJson, writeJson } from "../src/lib/data";
import { getReport, slugify, type DemoStartup } from "../src/lib/report";
import { rankDoors, firstLook, tierOf, NO_TAPS } from "../src/lib/doors";

const log = (...a: unknown[]) => console.log("[demo]", ...a);

async function main() {
  const demos = readJson<DemoStartup[]>("demo/startups.json", []);
  const scripted: Record<string, string> = {};
  for (const d of demos) {
    const slug = d.slug || slugify(d.name);
    const r = await getReport(d.name, { forceLive: true });
    writeJson(`demo/${slug}.json`, r);
    const ranked = rankDoors(r.doors, NO_TAPS);
    if (ranked[0]) scripted[slug] = ranked[0].id;
    const s = r.startup;
    log(`${s.name}: ${s.country}, ${s.industries.map((i) => `${i.code}${i.label ? `/${i.label}` : ""}`).join(", ")} | ${s.investors.length} investors | ${r.doors.length} doors`);
    for (const x of firstLook(r.doors)) log(`   first look [${x.type}] T${tierOf(x.door)} ${x.door.whyNow.date} ${x.door.name} ${x.door.whyNow.text}`);
    for (const dd of ranked.slice(0, 8)) log(`   T${tierOf(dd)} ${dd.whyNow.date} ${dd.name} | ${dd.whyNow.text} | ${dd.whyYou.map((w) => w.type).join("/")} | slush=${dd.slush} warm=${dd.warm.map((w) => w.investor + (w.led ? "*" : "")).join(",")} | people=${dd.people.length} | ${dd.whyNow.source.rank ?? "-"} ${dd.whyNow.source.url.slice(0, 70)}`);
  }
  writeJson("demo/scripted.json", scripted);
  void NO_TAPS;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
