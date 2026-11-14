/**
 * v2 company profile: parsed from one entity retrieval (PROFILE_QUERY).
 * Pure functions; shared by the ingest, the live profile lookup and the Gmail domain lookup.
 */
import type { GetEntityResponse, CalaSource, RelatedEntity } from "./cala";

export type SourceRank = "FILING" | "PRIMARY" | "PRESS" | "AGGREGATOR";

export interface RankedSource {
  name: string;
  url: string;
  date: string | null;
  rank: SourceRank | null;
}

export interface Industry {
  code: string; // e.g. SOFTWARE_AND_SERVICES
  label: string | null; // the source's own label, e.g. "enterpriseSoftware"
}

export interface Person {
  name: string;
  role: string; // "CEO", "CTO", "VP", or the WORKS_AT role
  since: string | null;
}

export interface Profile {
  id: string;
  name: string;
  legalName: string | null;
  aliases: string[];
  website: string | null; // bare domain
  domains: string[]; // active + inactive
  description: string | null;
  industries: Industry[];
  country: string | null; // HQ country
  hqAddress: string | null;
  founding: { date: string; precision: string | null; sources: RankedSource[] } | null;
  fundingStage: string | null;
  status: string | null;
  investors: { id: string; name: string }[];
  fundingRounds: { id: string; role: string }[];
  slush: boolean;
  people: Person[];
  parents: { id: string; name: string; since: string | null }[];
}

export const SLUSH_2026 = "bc844d56-6ab4-452b-96bf-2661e86e592b";

/** Registries Cala reads founding dates from; their sources sometimes arrive without `source_rank`. */
const REGISTRY = /gleif|companies house|find-and-update\.company-information|inpi|ytj\.fi|prh\.fi|virre|bolagsverket|allabolag|brreg|brønnøysund|proff\.no|cvr\.dk|virk\.dk|ariregister|rik\.ee|lursoft|registrucentras|handelsregister|unternehmensregister|kvk\.nl|sec\.gov|edgar|opencorporates|infogreffe|sirene|insee|registro mercantil|cro\.ie|zefix/i;

export function rankOf(s: CalaSource & { source_rank?: string }): SourceRank | null {
  const r = (s.source_rank ?? "").toUpperCase();
  if (r === "FILING" || r === "PRIMARY" || r === "PRESS" || r === "AGGREGATOR") return r;
  if (REGISTRY.test(`${s.name ?? ""} ${s.document ?? ""}`)) return "FILING";
  return null;
}

export function rankedSources(xs: (CalaSource & { source_rank?: string })[] | undefined): RankedSource[] {
  const seen = new Set<string>();
  const out: RankedSource[] = [];
  for (const s of xs ?? []) {
    const url = s.document || "";
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ name: s.name || hostOf(url), url, date: s.date || null, rank: rankOf(s) });
  }
  return out;
}

