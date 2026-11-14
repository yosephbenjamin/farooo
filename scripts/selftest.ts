// npm test: checks for the pure functions everything else leans on.
import assert from "node:assert/strict";
import { normalizeCompany, normalizeFund } from "../src/lib/normalize";
import { concreteDateInText, concreteDateInUrl, isPlaceholderDate } from "../src/lib/dates";
import { heuristic, JOB_SOURCE, claimedCountry } from "../src/lib/news";
import { aliasMatch, SEED_FUNDS } from "../src/lib/seed";
import { partnerTypes, industryWords, checkIndustries, isBoilerplate } from "../src/lib/partner";
import { countryFromAddress, filingFounding, rankOf, type Profile } from "../src/lib/profile";
import { buildReport, firstLook, rankDoors, tierOf, xrayLink, prettyRound, NO_TAPS, type Pool } from "../src/lib/doors";
import { applyTap, parseTaps, serializeTaps } from "../src/lib/taps";
import { parseSignals, EMPLOYEES_METRIC } from "../src/lib/signals";

const seed = (n: string) => SEED_FUNDS.find((f) => f.name === n)!;
assert.equal(normalizeCompany("Carbo Culture Oy"), "carbo culture");
assert.equal(normalizeFund("Lifeline Ventures Fund II Ky"), "lifeline ventures");
assert.ok(aliasMatch(seed("byFounders"), "byFounders Collective"));
assert.ok(!aliasMatch(seed("Heartcore Capital"), "HeartCore Inc."));
assert.equal(concreteDateInText("10 Nov 2026"), "2026-11-10");
assert.equal(concreteDateInText("Oct 2026"), null);
assert.equal(concreteDateInUrl("https://tech.eu/2026/11/07/foo"), "2026-11-07");
assert.ok(isPlaceholderDate("Recent"));
assert.equal(prettyRound("SERIES_A"), "Series A");

// profiles
assert.equal(countryFromAddress("Kuopio, Finland"), "Finland");
assert.equal(countryFromAddress("30 SOUTH COLONNADE, LONDON, GB-LND, E14 5HX, GB"), "United Kingdom");
assert.equal(rankOf({ name: "GLEIF", document: "https://search.gleif.org/#/record/x" }), "FILING");
assert.equal(rankOf({ name: "x", document: "y", source_rank: "PRESS" } as never), "PRESS");
const base: Profile = {
  id: "x", name: "X", legalName: null, aliases: [], website: null, domains: [], description: null, industries: [], country: null,
  hqAddress: null, founding: null, fundingStage: null, status: null, investors: [], fundingRounds: [], slush: false, people: [], parents: [],
};
const f = (date: string, rank: "FILING" | "AGGREGATOR") => ({ ...base, founding: { date, precision: "day", sources: [{ name: "r", url: "u", date: null, rank }] } });
assert.ok(filingFounding(f("2026-08-07", "FILING")));
assert.equal(filingFounding(f("2026-01-01", "FILING")), null, "1 January is a year placeholder");
assert.equal(filingFounding(f("2026-08-07", "AGGREGATOR")), null, "not a registry");

// partnership types: structured fields only
const sw = { code: "SOFTWARE_AND_SERVICES", label: "ai" };
assert.equal(industryWords({ code: "SOFTWARE_AND_SERVICES", label: "enterpriseSoftware" }), "enterprise software");
assert.deepEqual(partnerTypes({ you: { name: "A", industries: [sw], country: "Finland" }, door: { name: "B", industries: [sw], country: "Germany" }, entering: true, market: "Finland" }), [], "same code + same label = competitor");
const t = partnerTypes({ you: { name: "A", industries: [sw], country: "Finland" }, door: { name: "B", industries: [{ code: "SOFTWARE_AND_SERVICES", label: "cyber" }], country: "Germany" }, entering: true, market: "Finland" }).map((x) => x.type);
assert.ok(t.includes("integration") && t.includes("distribution"));

