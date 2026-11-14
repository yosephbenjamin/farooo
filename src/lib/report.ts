/** Build (or load a precomputed) door report. Server-side only. */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildReport, type DoorReport, type Pool } from "./doors";
import { DATA_DIR, readJson, today } from "./data";
import { normalizeCompany } from "./normalize";
import { resolveByDomain, resolveByName, summarize } from "./identity";
import { prettyName } from "./profile";
import type { Dataset } from "./types";

export function slugify(name: string) {
  return normalizeCompany(name).replace(/\s+/g, "-") || "unknown";
}

export interface DemoStartup {
  name: string;
  slug: string;
  /** Pinned Cala id: same-name companies exist ("Oura" in the US, "Verda" in the UK). */
  calaId?: string;
  description: string;
}

export function demoStartups(): DemoStartup[] {
  return readJson<DemoStartup[]>("demo/startups.json", []);
}

const EMPTY_POOL: Pool = { profiles: {}, entries: [], rounds: [], slush: { ids: [], names: [] } };
export function loadPool(): Pool {
  return readJson<Pool>("pool.json", EMPTY_POOL);
}

const live = () => !!process.env.CALA_API_KEY && process.env.CALA_OFFLINE !== "1";

/** Precomputed booth/demo startups skip identity entirely. */
function demoReport(slug: string): DoorReport | null {
  const p = path.join(DATA_DIR, "demo", `${slug}.json`);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as DoorReport) : null;
}

function emptyReport(name: string): DoorReport {
  return { now: today(), startup: { id: null, name, country: null, industries: [], investors: [], resolvedFrom: "none" }, doors: [] };
}

export async function getReport(name: string, opts: { forceLive?: boolean; noWeapons?: boolean; live?: boolean } = {}): Promise<DoorReport> {
  const slug = slugify(name);
  if (!opts.forceLive) {
    const demo = demoReport(slug);
    if (demo) return demo;
  }
  const pool = loadPool();
  const ds = readJson<Dataset | null>("dataset.json", null);
  const pinned = demoStartups().find((d) => d.slug === slug)?.calaId;
  const canLive = opts.live ?? live();
  const p = (pinned ? pool.profiles[pinned] : null) ?? (await resolveByName(name, pool.profiles, { live: false })) ?? (canLive ? await resolveByName(name) : null);
  if (!p) return emptyReport(name.trim());
  const typed = name.trim();
  const display = normalizeCompany(typed) !== normalizeCompany(p.name) && typed.length < p.name.length ? typed : prettyName(p.name);
  return buildReport(pool, summarize(p, ds, display, "cala"), { now: today(), noWeapons: opts.noWeapons });
}

/** Gmail: the user's company from their email domain. */
export async function getReportForEmail(email: string, opts: { live?: boolean } = {}): Promise<DoorReport | null> {
  const pool = loadPool();
  const ds = readJson<Dataset | null>("dataset.json", null);
  const p = (await resolveByDomain(email, pool.profiles, { live: false })) ?? ((opts.live ?? live()) ? await resolveByDomain(email) : null);
  if (!p) return null;
  const demo = demoReport(slugify(p.name)) ?? demoStartups().map((d) => demoReport(d.slug)).find((r) => r?.startup.id === p.id) ?? null;
  return demo ?? buildReport(pool, summarize(p, ds, prettyName(p.name), "domain"), { now: today() });
}

export { prettyName } from "./profile";
