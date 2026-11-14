/**
 * Expansion news from /v1/knowledge/search: claims -> {company, market, date, source}.
 * Heuristic extraction (regex on the claim, its URL and the cited KnowBit); the LLM can
 * replace it when ANTHROPIC_API_KEY is set (see llm.ts).
 */
import type { SearchAnswer } from "./cala";
import { concreteDateInText, concreteDateInUrl } from "./dates";
import { hostOf } from "./profile";

export const NEWS_MARKETS = ["Finland", "Sweden", "Norway", "Denmark", "the Nordics"];

const NOT_ENTRY = /\b(forecast|market (size|is expected|will grow)|cagr|merg(e|er|ed)|acquir|acquisition|takeover|stake in|partner(ed|s|ship) with|joint venture|alliance|raised|funding round|ipo|layoffs?|exit(s|ed)? the|withdraw|leav(e|es|ing) the|job (posting|for)|posted a job|contracts? with)\b/i;
const ENTRY = new RegExp(
  [
    String.raw`expand(s|ed|ing)? (further |its operations |operations )?(in)?to\b`,
    String.raw`expand(s|ed|ing)? (further )?(across|into|in)\b`,
    String.raw`expand(s|ed|ing)? its (european |nordic |international )?(footprint|presence)`,
    String.raw`enter(s|ed|ing)? (the )?(finnish|swedish|norwegian|danish|nordic|icelandic)? ?market`,
    String.raw`\benter(s|ed|ing)? (finland|sweden|norway|denmark|iceland|the nordics)`,
    String.raw`launch(es|ed|ing)? .{0,60}\bin (finland|sweden|norway|denmark|iceland|the nordics|scandinavia)`,
    String.raw`open(s|ed|ing)? (a |an |its )?(first |new )?(international |nordic |local )?(office|branch|base|store|hub|subsidiary|headquarters|data cent(er|re)|factory|plant)`,
    String.raw`new (office|branch|subsidiary|base|hub) in`,
    String.raw`first (operational )?(presence|office|store|market|customers?) in`,
    String.raw`(set(s|ting)? up|establish(es|ed|ing)?) (a |an |its )?(local |nordic |new )?(office|branch|subsidiary|presence|entity|base)`,
    String.raw`arriv(es|ed|ing) in`,
    String.raw`debut(s|ed)? in`,
    String.raw`roll(s|ed|ing)? out .{0,40}\bto (finland|sweden|norway|denmark|the nordics)`,
    String.raw`plans to (open|build|develop|launch|enter)`,
  ].join("|"),
  "i",
);

export interface Claim {
  index: number;
  market: string;
  text: string;
  url: string;
  sourceName: string;
  knowbit: string;
}

export function claimsOf(ans: SearchAnswer, market: string, start: number): Claim[] {
  const ctx = new Map((ans.context ?? []).map((k) => [k.id, k]));
  const out: Claim[] = [];
  for (const step of ans.explainability ?? []) {
    const kb = (step.references ?? []).map((r) => ctx.get(r)).find((k) => k?.origins?.length);
    const o = kb?.origins?.[0];
    const url = o?.document?.url || o?.source?.url;
    if (!url) continue;
    out.push({ index: start + out.length, market, text: step.content, url, sourceName: o?.source?.name || hostOf(url), knowbit: kb?.content ?? "" });
  }
  return out;
}

/** Heuristic extraction: leading proper-noun phrase + entry verb, date from text or URL. */
const VERB = String.raw`(?:has|have|is|was|will|plans|announced|launched|opened|signed|said|reported|expanded|entered|set|established|unveiled|revealed|confirmed|began|started|debuted|rolled|chose|picked|selected|continued)`;
const NAME = String.raw`((?:[A-Z0-9]|[a-z]+[A-Z])[\w&.'’-]*(?:\s+(?:[A-Z0-9][\w&.'’-]*|of|de|&))*?)`;
// "Arondite announced…"  /  "Portuguese drone maker Tekever announced…"
const LEADS = [
  new RegExp(String.raw`^(?:\*\*)?` + NAME + String.raw`(?:\s*\([^)]*\))?\s+` + VERB + String.raw`\b`),
  new RegExp(String.raw`^(?:[A-Z][a-z]+\s+)?(?:[a-z][\w-]*\s+){1,3}` + NAME + String.raw`(?:\s*\([^)]*\))?\s+` + VERB + String.raw`\b`),
];

export function heuristic(c: Claim) {
  if (NOT_ENTRY.test(c.text) || !ENTRY.test(c.text)) return { company: null, date: null, isEntry: false };
  let company: string | null = null;
  for (const re of LEADS) {
    const m = c.text.match(re);
    if (m) {
      company = m[1].replace(/^(The|US|U\.S\.|German|Swedish|Chinese|French|British|American|Japanese|Portuguese|Danish|Finnish|Norwegian|Dutch|Irish|Italian|Spanish)\s+/, "").trim();
      break;
    }
  }
  if (company && /^(January|February|March|April|May|June|July|August|September|October|November|December|Q[1-4]|\d{4})\b/.test(company)) company = null;
  if (!company || /^(Multiple|Several|Many|Some|Companies|Firms|Startups|The)$/i.test(company.split(" ")[0])) return { company: null, date: null, isEntry: false };
  const date = concreteDateInText(c.text) ?? concreteDateInUrl(c.url) ?? concreteDateInText(c.knowbit);
  return { company, date, isEntry: true };
}

export function marketCountry(market: string): string[] {
  return market === "the Nordics" ? ["Finland", "Sweden", "Norway", "Denmark", "Iceland"] : [market];
}