// engine: tiers, drop without reason, first look of different types
const prof = (id: string, extra: Partial<Profile>): Profile => ({ ...base, id, name: id, ...extra });
const pool: Pool = {
  profiles: {
    p1: prof("p1", { industries: [{ code: "SOFTWARE_AND_SERVICES", label: "cyber" }], country: "Germany", slush: true, investors: [{ id: "i", name: "Creandum" }] }),
    p2: prof("p2", { industries: [{ code: "TRANSPORTATION_AND_LOGISTICS", label: null }], country: "France" }),
    p3: prof("p3", { industries: [], country: "Spain" }),
  },
  entries: [
    { id: "e1", kind: "subsidiary", doorId: "p1", doorName: "p1", local: { id: "l1", name: "P1 Finland Oy" }, market: "Finland", date: "2026-10-01", source: { name: "PRH", url: "u", date: null, rank: "FILING" }, match: "website" },
    { id: "e2", kind: "news", doorId: "p2", doorName: "p2", local: null, market: "Finland", date: "2026-11-01", source: { name: "n", url: "u", date: null, rank: "PRESS" }, match: "news" },
    { id: "e3", kind: "news", doorId: "p3", doorName: "p3", local: null, market: "Finland", date: "2026-11-01", source: { name: "n", url: "u", date: null, rank: "PRESS" }, match: "news" },
  ],
  rounds: [],
  slush: { ids: [], names: [] },
};
const r = buildReport(pool, { id: "me", name: "Me", country: "Finland", industries: [sw], investors: [{ key: "creandum", name: "Creandum" }], resolvedFrom: "cala" }, { now: "2026-11-14" });
assert.equal(r.doors.length, 2, "p3 has no industry: no real reason, dropped");
const ranked = rankDoors(r.doors, parseTaps(null));
assert.equal(ranked[0].id, "p1");
assert.equal(tierOf(ranked[0]), 1);
assert.equal(tierOf(ranked[1]), 2);
assert.equal(tierOf({ ...ranked[0], slush: false }), 1, "Slush is a boost, not a tier");
assert.equal(tierOf({ ...ranked[0], warm: [] }), 2, "no warm path: tier 2, Slush or not");
{
  const base0 = { ...ranked[1], warm: [], giant: false };
  const a = { ...base0, id: "a", slush: false, whyNow: { ...base0.whyNow, date: "2026-11-10" } };
  const b = { ...base0, id: "b", slush: true, whyNow: { ...base0.whyNow, date: "2026-10-01" } };
  assert.equal(rankDoors([a, b], NO_TAPS)[0].id, "b", "Slush boosts within a tier");
  assert.equal(rankDoors([a, { ...b, warm: [] }, { ...a, id: "c", warm: [{ investor: "X", led: false }], slush: false }], NO_TAPS)[0].id, "c", "a warm path beats Slush");
}
const fl = firstLook(r.doors);
assert.equal(new Set(fl.map((x) => x.type)).size, fl.length, "first look: different partnership types");
const tapped = applyTap(parseTaps(null), "customer", "notnow", "p2");
assert.ok(!rankDoors(r.doors, parseTaps(serializeTaps(tapped))).some((d) => d.id === "p2"));
assert.ok(xrayLink("Acme", "Finland", "integration").startsWith("https://www.google.com/search?q=site%3Alinkedin.com%2Fin"));