export function hostOf(url: string) {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function bareDomain(x: string | null | undefined): string | null {
  if (!x) return null;
  const h = hostOf(x.trim().toLowerCase());
  return h && h.includes(".") ? h : null;
}

const COUNTRY_NAMES: [RegExp, string][] = [
  [/\b(finland|suomi|fi)$/i, "Finland"], [/\b(sweden|sverige|se)$/i, "Sweden"], [/\b(norway|norge|no)$/i, "Norway"],
  [/\b(denmark|danmark|dk)$/i, "Denmark"], [/\b(iceland|is)$/i, "Iceland"], [/\b(estonia|ee)$/i, "Estonia"],
  [/\b(united kingdom|uk|gb|england|scotland)$/i, "United Kingdom"], [/\b(germany|deutschland|de)$/i, "Germany"],
  [/\b(france|fr)$/i, "France"], [/\b(netherlands|nl)$/i, "Netherlands"], [/\b(united states|usa|us)$/i, "United States"],
  [/\b(spain|es)$/i, "Spain"], [/\b(italy|it)$/i, "Italy"], [/\b(ireland|ie)$/i, "Ireland"], [/\b(switzerland|ch)$/i, "Switzerland"],
  [/\b(lithuania|lt)$/i, "Lithuania"], [/\b(latvia|lv)$/i, "Latvia"], [/\b(poland|pl)$/i, "Poland"], [/\b(portugal|pt)$/i, "Portugal"],
  [/\b(belgium|be)$/i, "Belgium"], [/\b(austria|at)$/i, "Austria"], [/\b(israel|il)$/i, "Israel"], [/\b(canada|ca)$/i, "Canada"],
  [/\b(singapore|sg)$/i, "Singapore"], [/\b(japan|jp)$/i, "Japan"], [/\b(india|in)$/i, "India"], [/\b(ukraine|ua)$/i, "Ukraine"],
  [/\b(australia|au)$/i, "Australia"], [/\b(czech republic|czechia|cz)$/i, "Czechia"], [/\b(hungary|hu)$/i, "Hungary"],
];

/** Country from an address's last segment ("Kuopio, Finland", "... E14 5HX, GB"). */
export function countryFromAddress(addr: string | null | undefined): string | null {
  if (!addr) return null;
  const parts = addr.split(",").map((p) => p.trim()).filter(Boolean);
  for (const seg of [...parts].reverse().slice(0, 2)) {
    for (const [re, c] of COUNTRY_NAMES) if (re.test(seg)) return c;
  }
  return null;
}

type Props = Record<string, { value?: unknown; sources?: (CalaSource & { source_rank?: string; date_precision?: string })[] }>;

const v = (p: Props, k: string) => p[k]?.value;

export function parseProfile(res: GetEntityResponse): Profile {
  const p = (res.properties ?? {}) as Props;
  const out = res.relationships?.outgoing ?? {};
  const inc = res.relationships?.incoming ?? {};
  const rel = (o: Record<string, RelatedEntity[]>, k: string) => o[k] ?? [];

  const website = bareDomain(v(p, "website") as string | undefined);
  const domains = [...new Set([website, ...rel(out, "HAS_DOMAIN_NAME").map((d) => bareDomain(d.name))].filter(Boolean) as string[])];
  const hqAddress = (v(p, "headquarters_address") as string | undefined) ?? null;
  const country =
    rel(out, "HAS_HEADQUARTERS_IN").find((x) => x.entity_type === "Country")?.name ??
    countryFromAddress(hqAddress) ??
    rel(out, "IS_REGISTERED_IN").find((x) => x.entity_type === "Country")?.name ??
    null;

  let founding: Profile["founding"] = null;
  const fd = v(p, "founding_date") as string | undefined;
  if (fd && /^\d{4}-\d{2}-\d{2}$/.test(fd)) {
    const precision = (v(p, "founding_date__precision") as string | undefined) ?? p.founding_date?.sources?.find((s) => s.date_precision)?.date_precision ?? null;
    founding = { date: fd, precision, sources: rankedSources(p.founding_date?.sources) };
  }

  const people: Person[] = [];
  const add = (xs: RelatedEntity[], role: string | ((x: RelatedEntity) => string | null)) => {
    for (const x of xs) {
      if (x.entity_type !== "Person") continue;
      const until = x.properties?.valid_until as string | undefined;
      if (until) continue; // left the role
      const r = typeof role === "string" ? role : role(x);
      if (!r) continue;
      if (!people.some((q) => q.name === x.name)) people.push({ name: x.name, role: r, since: (x.properties?.valid_since as string) ?? null });
    }
  };
  add(rel(inc, "IS_CEO_OF"), "CEO");
  add(rel(inc, "IS_CTO_OF"), "CTO");
  add(rel(inc, "IS_VICEPRESIDENT_OF"), "VP");
  add(rel(inc, "WORKS_AT"), (x) => ((x.properties?.role as string) || null));

  return {
    id: res.id,
    name: (v(p, "name") as string) ?? res.name,
    legalName: (v(p, "legal_name") as string) ?? null,
    aliases: ((v(p, "aliases") as string[]) ?? []).filter((a) => typeof a === "string"),
    website,
    domains,
    description: (v(p, "description") as string) ?? (res.description as string) ?? null,
    industries: rel(out, "OPERATES_IN_INDUSTRY").map((x) => ({ code: x.name, label: (x.properties?.original_label as string) ?? null })),
    country,
    hqAddress,
    founding,
    fundingStage: (v(p, "funding_stage") as string) ?? null,
    status: (v(p, "operational_status") as string) ?? null,
    investors: rel(inc, "INVESTED_IN").filter((x) => x.entity_type !== "Person").map((x) => ({ id: x.id, name: x.name })),
    fundingRounds: rel(out, "PARTICIPATES_IN_FUNDING_ROUND").map((x) => ({ id: x.id, role: String(x.properties?.role ?? "") })),
    slush: rel(out, "PARTICIPATES_IN_EVENT").some((e) => e.id === SLUSH_2026),
    people,
    parents: [...rel(inc, "IS_DIRECT_PARENT_OF"), ...rel(inc, "IS_ULTIMATE_PARENT_OF")]
      .filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i)
      .map((x) => ({ id: x.id, name: x.name, since: (x.properties?.valid_since as string) ?? null })),
  };
}

/**
 * A founding date we'll alert on: day precision, from a registry (FILING), and not a
 * 1 January placeholder (Cala often stores year precision as YYYY-01-01).
 */
export function filingFounding(pr: Profile): { date: string; source: RankedSource } | null {
  const f = pr.founding;
  if (!f) return null;
  if (f.precision && f.precision !== "day") return null;
  if (f.date.endsWith("-01-01")) return null;
  const src = f.sources.find((s) => s.rank === "FILING");
  return src ? { date: f.date, source: src } : null;
}

/** "OURA HEALTH OY" -> "Oura Health", "Cerebras Systems Inc." -> "Cerebras Systems". Brand casing kept otherwise. */
export function prettyName(name: string): string {
  let n = name.replace(/\s*\((publ)\)$/i, "").trim();
  n = n.replace(/[,\s]+(oy|oyj|ab|ky|ltd\.?|limited|inc\.?|a\/s|as|asa|aps|ehf|gmbh|llc|plc|s\.?a\.?|b\.?v\.?|ou|oü|uab|sia|holding ab|holdings?)$/i, "").trim();
  n = n.replace(/\s+holding$/i, "").trim();
  if (n && n === n.toUpperCase() && /[A-Z]{4,}/.test(n)) n = n.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\b(Ai|Io)\b/g, (w) => w.toUpperCase());
  return n || name;
}
