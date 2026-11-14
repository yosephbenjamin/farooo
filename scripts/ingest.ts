/**
 * npm run ingest
 *
 * Seed funds -> resolve fund vehicles -> pull portfolio links (three relationship types)
 * -> hop through rounds to find issuers -> fetch company profiles -> clean and merge
 * -> write data/dataset.json and data/funds.json.
 *
 * Every Cala response is cached on disk, so re-runs are free and work offline (CALA_OFFLINE=1).
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { searchEntities, type CalaEntity } from "../src/lib/cala";
import { fetchCompany, fetchRound, isInvestor, vehicleLinks } from "../src/lib/graph";
import { normalizeCompany, normalizeFund, slug } from "../src/lib/normalize";
import { COUNTRY_WORDS, SEED_FUNDS, VEHICLE_DOMICILES, type SeedFund } from "../src/lib/seed";
import type { Company, Dataset, Investor, InvestorLink, LinkVia, RawCompany, RawRound, Round, Source } from "../src/lib/types";

const DATA = path.join(process.cwd(), "data");
const RECENT_ROUND_CUTOFF = "2024-06-01"; // company-side rounds older than this aren't fetched (not "why now" material)

const log = (...a: unknown[]) => console.log("[ingest]", ...a);
const P = Number(process.env.INGEST_POOL ?? 10);

// ---------- 1. resolve funds ----------
const BRAND_TAIL = new Set(["ventures", "venture", "capital", "partners", "vc", "management", "growth", "seed", "opportunities", "opportunity", "investments", "invest", "fund", "spring", "innovation", "collective"]);

function aliasMatch(seed: SeedFund, name: string): boolean {
  const nf = normalizeFund(name);
  for (const a of seed.aliases) {
    if (nf === a) return true;
    if (nf.startsWith(a + " ")) {
      const rest = nf.slice(a.length + 1).split(" ");
      if (rest.every((t) => BRAND_TAIL.has(t))) return true;
    }
  }
  return false;
}

function countriesMentioned(desc: string): string[] {
  const found: string[] = [];
  for (const [country, words] of Object.entries(COUNTRY_WORDS)) {
    if (words.some((w) => new RegExp(`(^|[^A-Za-z])${w.replace(/\./g, "\\.")}([^A-Za-z]|$)`).test(desc))) found.push(country);
  }
  return found;
}

interface Resolution {
  seed: string;
  slug: string;
  included: { id: string; name: string; entity_type: string; description: string | null }[];
  rejected: { id: string; name: string; reason: string }[];
}

async function resolveFunds(): Promise<Resolution[]> {
  const out: Resolution[] = [];
  for (const seed of SEED_FUNDS) {
    const terms = [seed.name, ...(seed.searches ?? [])];
    const cands = new Map<string, CalaEntity>();
    for (const t of terms) {
      for (const e of await searchEntities(t, { limit: 20 })) cands.set(e.id, e);
    }
    const res: Resolution = { seed: seed.name, slug: slug(seed.name), included: [], rejected: [] };
    for (const e of cands.values()) {
      const desc = e.description ?? "";
      if (e.entity_type === "Person") continue;
      if (!aliasMatch(seed, e.name)) continue; // silently skip unrelated names
      if (seed.exclude?.includes(e.id) || seed.excludeNames?.includes(normalizeFund(e.name))) {
        res.rejected.push({ id: e.id, name: e.name, reason: "excluded by hand" });
        continue;
      }
      const mentioned = countriesMentioned(desc);
      const allowed = new Set([...seed.countries, ...VEHICLE_DOMICILES]);
      const vehicleDomicile = VEHICLE_DOMICILES.some((d) => desc.includes(d));
      if (mentioned.length && !mentioned.some((c) => allowed.has(c)) && !vehicleDomicile) {
        res.rejected.push({ id: e.id, name: e.name, reason: `country: ${mentioned.join(", ")}` });
        continue;
      }
      if (!(await isInvestor(e.id))) {
        res.rejected.push({ id: e.id, name: e.name, reason: "no investment relationships" });
        continue;
      }
      res.included.push({ id: e.id, name: e.name, entity_type: e.entity_type, description: e.description ?? null });
    }
    log(`${seed.name}: ${res.included.length} vehicle(s)`, res.included.map((v) => v.name).join(" | "));
    out.push(res);
  }
  return out;
}

// ---------- helpers ----------
async function pool<T, R>(items: T[], n: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  let done = 0;
  const workers = Array.from({ length: n }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
      done++;
      if (done % 100 === 0) log(`  ${done}/${items.length}`);
    }
  });
  await Promise.all(workers);
  return out;
}

function mergeSources(a: Source[], b: Source[], max = 5): Source[] {
  const seen = new Set(a.map((s) => s.url));
  return [...a, ...b.filter((s) => !seen.has(s.url) && seen.add(s.url))].slice(0, max);
}

const FUNDISH_NAME = /\b(fund|fonden|ventures?|capital|partners|invest(ments)?|holding|kommanditbolag|ky)\b/i;
const FUNDISH_DESC = /(venture capital|investment fund|private equity|investment firm|asset management|fund of funds|investment company)/i;

function looksLikeFund(name: string, desc: string | null) {
  return FUNDISH_NAME.test(name) && FUNDISH_DESC.test(desc ?? "");
}

// ---------- main ----------
async function main() {
  await mkdir(DATA, { recursive: true });
  const resolutions = await resolveFunds();

  const investors: Investor[] = resolutions
    .filter((r) => r.included.length)
    .map((r) => ({ id: r.slug, name: r.seed, vehicles: r.included }));
  const vehicleToInvestor = new Map<string, string>();
  for (const inv of investors) for (const v of inv.vehicles) vehicleToInvestor.set(v.id, inv.id);
  const aliasToInvestor = new Map<string, string>();
  for (const s of SEED_FUNDS) for (const a of s.aliases) aliasToInvestor.set(a, slug(s.name));
  const investorByName = (name: string): string | undefined => {
    const seed = SEED_FUNDS.find((s) => aliasMatch(s, name));
    return seed && investors.some((i) => i.id === slug(seed.name)) ? slug(seed.name) : undefined;
  };

  // ---------- 2. vehicle links ----------
  type Link = { investorId: string; via: LinkVia; sources: Source[] };
  const links = new Map<string, Link[]>(); // cala company id -> links
  const addLink = (cid: string, l: Link) => {
    const arr = links.get(cid) ?? [];
    arr.push(l);
    links.set(cid, arr);
  };
  const roundRefs = new Map<string, "PCFR" | "FR">();
  const vehicles = investors.flatMap((inv) => inv.vehicles.map((v) => ({ inv, v })));
  log(`pulling links for ${vehicles.length} vehicles`);
  await pool(vehicles, P, async ({ inv, v }) => {
    const l = await vehicleLinks(v.id);
    for (const x of l.invested) {
      if (x.entity_type === "Person") continue;
      addLink(x.id, { investorId: inv.id, via: "fund→company", sources: toSrc(x.properties?.sources) });
    }
    for (const x of l.corporateEvents) roundRefs.set(x.id, "PCFR");
    for (const x of l.fundingRounds) roundRefs.set(x.id, "FR");
  });
  log(`${links.size} companies from INVESTED_IN, ${roundRefs.size} rounds`);

  // ---------- 3. rounds -> issuers ----------
  const rawRounds = new Map<string, RawRound>();
  const fetchRounds = async (refs: [string, "PCFR" | "FR"][]) => {
    const todo = refs.filter(([id]) => !rawRounds.has(id));
    const got = await pool(todo, P, ([id, kind]) => fetchRound(id, kind));
    got.forEach((r) => r && rawRounds.set(r.id, r));
  };
  await fetchRounds([...roundRefs.entries()]);
  const unknownRoles = new Set<string>();
  for (const r of rawRounds.values()) {
    for (const role of r.roles) if (!["INVESTOR", "ISSUER"].includes(role)) unknownRoles.add(role);
    const seedInvs = new Set<string>();
    for (const i of r.investors) {
      const s = vehicleToInvestor.get(i.id) ?? investorByName(i.name);
      if (s) seedInvs.add(s);
    }
    for (const iss of r.issuers) {
      if (iss.entity_type === "Person") continue;
      for (const s of seedInvs) addLink(iss.id, { investorId: s, via: "round", sources: r.sources });
    }
  }
  if (unknownRoles.size) log("round roles seen besides INVESTOR/ISSUER:", [...unknownRoles]);
  log(`${links.size} companies after round hop`);

  // ---------- 4. company profiles ----------
  const ids = [...links.keys()];
  const rawCompanies = new Map<string, RawCompany>();
  (await pool(ids, P, (id) => fetchCompany(id))).forEach((c) => c && rawCompanies.set(c.id, c));
  log(`${rawCompanies.size}/${ids.length} company profiles`);

  // company-side investor links (union both directions)
  let nameMatched = 0;
  const others = new Map<string, Map<string, string>>();
  for (const c of rawCompanies.values()) {
    for (const i of c.investors) {
      const viaVehicle = vehicleToInvestor.get(i.id);
      const s = viaVehicle ?? investorByName(i.name);
      if (s) {
        if (!viaVehicle) nameMatched++;
        addLink(c.id, { investorId: s, via: "company→fund", sources: i.sources });
      } else {
        const m = others.get(c.id) ?? new Map();
        m.set(i.id, i.name);
        others.set(c.id, m);
      }
    }
  }
  log(`${nameMatched} company→fund links matched by name (vehicle not in resolution)`);

  // recent company rounds (the "why now" material)
  const recentRefs: [string, "PCFR" | "FR"][] = [];
  for (const c of rawCompanies.values()) {
    for (const r of c.rounds) {
      if (r.kind === "PCFR" && r.date && r.date < RECENT_ROUND_CUTOFF) continue;
      recentRefs.push([r.id, r.kind]);
    }
  }
  log(`fetching ${recentRefs.length} company-side rounds`);
  await fetchRounds(recentRefs);

  // ---------- 5. merge duplicates ----------
  const fundLike: string[] = [];
  const keep = [...rawCompanies.values()].filter((c) => {
    if (looksLikeFund(c.name, c.description) || vehicleToInvestor.has(c.id) || investorByName(c.name)) {
      fundLike.push(c.name);
      return false;
    }
    return true;
  });
  log(`dropped ${fundLike.length} fund-like targets (fund-of-funds links)`);

  // union-find over normalized names + aliases
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    while (parent.get(x) !== x) x = parent.get(x)!;
    return x;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));
  keep.forEach((c) => parent.set(c.id, c.id));
  const byKey = new Map<string, RawCompany>();
  const merges: string[][] = [];
  for (const c of keep) {
    const keys = new Set([normalizeCompany(c.name), ...c.aliases.map(normalizeCompany).filter((k) => k.length >= 4)]);
    for (const k of keys) {
      if (!k) continue;
      const prev = byKey.get(k);
      if (prev && find(prev.id) !== find(c.id)) {
        if (prev.country && c.country && prev.country !== c.country) continue; // same name, different country: keep apart
        union(c.id, prev.id);
        merges.push([prev.name, c.name]);
      } else if (!prev) byKey.set(k, c);
    }
  }
  const groups = new Map<string, RawCompany[]>();
  for (const c of keep) {
    const r = find(c.id);
    groups.set(r, [...(groups.get(r) ?? []), c]);
  }
  log(`${keep.length} company records -> ${groups.size} companies (${merges.length} merges)`);

  const companies: Record<string, Company> = {};
  const idIndex: Dataset["idIndex"] = {};
  for (const inv of investors) for (const v of inv.vehicles) idIndex[v.id] = { kind: "investor", id: inv.id };

  const boiler = (d: string | null) => !d || /^(A |An )?[A-Z][a-z]+ (company|firm|business)\b/.test(d);
  for (const members of groups.values()) {
    // canonical: most links, then shortest name (brand over legal name)
    members.sort((a, b) => (links.get(b.id)?.length ?? 0) - (links.get(a.id)?.length ?? 0) || a.name.length - b.name.length);
    const canon = members[0];
    const displayName = [...members].sort((a, b) => a.name.length - b.name.length)[0].name;
    const best = members.find((m) => !boiler(m.description)) ?? canon;
    const invMap = new Map<string, InvestorLink>();
    for (const m of members) {
      for (const l of links.get(m.id) ?? []) {
        const cur = invMap.get(l.investorId) ?? { investorId: l.investorId, via: [], sources: [] };
        if (!cur.via.includes(l.via)) cur.via.push(l.via);
        cur.sources = mergeSources(cur.sources, l.sources);
        invMap.set(l.investorId, cur);
      }
    }
    const otherInv = new Map<string, string>();
    for (const m of members) for (const [i, n] of others.get(m.id) ?? []) otherInv.set(i, n);
    const roundIds = [...new Set(members.flatMap((m) => m.rounds.map((r) => r.id)))].filter((id) => rawRounds.has(id));
    // also rounds where a member is an issuer (from the fund side)
    for (const r of rawRounds.values()) if (r.issuers.some((i) => members.some((m) => m.id === i.id)) && !roundIds.includes(r.id)) roundIds.push(r.id);
    companies[canon.id] = {
      id: canon.id,
      ids: members.map((m) => m.id),
      name: displayName.replace(/\s+\((publ)\)$/i, ""),
      aliases: [...new Set(members.flatMap((m) => [m.name, ...m.aliases]))].filter((a) => a !== displayName),
      description: best.description,
      industries: [...new Set(members.flatMap((m) => m.industries))],
      country: members.find((m) => m.country)?.country ?? null,
      foundingDate: members.find((m) => m.foundingDate)?.foundingDate ?? null,
      investors: [...invMap.values()].filter((l) => investors.some((i) => i.id === l.investorId)),
      otherInvestors: [...otherInv.entries()].map(([id, name]) => ({ id, name })).slice(0, 40),
      roundIds,
    };
    for (const m of members) idIndex[m.id] = { kind: "company", id: canon.id };
  }

  // ---------- 6. rounds + keyrings ----------
  const rounds: Record<string, Round> = {};
  for (const r of rawRounds.values()) {
    const issuer = r.issuers.map((i) => idIndex[i.id]).find((x) => x?.kind === "company");
    rounds[r.id] = {
      id: r.id,
      kind: r.kind,
      companyId: issuer?.id ?? null,
      date: r.date,
      roundType: r.roundType,
      amount: r.amount,
      currency: r.currency,
      investorIds: [...new Set(r.investors.map((i) => vehicleToInvestor.get(i.id) ?? investorByName(i.name)).filter(Boolean) as string[])],
      investorNames: r.investors.map((i) => i.name),
      sources: r.sources,
    };
  }
  const keyrings: Record<string, string[]> = {};
  for (const inv of investors) keyrings[inv.id] = [];
  for (const c of Object.values(companies)) for (const l of c.investors) keyrings[l.investorId]?.push(c.id);

  const dataset: Dataset = { generatedAt: new Date().toISOString(), investors, companies, rounds, keyrings, idIndex };
  await writeFile(path.join(DATA, "dataset.json"), JSON.stringify(dataset));
  await writeFile(path.join(DATA, "funds.json"), JSON.stringify(resolutions, null, 2));
  const report = {
    generatedAt: dataset.generatedAt,
    investors: investors.length,
    vehicles: vehicles.length,
    companies: Object.keys(companies).length,
    rounds: Object.keys(rounds).length,
    keyringSizes: Object.fromEntries(Object.entries(keyrings).map(([k, v]) => [k, v.length]).sort((a, b) => (b[1] as number) - (a[1] as number))),
    unresolvedSeeds: resolutions.filter((r) => !r.included.length).map((r) => r.seed),
    oneDirectional: countDirections(companies),
    merges: merges.slice(0, 200),
    droppedFundLike: fundLike.slice(0, 200),
    nameMatchedLinks: nameMatched,
    roundsWithoutDate: Object.values(rounds).filter((r) => !r.date).length,
    roundsWithoutIssuer: Object.values(rounds).filter((r) => !r.companyId).length,
  };
  await writeFile(path.join(DATA, "ingest-report.json"), JSON.stringify(report, null, 2));
  log("done", JSON.stringify({ ...report, merges: report.merges.length, droppedFundLike: report.droppedFundLike.length }, null, 1));
}

function countDirections(companies: Record<string, Company>) {
  let fundOnly = 0, companyOnly = 0, both = 0, roundOnly = 0;
  for (const c of Object.values(companies))
    for (const l of c.investors) {
      const f = l.via.includes("fund→company"), co = l.via.includes("company→fund");
      if (f && co) both++;
      else if (f) fundOnly++;
      else if (co) companyOnly++;
      else roundOnly++;
    }
  return { both, fundOnly, companyOnly, roundOnly };
}

function toSrc(xs: { date?: string | null; document?: string | null; name?: string | null }[] | undefined): Source[] {
  return (xs ?? []).filter((s) => s.document).slice(0, 4).map((s) => ({ name: s.name ?? "", url: s.document!, date: s.date ?? null }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
