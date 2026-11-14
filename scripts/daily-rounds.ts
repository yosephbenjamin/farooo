/**
 * npm run daily  (M3a)
 *
 * 1. Ask Cala's query layer for recent Nordic/European rounds (slow: ~50 s per call; rows have no sources).
 * 2. Verify each row: resolve the company, look for a matching dated round with sources in the
 *    entity graph; failing that, ask /knowledge/search for a sourced claim.
 * 3. Keep only concrete dates with a source URL. Match against cached keyrings.
 * 4. Save "door opened" events to data/events.json.
 */
import { createHash } from "node:crypto";
import { knowledgeQuery, knowledgeSearch, searchEntities, type SearchAnswer } from "../src/lib/cala";
import { concreteDateInText, concreteDateInUrl, isPlaceholderDate, monthInText } from "../src/lib/dates";
import { fmtAmount, isConcreteDate, pickSource, findInDataset } from "../src/lib/doors";
import { fetchCompany, fetchRound, hostOf } from "../src/lib/graph";
import { loadDataset, saveEvents, today, writeJson } from "../src/lib/data";
import { normalizeCompany } from "../src/lib/normalize";
import { SEED_FUNDS, aliasMatch } from "../src/lib/seed";
import { slug } from "../src/lib/normalize";
import type { FaroEvent } from "../src/lib/events";

const log = (...a: unknown[]) => console.log("[daily]", ...a);
const WINDOW_DAYS = 120;

type Row = Record<string, unknown>;
const pickField = (r: Row, keys: string[]) => {
  for (const k of Object.keys(r)) if (keys.includes(k.toLowerCase())) return r[k] == null ? null : String(r[k]);
  return null;
};

function monthName(d: Date) {
  return d.toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
}

