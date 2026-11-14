/**
 * Cala API client.
 *
 * - Reads the key from env CALA_API_KEY only. The key never touches disk or logs.
 * - 90 s timeout per call, retries with backoff on timeouts, 429 and 5xx.
 * - On-disk response cache keyed by (method, path, body) so nothing is queried twice.
 * - Small concurrency limiter so a big ingest doesn't hammer the API.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://api.cala.ai";
const TIMEOUT_MS = 90_000;
const MAX_RETRIES = 6;
const CACHE_DIR = path.join(process.cwd(), "data", "cache", "cala");

export type CacheMode = "use" | "refresh" | "only";

export interface CalaOptions {
  /** "use": read cache, fetch on miss. "refresh": always fetch. "only": never fetch (offline). */
  cache?: CacheMode;
  /** Override timeout, e.g. for the slow knowledge endpoints. */
  timeoutMs?: number;
}

// ---------- concurrency limiter ----------
const MAX_CONCURRENT = Number(process.env.CALA_CONCURRENCY ?? 4);
let active = 0;
const queue: Array<() => void> = [];
async function acquire() {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }
  await new Promise<void>((resolve) => queue.push(resolve));
  active++;
}
// ---------- rate pacing (Cala answers 429 above ~1.5 req/s, without rate-limit headers) ----------
// Nov 2026 key: ~10 requests per rolling minute (burst 10, then ~1 per 6 s). Override with CALA_RPS.
const MIN_INTERVAL_MS = 1000 / Number(process.env.CALA_RPS ?? 0.165);
let nextSlot = 0;
async function pace() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_INTERVAL_MS;
  if (wait) await sleep(wait);
}

function release() {
  active--;
  const next = queue.shift();
  if (next) next();
}

// ---------- cache ----------
function cacheKey(method: string, p: string, body?: unknown) {
  const raw = JSON.stringify({ method, path: p, body: body ?? null });
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

async function readCache(key: string): Promise<unknown | undefined> {
  try {
    const txt = await readFile(path.join(CACHE_DIR, `${key}.json`), "utf8");
    return JSON.parse(txt).response;
  } catch {
    return undefined;
  }
}

async function writeCache(key: string, method: string, p: string, body: unknown, response: unknown) {
  await mkdir(CACHE_DIR, { recursive: true });
  const record = { method, path: p, body: body ?? null, fetchedAt: new Date().toISOString(), response };
  await writeFile(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(record));
}

export class CalaError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function calaRequest<T = unknown>(
  method: "GET" | "POST",
  p: string,
  body?: unknown,
  opts: CalaOptions = {},
): Promise<T> {
  const mode = opts.cache ?? (process.env.CALA_OFFLINE === "1" ? "only" : "use");
  const key = cacheKey(method, p, body);

  if (mode !== "refresh") {
    const hit = await readCache(key);
    if (hit !== undefined) return hit as T;
    if (mode === "only") throw new CalaError(`cache miss (offline): ${method} ${p}`);
  }

  const apiKey = process.env.CALA_API_KEY;
  if (!apiKey) throw new CalaError("CALA_API_KEY is not set");

  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let waitMs = 0;
    await acquire();
    await pace();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? TIMEOUT_MS);
    try {
      const res = await fetch(BASE + p, {
        method,
        headers: {
          "X-API-KEY": apiKey,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      const text = await res.text();
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get("retry-after")) || 0;
        lastErr = new CalaError(`HTTP ${res.status} on ${method} ${p}`, res.status);
        waitMs = Math.max(retryAfter * 1000, 3000 * 2 ** Math.min(attempt, 4));
        if (res.status === 429) nextSlot = Date.now() + 2000; // back the whole client off
      } else if (!res.ok) {
        // Deterministic 4xx: don't retry. Cache 404/422 so we don't ask again.
        if (res.status === 404 || res.status === 422) {
          await writeCache(key, method, p, body, { __error: res.status, text: text.slice(0, 2000) });
        }
        throw new CalaError(`HTTP ${res.status} on ${method} ${p}: ${text.slice(0, 300)}`, res.status);
      } else {
        const json = JSON.parse(text);
        await writeCache(key, method, p, body, json);
        return json as T;
      }
    } catch (e) {
      if (e instanceof CalaError && e.status && e.status < 500 && e.status !== 429) throw e;
      lastErr = e; // timeout / network
      waitMs = 2000 * 2 ** attempt;
    } finally {
      clearTimeout(timer);
      release();
    }
    if (attempt < MAX_RETRIES) await sleep(waitMs);
  }
  throw lastErr instanceof Error ? lastErr : new CalaError(String(lastErr));
}

/** True if a cached response is a stored 404/422. */
export function isCachedError(x: unknown): boolean {
  return !!x && typeof x === "object" && "__error" in (x as Record<string, unknown>);
}

// ---------- typed helpers ----------
export interface CalaEntity {
  id: string;
  name: string;
  entity_type: string;
  description?: string | null;
  [k: string]: unknown;
}

export interface CalaSource {
  date?: string | null;
  document?: string | null;
  name?: string | null;
}

export interface RelatedEntity {
  id: string;
  name: string;
  entity_type: string;
  properties?: { sources?: CalaSource[]; [k: string]: unknown };
}

export interface GetEntityResponse {
  id: string;
  name: string;
  entity_type: string;
  properties?: Record<string, unknown>;
  relationships?: {
    outgoing?: Record<string, RelatedEntity[]>;
    incoming?: Record<string, RelatedEntity[]>;
  };
  [k: string]: unknown;
}

export async function searchEntities(name: string, opts: { types?: string[]; limit?: number } & CalaOptions = {}) {
  const q = new URLSearchParams({ name });
  for (const t of opts.types ?? []) q.append("entity_types", t);
  if (opts.limit) q.set("limit", String(opts.limit));
  const res = await calaRequest<{ entities: CalaEntity[] } | { __error: number }>(
    "GET",
    `/v1/entities?${q.toString()}`,
    undefined,
    opts,
  );
  return "entities" in res ? res.entities : [];
}

export async function introspect(id: string, opts: CalaOptions = {}) {
  return calaRequest<{ properties: string[]; relationships: { outgoing: string[]; incoming: string[] } }>(
    "GET",
    `/v1/entities/${id}/introspection`,
    undefined,
    opts,
  );
}

export async function getEntity(
  id: string,
  query: {
    properties?: string[];
    relationships?: { outgoing?: Record<string, { limit?: number; offset?: number }>; incoming?: Record<string, { limit?: number; offset?: number }> };
  },
  opts: CalaOptions = {},
) {
  return calaRequest<GetEntityResponse>("POST", `/v1/entities/${id}`, query, opts);
}

export interface QueryResponse {
  results: Record<string, unknown>[];
  entities?: unknown[];
  [k: string]: unknown;
}

export async function knowledgeQuery(input: string, opts: CalaOptions = {}) {
  return calaRequest<QueryResponse>("POST", "/v1/knowledge/query", { input }, { timeoutMs: TIMEOUT_MS, ...opts });
}

export interface KnowBit {
  id: string;
  content: string;
  origins: { source: { name: string; url: string }; document: { name: string; url: string } }[];
}
export interface SearchAnswer {
  content: string;
  explainability?: { content: string; references: string[] }[] | null;
  context?: KnowBit[];
  entities?: unknown[];
  [k: string]: unknown;
}

export async function knowledgeSearch(input: string, opts: CalaOptions = {}) {
  return calaRequest<SearchAnswer>(
    "POST",
    "/v1/knowledge/search",
    { input, explainability: true },
    { timeoutMs: TIMEOUT_MS, ...opts },
  );
}