// industry codes that contradict the description (atNorth: a data-centre operator coded FINTECH)
const fin = [{ code: "FINTECH", label: null }];
const boiler = "Swedish fintech company founded in 2018, headquartered in Kista, Stockholm.";
assert.ok(isBoilerplate(boiler), "generated from the code: no evidence of its own");
assert.ok(!isBoilerplate("Develops AI-centric drones for maritime surveillance."));
const at = checkIndustries(fin, boiler, "atNorth announced in October 2026 plans to develop a new data centre (FIN05) in Salo, Finland, with an expected investment of about €2 billion.");
assert.equal(at.drop, false);
assert.deepEqual(at.uncertain, { coded: "fintech", read: "data centres" });
assert.equal(at.industries[0].code, "INTERNET_AND_WEB_SERVICES");
assert.equal(checkIndustries(fin, "Runs a neobank and payments app for freelancers.").uncertain, null, "consistent: keep the code");
assert.equal(checkIndustries(fin, boiler).uncertain, null, "description silent: keep the code");
assert.ok(checkIndustries(fin, "Makes drones and runs data centres.").drop, "contradicted and unclear: drop");
const verda = { id: "v", name: "Verda", country: "Finland", industries: [{ code: "SOFTWARE_AND_SERVICES", label: "ai" }], investors: [], resolvedFrom: "cala" as const };
const atPool: Pool = {
  profiles: { an: prof("an", { industries: fin, country: "Sweden", description: boiler }), mx: prof("mx", { industries: fin, country: "Sweden", description: "Makes drones and runs data centres." }) },
  entries: [
    { id: "a1", kind: "news", doorId: "an", doorName: "atNorth", local: null, market: "Finland", date: "2026-10-05", source: { name: "n", url: "u", date: null, rank: null }, match: "news", claim: "atNorth plans to develop a new data centre in Salo, Finland." },
    { id: "a2", kind: "news", doorId: "mx", doorName: "Mixed", local: null, market: "Finland", date: "2026-10-05", source: { name: "n", url: "u", date: null, rank: null }, match: "news" },
  ],
  rounds: [],
  slush: { ids: [], names: [] },
};
const ar = buildReport(atPool, verda, { now: "2026-11-14" });
assert.deepEqual(ar.doors.map((d) => d.id), ["an"], "the unclear door is dropped");
assert.ok(ar.doors[0].industryNote, "marked uncertain");
assert.ok(ar.doors[0].whyYou.some((w) => /data centres/.test(w.sentence)), "why-you from the description");

// news claims: phrasings, job boards, odd hyphens
const claim = (text: string, url = "https://press.example.com/2026/11/10/x", knowbit = "") => heuristic({ index: 0, market: "Denmark", text, url, sourceName: "x", knowbit });
assert.equal(claim("Avanza appointed Christian Sillesen as country manager for Denmark on 12 October 2026.", undefined, "In April, Avanza announced its intention to establish operations in Denmark.").company, "Avanza", "a country manager for a new presence");
assert.ok(!claim("Amazon appointed Julian Tydeman as Country Manager for Sweden, announced on 9 November 2026.", undefined, "He was part of the team that launched Amazon.se in 2020.").isEntry, "history is not novelty");
assert.ok(!claim("Crusoe entered the Norwegian market by partnering with Polar Data Centers on 21 October 2026.").isEntry, "a partnership is not an entry");
assert.equal(claim("Advantech, a Taiwanese industrial technology firm, opened a new Nordic office in Stockholm on September 10, 2026.").company, "Advantech", "appositive lead");
assert.equal(claimedCountry("Ukrainian defence firm Fire Point announced plans to open an office in Copenhagen.", "Fire Point"), "Ukraine");
assert.equal(claimedCountry("Advantech, a Taiwanese industrial technology firm, opened a new Nordic office in Stockholm.", "Advantech"), "Taiwan");
assert.equal(claimedCountry("Arondite announced it is opening its first international office in Oslo.", "Arondite"), null);
assert.ok(claim("atNorth expanded into Norway on 9 June 2026 by acquiring land for the NOR01 data centre campus.").isEntry, "buying land for a site is an entry");
assert.ok(!claim("Kry expanded in Sweden on 3 June 2026 by acquiring Medinord.").isEntry, "buying a company is not");
assert.ok(!claim("Databricks announced on November 10, 2026 that it will invest over $500 million in the Netherlands, expanding its largest European R&D hub in Amsterdam.").isEntry, "an incumbent growing is not entering");
assert.ok(claim("Avanza announced Christian Sillesen as Country Manager for Avanza in Denmark, starting 12 October 2026.", undefined, "He will lead efforts to build Avanza's presence and offering in the Danish market.").isEntry, "building a presence is new");
assert.ok(!claim("SEB appointed Niina Äikäs as Country Manager of SEB in Finland, effective 1 September 2026.").isEntry, "a replacement country manager is not an entry");
assert.ok(claim("Acme launched in Germany on 3 November 2026.").isEntry, "launches in DE");
assert.ok(!claim("Euro Tech Holdings entered Norway through a 50/50 joint\u2011venture with Sea Clean AS.").isEntry, "non-breaking hyphen joint venture");
assert.ok(JOB_SOURCE.test("https://jobs.uber.com/en/jobs/156150") && !JOB_SOURCE.test("https://tech.eu/2026/11/06/vensum"));
assert.ok(!claim("Uber is launching Uber Direct in Denmark.", "https://jobs.uber.com/en/jobs/1").isEntry, "a vacancy is not an announcement");