async function main() {
  const ds = loadDataset();
  const now = today();
  const nowD = new Date(now + "T00:00:00Z");
  const prev = new Date(Date.UTC(nowD.getUTCFullYear(), nowD.getUTCMonth() - 1, 1));
  const cutoff = new Date(nowD.getTime() - WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
  const months = [`${monthName(prev)} ${prev.getUTCFullYear()}`, `${monthName(nowD)} ${nowD.getUTCFullYear()}`];

  const queries: string[] = [];
  for (const c of ["Finland", "Sweden", "Norway", "Denmark"])
    queries.push(`Startup funding rounds announced in ${c} in ${months[0]} and ${months[1]}: company, date, amount, round, investors, sector`);
  queries.push(`Nordic startups that raised venture funding in the last 30 days before ${now}: company, exact date, amount, round, investors`);
  queries.push(`European startup funding rounds above €10M announced in ${months[1]}: company, country, date, amount, round, investors`);
  for (const f of SEED_FUNDS)
    queries.push(`Funding rounds in ${months[0]} or ${months[1]} where ${f.name} invested: company, date, amount, round, other investors`);

  log(`${queries.length} queries (slow; cached after the first run)`);
  const rows: { row: Row; mentions: Map<string, string>; q: string }[] = [];
  let qi = 0;
  await Promise.all(
    Array.from({ length: 2 }, async () => {
      while (qi < queries.length) {
        const q = queries[qi++];
        const res = await knowledgeQuery(q).catch((e) => {
          log("query failed:", q.slice(0, 60), e.message);
          return null;
        });
        if (!res) continue;
        const mentions = new Map<string, string>();
        for (const e of (res.entities ?? []) as { id: string; name: string; mentions?: string[] }[])
          for (const m of [e.name, ...(e.mentions ?? [])]) mentions.set(normalizeCompany(m), e.id);
        for (const r of res.results ?? []) rows.push({ row: r, mentions, q });
      }
    }),
  );
  log(`${rows.length} rows`);

  // de-duplicate rows by company
  const byCompany = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const name = pickField(r.row, ["company", "startup", "name", "company_name", "organization", "organisation"]);
    if (!name) continue;
    const k = normalizeCompany(name);
    if (!byCompany.has(k)) byCompany.set(k, r);
  }
  log(`${byCompany.size} distinct companies`);

  const stats = { placeholder: 0, noDate: 0, verifiedGraph: 0, verifiedSearch: 0, unverified: 0, outOfWindow: 0, notRelevant: 0 };
  const events: FaroEvent[] = [];
  const drops: { company: string; reason: string; date: string | null }[] = [];

  for (const [, r] of byCompany) {
    const name = pickField(r.row, ["company", "startup", "name", "company_name", "organization", "organisation"])!;
    const dateText = pickField(r.row, ["date", "announced", "announcement_date", "round_date", "date_announced", "announced_date"]);
    const amount = pickField(r.row, ["amount", "funding_amount", "raised", "amount_raised", "size"]);
    const stage = pickField(r.row, ["stage", "round", "round_type", "series", "funding_round", "type"]);
    const invText = pickField(r.row, ["investors", "key_investors", "lead_investor", "lead_investors", "backers", "other_investors"]) ?? "";
    const sector = pickField(r.row, ["sector", "industry", "description", "focus"]);

    if (isPlaceholderDate(dateText)) {
      stats.placeholder++;
      drops.push({ company: name, reason: "placeholder date", date: dateText });
      continue;
    }
    const rowDay = dateText ? concreteDateInText(dateText) : null;
    const rowMonth = dateText ? monthInText(dateText) : null;

    // seed investors named in the row
    const investorIds = new Set<string>();
    for (const part of invText.split(/[,;&]| and /)) {
      const seed = SEED_FUNDS.find((f) => aliasMatch(f, part.replace(/\(.*?\)/g, "").trim()));
      if (seed) investorIds.add(slug(seed.name));
    }
    // a per-fund query is evidence the fund is in the round
    const fundQ = SEED_FUNDS.find((f) => r.q.includes(`where ${f.name} invested`));
    if (fundQ && invText && new RegExp(fundQ.aliases[0].split(" ")[0], "i").test(invText)) investorIds.add(slug(fundQ.name));

    // resolve
    const key = normalizeCompany(name);
    let calaId = r.mentions.get(key) ?? null;
    if (!calaId) {
      const cands = await searchEntities(name, { types: ["Company", "Organization"], limit: 5 }).catch(() => []);
      calaId = cands.find((c) => normalizeCompany(c.name) === key)?.id ?? null;
    }
    const local = (calaId && ds.idIndex[calaId]?.kind === "company" ? ds.companies[ds.idIndex[calaId].id] : null) ?? findInDataset(ds, name);
    const relevant = !!local || investorIds.size > 0;
    if (!relevant) {
      stats.notRelevant++;
      drops.push({ company: name, reason: "no shared investor in keyrings", date: dateText });
      continue;
    }

    // verify in the graph
    let verified: { date: string; source: { name: string; url: string }; text: string } | null = null;
    const matchDate = (d: string) => {
      if (rowDay) return Math.abs(Date.parse(d) - Date.parse(rowDay)) <= 14 * 86400000;
      if (rowMonth) {
        const dd = new Date(d + "T00:00:00Z");
        const diff = (dd.getUTCFullYear() - rowMonth.y) * 12 + dd.getUTCMonth() + 1 - rowMonth.m;
        return diff === 0 || diff === -1 || diff === 1;
      }
      return d >= cutoff;
    };
    const roundIds = local ? [...local.roundIds] : [];
    if (calaId) {
      const raw = await fetchCompany(calaId).catch(() => null);
      for (const rr of raw?.rounds ?? []) if (!roundIds.includes(rr.id) && (!rr.date || rr.date >= cutoff)) roundIds.push(rr.id);
    }
    for (const rid of roundIds) {
      const round = ds.rounds[rid] ?? (await fetchRound(rid, "PCFR").catch(() => null)) ?? (await fetchRound(rid, "FR").catch(() => null));
      if (!round || !isConcreteDate(round.date) || round.date < cutoff || !matchDate(round.date)) continue;
      const src = pickSource(round.sources, round.date);
      if (!src) continue;
      const amt = fmtAmount(round.amount, round.currency);
      verified = { date: round.date, source: src, text: amt ? `raised ${amt}${round.roundType ? ` (${round.roundType})` : ""}` : "raised a round" };
      stats.verifiedGraph++;
      break;
    }

    // verify via search (slow) if the graph didn't have it
    if (!verified) {
      const when = rowDay ?? (rowMonth ? `${new Date(Date.UTC(rowMonth.y, rowMonth.m - 1, 1)).toLocaleString("en-GB", { month: "long", timeZone: "UTC" })} ${rowMonth.y}` : months.join(" or "));
      const ans = await knowledgeSearch(`When exactly did ${name} announce its ${stage ?? "funding round"} in ${when}, and who reported it?`).catch(() => null);
      const found = ans ? sourcedDate(ans, name) : null;
      if (found && found.date >= cutoff && found.date <= now && matchDate(found.date)) {
        verified = { date: found.date, source: found.source, text: "" };
        stats.verifiedSearch++;
      }
    }

    if (!verified) {
      stats.unverified++;
      drops.push({ company: name, reason: "no concrete date with source", date: dateText });
      continue;
    }
    if (verified.date < cutoff || verified.date > now) {
      stats.outOfWindow++;
      continue;
    }
    const text = amount && !/undisclosed|not disclosed/i.test(amount)
      ? `raised ${amount.replace(/\s*\(.*\)$/, "")}${stage && !/not specified|early-stage/i.test(stage) ? ` ${stage}` : ""}`
      : verified.text || (stage && !/not specified/i.test(stage) ? `closed a ${stage} round` : "raised a round");
    events.push({
      id: createHash("sha256").update(`round|${key}|${verified.date}`).digest("hex").slice(0, 16),
      kind: "round",
      companyId: local?.id ?? null,
      calaId,
      companyName: local?.name ?? name,
      date: verified.date,
      text,
      source: verified.source,
      description: sector ?? undefined,
      investorIds: [...investorIds],
      origin: "query",
      detectedAt: new Date().toISOString(),
    });
  }

  const all = saveEvents(events);
  writeJson("daily-report.json", { ranAt: new Date().toISOString(), now, queries: queries.length, rows: rows.length, stats, kept: events.length, drops });
  log("stats", stats, `kept ${events.length}; events.json now ${all.length}`);
}

/** From a /knowledge/search answer, find a claim about `name` with a concrete date and a source URL. */
export function sourcedDate(ans: SearchAnswer, name: string): { date: string; source: { name: string; url: string } } | null {
  const key = normalizeCompany(name).split(" ")[0];
  const ctx = new Map((ans.context ?? []).map((k) => [k.id, k]));
  for (const step of ans.explainability ?? []) {
    if (!normalizeCompany(step.content).includes(key)) continue;
    for (const ref of step.references ?? []) {
      const kb = ctx.get(ref);
      for (const o of kb?.origins ?? []) {
        const url = o.document?.url || o.source?.url;
        if (!url) continue;
        const date = concreteDateInText(step.content) ?? concreteDateInUrl(url) ?? concreteDateInText(kb?.content ?? "");
        if (date) return { date, source: { name: o.source?.name || hostOf(url), url } };
      }
    }
  }
  return null;
}

if (process.argv[1]?.endsWith("daily-rounds.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
