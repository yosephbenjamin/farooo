/** Load and save the cached data under /data. Server-side only. */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { Dataset } from "./types";
import type { FaroEvent } from "./events";

export const DATA_DIR = path.join(process.cwd(), "data");

let dsCache: { mtime: number; ds: Dataset } | null = null;

export function loadDataset(): Dataset {
  const p = path.join(DATA_DIR, "dataset.json");
  const ds = JSON.parse(readFileSync(p, "utf8")) as Dataset;
  if (!dsCache || dsCache.ds.generatedAt !== ds.generatedAt) dsCache = { mtime: Date.now(), ds };
  return dsCache.ds;
}

export function readJson<T>(name: string, fallback: T): T {
  const p = path.join(DATA_DIR, name);
  if (!existsSync(p)) return fallback;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(name: string, value: unknown) {
  const p = path.join(DATA_DIR, name);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(value, null, 2));
}

export function loadEvents(): FaroEvent[] {
  return readJson<FaroEvent[]>("events.json", []);
}

/** Merge new events into data/events.json (dedupe by id; keep the earliest detection). */
export function saveEvents(newEvents: FaroEvent[]) {
  const cur = loadEvents();
  const byId = new Map(cur.map((e) => [e.id, e]));
  for (const e of newEvents) if (!byId.has(e.id)) byId.set(e.id, e);
  const all = [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
  writeJson("events.json", all);
  return all;
}

/** Enriched one-line descriptions keyed by company id (from `npm run enrich`). */
export function loadEnrichment(): Record<string, string> {
  return readJson<Record<string, string>>("enrich.json", {});
}

/** The clock. FARO_NOW pins it (demo, tests); otherwise today. */
export function today(): string {
  return process.env.FARO_NOW ?? new Date().toISOString().slice(0, 10);
}