// north-star reasons: new hires (executives, headcount jump), new acquisitions, new money
const src = [{ name: "x", document: "https://example.com/a", date: "2026-10-01" }];
const sig = parseSignals({
  id: "c1", name: "C1", entity_type: "Company",
  relationships: {
    incoming: { IS_CTO_OF: [{ id: "p1", name: "Ada L", entity_type: "Person", properties: { valid_since: "2026-09-15", sources: src } }, { id: "p2", name: "Old Boss", entity_type: "Person", properties: { valid_since: "2026-09-01", valid_until: "2026-10-01", sources: src } }] },
    outgoing: { PARTICIPATES_IN_CORPORATE_EVENT: [
      { id: "e1", name: "MNA_COMPLETED", entity_type: "CorporateEvent", properties: { role: "ACQUIRER", event_date: "2026-10-20", sources: src } },
      { id: "e2", name: "MNA_COMPLETED", entity_type: "CorporateEvent", properties: { role: "TARGET", event_date: "2026-10-21", sources: src } },
      { id: "e3", name: "FINANCING_RAISED_OR_FACILITY_ENTERED", entity_type: "CorporateEvent", properties: { role: "ISSUER", event_date: "2026-11-02", sources: src } },
    ] },
  },
  numerical_observations: [{ id: EMPLOYEES_METRIC, data: [{ time: "2024-12-31T00:00:00Z", value: 20 }, { time: "2025-12-31T00:00:00Z", value: 31, origin: { name: "finder.fi", url: "https://finder.fi/x" } }] }],
} as never);
assert.deepEqual(sig.map((e) => e.kind).sort(), ["acquisition", "exec", "headcount", "money"], "one of each; a target role and a past executive don't count");
assert.equal(sig.find((e) => e.kind === "headcount")!.text, "grew from 20 to 31 people");
const sigPool: Pool = {
  profiles: {
    m1: prof("m1", { industries: [{ code: "FINTECH", label: "fintech" }], country: "Finland", investors: [{ id: "i", name: "Creandum" }] }),
    g1: prof("g1", { industries: [{ code: "FINTECH", label: "fintech" }], country: "Finland", investors: [{ id: "i", name: "Creandum" }], description: "A publicly traded bank listed on Nasdaq Helsinki." }),
    h1: prof("h1", { industries: [{ code: "HEALTHCARE_PROVIDERS", label: null }], country: "Finland" }),
  },
  entries: [], rounds: [], slush: { ids: [], names: [] },
  events: [
    { id: "a", companyId: "m1", kind: "acquisition", date: "2026-10-20", text: "acquired Foo", source: { name: "x", url: "https://x", date: null, rank: "PRESS" } },
    { id: "b", companyId: "g1", kind: "money", date: "2026-11-10", text: "raised a round", source: { name: "x", url: "https://x", date: null, rank: "PRESS" } },
    { id: "c", companyId: "h1", kind: "exec", date: "2026-09-15", text: "named Ada L CTO", source: { name: "x", url: "https://x", date: null, rank: "PRESS" } },
    { id: "d", companyId: "h1", kind: "exec", date: "2025-01-15", text: "named Too Old CEO", source: { name: "x", url: "https://x", date: null, rank: "PRESS" } },
  ],
};
const sr = buildReport(sigPool, { id: "me", name: "Me", country: "Finland", industries: [sw], investors: [{ key: "creandum", name: "Creandum" }], resolvedFrom: "cala" }, { now: "2026-11-14" });
const sranked = rankDoors(sr.doors, NO_TAPS);
assert.equal(sranked.length, 3);
assert.equal(sranked[0].id, "m1", "no giants as headlines: the listed bank (newer) doesn't lead");
assert.equal(tierOf(sranked.find((d) => d.id === "m1")!), 1, "a reason + warm path");
assert.equal(tierOf(sranked.find((d) => d.id === "h1")!), 2, "a reason without a warm path");
assert.equal(sranked.find((d) => d.id === "h1")!.whyNow.text, "named Ada L CTO", "old executives are outside the window");
console.log("selftest ok");
