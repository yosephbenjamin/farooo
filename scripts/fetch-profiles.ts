/**
 * npm run profiles  (v2 stage: fills the cache, writes nothing else)
 *
 * One retrieval per company for: Slush 2026 attendees, then seed-fund portfolio companies.
 * Resumable: everything is cached by request, so a rerun only fetches what's missing.
 * Stops cleanly on HTTP 402 (out of credit).
 */
import { relAll, fetchProfileRaw } from "../src/lib/graph";
import { readJson } from "../src/lib/data";
import type { Dataset } from "../src/lib/types";

const SLUSH = "bc844d56-6ab4-452b-96bf-2661e86e592b";
const log = (...a: unknown[]) => console.log("[profiles]", ...a);

async function main() {
  const attendees = await relAll(SLUSH, "incoming", "PARTICIPATES_IN_EVENT");
  const ds = readJson<Dataset | null>("dataset.json", null);
  const keyring = ds ? Object.values(ds.companies).flatMap((c) => c.ids) : [];
  const ids = [...new Set([...attendees.filter((a) => a.entity_type !== "Person").map((a) => a.id), ...keyring])];
  log(`${attendees.length} Slush attendees + ${keyring.length} portfolio ids = ${ids.length} profiles`);
  let i = 0, ok = 0, stop = false;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (!stop && i < ids.length) {
      const id = ids[i++];
      try {
        if (await fetchProfileRaw(id)) ok++;
      } catch {
        stop = true;
        log(`HTTP 402 at ${i}/${ids.length}: out of credit, stopping (progress is cached)`);
      }
      if (i % 200 === 0) log(`${i}/${ids.length} (${ok} ok)`);
    }
  }));
  log(`done: ${ok}/${ids.length}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
