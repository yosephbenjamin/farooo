/**
 * Graph walks over Cala's entity API: fund vehicles -> rounds -> companies.
 * Used by `npm run ingest` and, for investors outside the seed list, live by the door engine.
 */
import { getEntity, introspect, searchEntities, type CalaOptions, type CalaSource, type RelatedEntity } from "./cala";
import type { RawCompany, RawRound, Source } from "./types";

const PAGE = 100;

export function toSources(xs: CalaSource[] | undefined, max = 4): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const s of xs ?? []) {
    const url = s.document || "";
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ name: s.name || hostOf(url), url, date: s.date || null });
  }
  // Press/primary sources with real article dates first; aggregator profile pages last.
  out.sort((a, b) => score(b) - score(a));
  return out.slice(0, max);
}

function score(s: Source) {
  let x = 0;
  if (!/tracxn|crunchbase|pitchbook|openvc|dealroom|cbinsights/.test(s.url)) x += 2;
  if (s.date) x += 1;
  return x;
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Fetch every target of one relationship type, paginating. */
export async function relAll(
  id: string,
  dir: "outgoing" | "incoming",
  rel: string,
  opts: CalaOptions = {},
): Promise<RelatedEntity[]> {
  const all: RelatedEntity[] = [];
  for (let offset = 0; offset < 2000; offset += PAGE) {
    const res = await getEntity(id, { relationships: { [dir]: { [rel]: { limit: PAGE, offset } } } }, opts).catch(() => null);
    const batch = res?.relationships?.[dir]?.[rel] ?? [];
    all.push(...batch);
    if (batch.length < PAGE) break;
  }
  return all;
}

export interface VehicleLinks {
  invested: RelatedEntity[];
  corporateEvents: RelatedEntity[];
  fundingRounds: RelatedEntity[];
}

export async function vehicleLinks(id: string, opts: CalaOptions = {}): Promise<VehicleLinks> {
  const [invested, corporateEvents, fundingRounds] = await Promise.all([
    relAll(id, "outgoing", "INVESTED_IN", opts),
    relAll(id, "outgoing", "PARTICIPATES_IN_CORPORATE_EVENT", opts),
    relAll(id, "outgoing", "PARTICIPATES_IN_FUNDING_ROUND", opts),
  ]);
  return { invested, corporateEvents, fundingRounds };
}

const ISSUER_ROLES = new Set(["ISSUER", "RECIPIENT", "TARGET", "COMPANY", "FUNDED", "INVESTEE", "BORROWER"]);

function val(p: Record<string, unknown> | undefined, k: string): unknown {
  const v = p?.[k] as { value?: unknown } | undefined;
  return v && typeof v === "object" && "value" in v ? v.value : undefined;
}
function srcOf(p: Record<string, unknown> | undefined, k: string): CalaSource[] {
  const v = p?.[k] as { sources?: CalaSource[] } | undefined;
  return v?.sources ?? [];
}

/** Fetch a round (either model) with its participants. */
export async function fetchRound(id: string, kind: "PCFR" | "FR", opts: CalaOptions = {}): Promise<RawRound | null> {
  const rel = kind === "PCFR" ? "PARTICIPATES_IN_CORPORATE_EVENT" : "PARTICIPATES_IN_FUNDING_ROUND";
  const props =
    kind === "PCFR"
      ? ["name", "round_type", "event_date", "transaction_value", "transaction_value_units", "description"]
      : ["name", "round_label", "announcement_date", "transaction_value", "transaction_value_units", "instrument"];
  const res = await getEntity(id, { properties: props, relationships: { incoming: { [rel]: { limit: PAGE } } } }, opts).catch(
    () => null,
  );
  if (!res || "__error" in res) return null;
  const p = res.properties ?? {};
  const parts = res.relationships?.incoming?.[rel] ?? [];
  const issuers: RawRound["issuers"] = [];
  const investors: RawRound["investors"] = [];
  const roles = new Set<string>();
  for (const x of parts) {
    const role = String(x.properties?.role ?? "");
    roles.add(role);
    const entry = { id: x.id, name: x.name, entity_type: x.entity_type, isLead: x.properties?.is_lead === true };
    if (ISSUER_ROLES.has(role)) issuers.push(entry);
    else investors.push(entry);
  }
  const date = (kind === "PCFR" ? val(p, "event_date") : val(p, "announcement_date")) as string | undefined;
  const dateKey = kind === "PCFR" ? "event_date" : "announcement_date";
  const typeKey = kind === "PCFR" ? "round_type" : "round_label";
  const roundType = (val(p, typeKey) as string | undefined) ?? (kind === "FR" ? res.name : undefined);
  const allSources = [...srcOf(p, dateKey), ...srcOf(p, typeKey), ...srcOf(p, "transaction_value"), ...srcOf(p, "name")];
  return {
    id,
    kind,
    date: date ?? null,
    roundType: roundType && roundType !== "FINANCING_RAISED_OR_FACILITY_ENTERED" ? roundType : null,
    amount: (val(p, "transaction_value") as number | undefined) ?? null,
    currency: (val(p, "transaction_value_units") as string | undefined) ?? null,
    description: (val(p, "description") as string | undefined) ?? (res.description as string | undefined) ?? null,
    issuers,
    investors,
    roles: [...roles],
    sources: toSources(allSources, 5),
  };
}

const COMPANY_PROPS = ["name", "aliases", "description", "founding_date", "headquarters_address"];

/** Fetch a company profile plus its investor and round links. */
export async function fetchCompany(id: string, opts: CalaOptions = {}): Promise<RawCompany | null> {
  const res = await getEntity(
    id,
    {
      properties: COMPANY_PROPS,
      relationships: {
        incoming: { INVESTED_IN: { limit: PAGE } },
        outgoing: {
          OPERATES_IN_INDUSTRY: { limit: 20 },
          HAS_HEADQUARTERS_IN: { limit: 5 },
          IS_REGISTERED_IN: { limit: 5 },
          PARTICIPATES_IN_CORPORATE_EVENT: { limit: PAGE },
          PARTICIPATES_IN_FUNDING_ROUND: { limit: PAGE },
        },
      },
    },
    opts,
  ).catch(() => null);
  if (!res || "__error" in res) return null;
  const p = res.properties ?? {};
  const out = res.relationships?.outgoing ?? {};
  const inc = res.relationships?.incoming ?? {};
  const country =
    (out.HAS_HEADQUARTERS_IN ?? []).find((x) => x.entity_type === "Country")?.name ??
    (out.IS_REGISTERED_IN ?? []).find((x) => x.entity_type === "Country")?.name ??
    null;
  return {
    id: res.id,
    name: (val(p, "name") as string) ?? res.name,
    entity_type: res.entity_type,
    aliases: ((val(p, "aliases") as string[]) ?? []).filter((a) => typeof a === "string"),
    description: (val(p, "description") as string) ?? (res.description as string) ?? null,
    foundingDate: (val(p, "founding_date") as string) ?? null,
    country,
    industries: (out.OPERATES_IN_INDUSTRY ?? []).map((x) => x.name),
    investors: (inc.INVESTED_IN ?? []).map((x) => ({
      id: x.id,
      name: x.name,
      entity_type: x.entity_type,
      sources: toSources(x.properties?.sources),
    })),
    rounds: [
      ...(out.PARTICIPATES_IN_CORPORATE_EVENT ?? [])
        .filter((x) => x.entity_type === "PrivateCompanyFundingRound" || /ROUND|FINANCING/.test(x.name))
        .map((x) => ({
          id: x.id,
          kind: "PCFR" as const,
          role: String(x.properties?.role ?? ""),
          date: (x.properties?.event_date as string) ?? null,
        })),
      ...(out.PARTICIPATES_IN_FUNDING_ROUND ?? []).map((x) => ({
        id: x.id,
        kind: "FR" as const,
        role: String(x.properties?.role ?? ""),
        date: null,
      })),
    ],
  };
}

/** Does this entity look like an investor (has investment relationships)? */
export async function isInvestor(id: string, opts: CalaOptions = {}) {
  const intro = await introspect(id, opts).catch(() => null);
  const out = intro?.relationships?.outgoing ?? [];
  return out.includes("INVESTED_IN") || out.includes("PARTICIPATES_IN_FUNDING_ROUND") ||
    out.includes("PARTICIPATES_IN_CORPORATE_EVENT");
}

export { searchEntities };
