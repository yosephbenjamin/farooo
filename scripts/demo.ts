/**
 * npm run demo
 *
 * Precompute the booth demo: for each startup in data/demo/startups.json, build the door
 * report once and freeze it in data/demo/<slug>.json, so the booth is instant and offline.
 * Also picks the scripted "a door opens" door for each (the newest opened door).
 */
import { readJson, writeJson } from "../src/lib/data";
import { fitSentences, llmEnabled } from "../src/lib/llm";
import { getReport, slugify, type DemoStartup } from "../src/lib/report";

const log = (...a: unknown[]) => console.log("[demo]", ...a);

async function main() {
  const demos = readJson<DemoStartup[]>("demo/startups.json", []);
  if (!demos.length) throw new Error("data/demo/startups.json is empty");
  const scripted: Record<string, string> = {};
  for (const d of demos) {
    const slug = d.slug || slugify(d.name);
    const r = await getReport(d.name, { description: d.description, forceLive: true });
    if (llmEnabled()) {
      const top = [...r.opened, ...r.doors.slice(0, 20)];
      const lines = await fitSentences(
        { name: r.startup.name, description: d.description },
        top.map((x) => ({ id: x.companyId, name: x.name, description: x.blurb ?? x.sectors.join(", ") })),
      );
      if (lines) for (const x of [...r.opened, ...r.doors]) if (lines[x.companyId]) x.fit = { ...x.fit, sentence: lines[x.companyId], score: Math.max(x.fit.score, 2) };
    }
    writeJson(`demo/${slug}.json`, r);
    if (r.opened[0]) scripted[slug] = r.opened[0].companyId;
    log(`${r.startup.name}: ${r.startup.investors.map((i) => i.investorName).join(", ")} | ${r.doors.length} doors, ${r.opened.length} opened, ${r.timed.length} timed`);
    for (const o of r.opened.slice(0, 6)) log(`   ${o.reason!.date} ${o.name} ${o.reason!.text} | ${o.fit.sentence} | ${o.reason!.source.url}`);
  }
  writeJson("demo/scripted.json", scripted);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
