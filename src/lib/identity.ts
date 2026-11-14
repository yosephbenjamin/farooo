/**
 * Who is the user? From a startup name (web, asked once) or an email domain (Gmail).
 * Search -> profile retrieval -> pick by website. Results are cached like every Cala call.
 */
import { searchEntities } from "./cala";
import { fetchProfileRaw } from "./graph";
import { normalizeCompany } from "./normalize";
import { parseProfile, bareDomain, type Profile } from "./profile";
import { investorKey, type StartupSummary } from "./doors";
import type { Dataset } from "./types";

const NORDIC = new Set(["Finland", "Sweden", "Norway", "Denmark", "Iceland", "Estonia"]);
const PUBLIC_MAIL = /^(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|proton|protonmail|aol|gmx)\./i;

async function profilesFor(ids: string[]): Promise<Profile[]> {
  const out: Profile[] = [];
  for (const id of ids) {
    const r = await fetchProfileRaw(id);
    if (r && !("__error" in r)) out.push(parseProfile(r));
  }
  return out;
}

/** Profile from a name: exact (brand or legal) matches first, then the richest record. */
export async function resolveByName(name: string, pool?: Record<string, Profile>): Promise<Profile | null> {
  const key = normalizeCompany(name);
  if (pool) {
    const hit = Object.values(pool).filter((p) => [p.name, p.legalName ?? "", ...p.aliases].map(normalizeCompany).includes(key));
    if (hit.length) return richest(hit);
  }
  const cands = await searchEntities(name, { types: ["Company"], limit: 10 }).catch(() => []);
  const exact = cands.filter((c) => normalizeCompany(c.name) === key || normalizeCompany(c.name).startsWith(key + " "));
  const profiles = await profilesFor(exact.slice(0, 3).map((c) => c.id));
  return profiles.length ? richest(profiles) : null;
}

/** Profile from an email domain: the company whose website or domains include it. */
export async function resolveByDomain(email: string, pool?: Record<string, Profile>): Promise<Profile | null> {
  const domain = bareDomain(email.includes("@") ? email.split("@")[1] : email);
  if (!domain || PUBLIC_MAIL.test(domain)) return null;
  if (pool) {
    const hit = Object.values(pool).filter((p) => p.domains.includes(domain));
    if (hit.length) return richest(hit);
  }
  const label = domain.split(".").slice(-2, -1)[0] ?? domain;
  const cands = await searchEntities(label, { types: ["Company"], limit: 10 }).catch(() => []);
  const profiles = await profilesFor(cands.slice(0, 4).map((c) => c.id));
  const hit = profiles.filter((p) => p.domains.includes(domain));
  return hit.length ? richest(hit) : null;
}

/** Prefer records with a website, industry, investors and a Nordic HQ. */
function richest(ps: Profile[]): Profile {
  const score = (p: Profile) =>
    (p.website ? 4 : 0) + (p.industries.length ? 3 : 0) + Math.min(p.investors.length, 5) + (p.country && NORDIC.has(p.country) ? 2 : 0) + (p.slush ? 1 : 0);
  return [...ps].sort((a, b) => score(b) - score(a))[0];
}

/** The startup as the door engine sees it. Investors: Cala's INVESTED_IN plus seed-fund keyrings. */
export function summarize(p: Profile, ds: Dataset | null, displayName?: string, resolvedFrom: StartupSummary["resolvedFrom"] = "cala"): StartupSummary {
  const inv = new Map<string, string>();
  for (const i of p.investors) inv.set(investorKey(i.name), i.name);
  if (ds) {
    const c = Object.values(ds.companies).find((x) => x.ids.includes(p.id) || normalizeCompany(x.name) === normalizeCompany(p.name));
    for (const l of c?.investors ?? []) {
      const name = ds.investors.find((i) => i.id === l.investorId)?.name ?? l.investorId;
      inv.set(l.investorId, name);
    }
  }
  return {
    id: p.id,
    name: displayName ?? p.name,
    country: p.country,
    industries: p.industries,
    investors: [...inv.entries()].map(([key, name]) => ({ key, name })),
    resolvedFrom,
  };
}
