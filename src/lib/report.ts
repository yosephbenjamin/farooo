/** Build (or load a precomputed) door report for a startup name. Server-side only. */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildReport, resolveStartup, type DoorReport } from "./doors";
import { DATA_DIR, loadDataset, loadEnrichment, loadEvents, readJson, today } from "./data";
import { normalizeCompany } from "./normalize";

export function slugify(name: string) {
  return normalizeCompany(name).replace(/\s+/g, "-") || "unknown";
}

export interface DemoStartup {
  name: string;
  slug: string;
  description: string;
}

export function demoStartups(): DemoStartup[] {
  return readJson<DemoStartup[]>("demo/startups.json", []);
}

/** Keep the payload small: every opened door plus the best-fitting rest, for the map. */
export function trimReport(r: DoorReport, maxDoors = 140): DoorReport {
  const openedIds = new Set(r.opened.map((d) => d.companyId));
  const rest = r.doors.filter((d) => !openedIds.has(d.companyId)).slice(0, maxDoors);
  return { ...r, doors: [...r.opened, ...rest] };
}

export async function getReport(name: string, opts: { description?: string; forceLive?: boolean } = {}): Promise<DoorReport> {
  const slug = slugify(name);
  const demoPath = path.join(DATA_DIR, "demo", `${slug}.json`);
  if (!opts.forceLive && existsSync(demoPath)) return JSON.parse(readFileSync(demoPath, "utf8")) as DoorReport;

  const ds = loadDataset();
  const live = !!process.env.CALA_API_KEY && process.env.CALA_OFFLINE !== "1";
  const demo = demoStartups().find((d) => d.slug === slug);
  const startup = await resolveStartup(ds, name, opts.description ?? demo?.description ?? "", { live });
  const report = buildReport(ds, startup, {
    now: today(),
    events: loadEvents(),
    enrich: loadEnrichment(),
    fitOverrides: readJson<Record<string, string>>("fit.json", {}),
  });
  return trimReport(report);
}
