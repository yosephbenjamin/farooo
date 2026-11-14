/**
 * Reasons to partner beyond market entry (see BUILD_SPEC.md north star): new money, new hires,
 * new acquisitions. Parsed from one entity retrieval (SIGNAL_QUERY): the profile, executives with
 * valid_since, corporate events (role + event_date + sources on the link itself), and the
 * "Number of employees" time series. Pure functions; every event has a day date and a source.
 */
import type { GetEntityResponse, RelatedEntity } from "./cala";
import { PROFILE_QUERY } from "./graph";
import { rankedSources, type RankedSource } from "./profile";

/** Cala's ObservableProperty "Number of employees" (code employee_count); the same id on every company. */
export const EMPLOYEES_METRIC = "64231bfc-8b8e-548e-a215-0dcee3ea6998";

export const SIGNAL_QUERY = {
  properties: PROFILE_QUERY.properties,
  relationships: {
    outgoing: { ...PROFILE_QUERY.relationships.outgoing, PARTICIPATES_IN_CORPORATE_EVENT: { limit: 40 } },
    incoming: PROFILE_QUERY.relationships.incoming,
  },
  numerical_observations: { ObservableProperty: [EMPLOYEES_METRIC] },
};

export type SignalKind = "exec" | "headcount" | "acquisition" | "money";

export interface TimedEvent {
  id: string;
  companyId: string;
  kind: SignalKind;
  date: string; // YYYY-MM-DD
  /** Prose after the company name: "named Anna Virtanen CEO", "grew from 27 to 41 people". */
  text: string;
  source: RankedSource;
  /** Acquisitions: the corporate event, to look up the target. */
  eventId?: string;
}

const day = (x: unknown) => (typeof x === "string" && /^\d{4}-\d{2}-\d{2}/.test(x) ? x.slice(0, 10) : null);
const AGGREGATOR = /tracxn|crunchbase|pitchbook|dealroom|cbinsights|owler|zoominfo|rocketreach|signalhire|leadiq/i;
const isAggregator = (s: RankedSource) => s.rank === "AGGREGATOR" || AGGREGATOR.test(s.url);
/** The best source: a filing, press or the company itself before an aggregator listing. */
function bestSource(xs: unknown): RankedSource | null {
  const all = rankedSources((xs as never[]) ?? []).filter((s) => /^https?:\/\//.test(s.url));
  const score = (s: RankedSource) => (isAggregator(s) ? 0 : s.rank === "FILING" || s.rank === "PRESS" ? 3 : s.rank === "PRIMARY" ? 2 : 1);
  return all.sort((a, b) => score(b) - score(a))[0] ?? null;
}
/** A SPAC merger is going public, not buying a business. */
export const SPAC = /\b(acquisition corp(oration)?|spac|blank check)\b/i;

/** Headcount jump: the latest observation is at least +5 people and +30% on the one before. */
export const JUMP_MIN_PEOPLE = 5;
export const JUMP_MIN_RATIO = 0.3;

export function parseSignals(res: GetEntityResponse): TimedEvent[] {
  const out: TimedEvent[] = [];
  const id = res.id;
  const inc = res.relationships?.incoming ?? {};
  const outg = res.relationships?.outgoing ?? {};

  // new executives: a role with a recent valid_since, still held
  const roles: [string, string][] = [["IS_CEO_OF", "CEO"], ["IS_CTO_OF", "CTO"], ["IS_VICEPRESIDENT_OF", "VP"]];
  for (const [rel, role] of roles) {
    for (const x of (inc[rel] ?? []) as RelatedEntity[]) {
      if (x.entity_type !== "Person" || x.properties?.valid_until) continue;
      const since = day(x.properties?.valid_since);
      const src = bestSource(x.properties?.sources);
      if (!since || since.endsWith("-01-01") || !src) continue; // day precision, sourced
      out.push({ id: `exec|${id}|${x.id}|${since}`, companyId: id, kind: "exec", date: since, text: `named ${x.name} ${role}`, source: src });
    }
  }

  // corporate events: completed acquisitions (as acquirer) and financings (as issuer)
  for (const e of (outg.PARTICIPATES_IN_CORPORATE_EVENT ?? []) as RelatedEntity[]) {
    const role = String(e.properties?.role ?? "");
    const date = day(e.properties?.event_date);
    const src = bestSource(e.properties?.sources);
    if (!date || !src) continue;
    if (e.name === "MNA_COMPLETED" && role === "ACQUIRER") {
      out.push({ id: `acq|${id}|${e.id}`, companyId: id, kind: "acquisition", date, text: "completed an acquisition", source: src, eventId: e.id });
    } else if (/^FINANCING_RAISED/.test(e.name) && role === "ISSUER" && !isAggregator(src)) {
      // new money needs more than an aggregator listing (its date is a crawl date)
      out.push({ id: `money|${id}|${e.id}`, companyId: id, kind: "money", date, text: "raised a round", source: src });
    }
  }

  // headcount jump from the employee-count time series
  const obs = ((res as unknown as { numerical_observations?: { id: string; data?: { time: string; value: number; origin?: { name?: string; url?: string } }[] }[] }).numerical_observations ?? [])
    .find((o) => o.id === EMPLOYEES_METRIC);
  const pts = (obs?.data ?? []).filter((p) => typeof p.value === "number" && day(p.time)).sort((a, b) => a.time.localeCompare(b.time));
  if (pts.length >= 2) {
    const [a, b] = pts.slice(-2);
    if (a.value > 0 && b.value - a.value >= JUMP_MIN_PEOPLE && (b.value - a.value) / a.value >= JUMP_MIN_RATIO && b.origin?.url) {
      out.push({
        id: `hc|${id}|${day(b.time)}`, companyId: id, kind: "headcount", date: day(b.time)!,
        text: `grew from ${a.value} to ${b.value} people`,
        source: { name: b.origin.name || b.origin.url, url: b.origin.url, date: day(b.time), rank: null },
      });
    }
  }
  return out;
}

/** The latest headcount, for the "giant" check (no giants as headlines). */
export function latestHeadcount(res: GetEntityResponse): number | null {
  const obs = ((res as unknown as { numerical_observations?: { id: string; data?: { time: string; value: number }[] }[] }).numerical_observations ?? []).find((o) => o.id === EMPLOYEES_METRIC);
  const pts = (obs?.data ?? []).filter((p) => typeof p.value === "number").sort((a, b) => a.time.localeCompare(b.time));
  return pts.length ? pts[pts.length - 1].value : null;
}
