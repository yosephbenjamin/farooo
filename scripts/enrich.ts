/**
 * npm run enrich -- <investor-slug> [<investor-slug> ...]
 *
 * Many Cala company descriptions are boilerplate ("Swedish company founded in 2017 and
 * headquartered in Stockholm."). For companies in the given keyrings, ask the query layer
 * what each one does, in batches, and store one line per company in data/enrich.json.
 * Slow (~50 s per batch) but cached, so it runs once.
 */
import { knowledgeQuery } from "../src/lib/cala";
import { loadDataset, readJson, writeJson } from "../src/lib/data";
import { isBoilerplate } from "../src/lib/sectors";
import { normalizeCompany } from "../src/lib/normalize";

const BATCH = 25;
const log = (...a: unknown[]) => console.log("[enrich]", ...a);

async function main() {
  const ds = loadDataset();
  const slugs = process.argv.slice(2);
  const enrich = readJson<Record<string, string>>("enrich.json", {});
  const ids = new Set<string>();
  for (const s of slugs.length ? slugs : Object.keys(ds.keyrings)) for (const id of ds.keyrings[s] ?? []) ids.add(id);
  const todo = [...ids].filter((id) => isBoilerplate(ds.companies[id]?.description) && !enrich[id]);
  log(`${todo.length} companies need a description`);

  const batches: string[][] = [];
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));
  let bi = 0;
  let got = 0;
  await Promise.all(
    Array.from({ length: 2 }, async () => {
      while (bi < batches.length) {
        const b = batches[bi++];
        const list = b.map((id) => `${ds.companies[id].name} (${ds.companies[id].country ?? "?"})`).join("; ");
        const res = await knowledgeQuery(`What does each of these startups do? One short line each: company, what_it_does. ${list}`).catch(() => null);
        for (const row of res?.results ?? []) {
          const name = String(row.company ?? row.name ?? row.startup ?? "");
          const what = String(row.what_it_does ?? row.description ?? row.does ?? row.business ?? "");
          if (!name || !what || /not (found|available|known)|unknown|no information/i.test(what)) continue;
          const key = normalizeCompany(name);
          const id = b.find((x) => [ds.companies[x].name, ...ds.companies[x].aliases].map(normalizeCompany).includes(key));
          if (id) {
            enrich[id] = what.replace(/\s+/g, " ").trim();
            got++;
          }
        }
        writeJson("enrich.json", enrich);
        log(`batch ${bi}/${batches.length}, ${got} described`);
      }
    }),
  );
  writeJson("enrich.json", enrich);
  log(`done: ${got} new descriptions, ${Object.keys(enrich).length} total`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
