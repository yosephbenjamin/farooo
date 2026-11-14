/**
 * Expansion news from /v1/knowledge/search: claims -> {company, market, date, source}.
 * Heuristic extraction (regex on the claim, its URL and the cited KnowBit); the LLM can
 * replace it when ANTHROPIC_API_KEY is set (see llm.ts).
 */
import type { SearchAnswer } from "./cala";
import { concreteDateInText, concreteDateInUrl } from "./dates";
import { hostOf } from "./profile";

export const NEWS_MARKETS = ["Finland", "Sweden", "Norway", "Denmark", "the Nordics"];

const NOT_ENTRY = /\b(forecast|market (size|is expected|will grow)|cagr|merg(e|er|ed)|acquir|acquisition|alliance|partnership with|joint venture|takeover|funding|raised|invest(s|ed|ment) in (a|the) (startup|company)|ipo|layoffs?|exit(s|ed)? the|withdraw|leav(e|es|ing) the)\b/i;
const ENTRY = /\b(expand(s|ed|ing)? (in)?to|enter(s|ed|ing)?|launch(es|ed|ing)? (in|its)|open(s|ed|ing)? (an? |its )?(new )?(office|store|hub|data cent(er|re)|headquarters|factory|plant)|set(s|ting)? up|establish(es|ed|ing)?|arriv(es|ed|ing)? in|debut(s|ed)? in|roll(s|ed)? out in|first (store|market)|to build|plans to (open|build|develop))\b/i;

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
export function heuristic(c: Claim) {
  if (NOT_ENTRY.test(c.text) || !ENTRY.test(c.text)) return { company: null, date: null, isEntry: false };
  const m = c.text.match(/^(?:\*\*)?([A-Z0-9][\w&.'’-]*(?:\s+(?:[A-Z0-9][\w&.'’-]*|of|de|&))*?)(?:\s*\([^)]*\))?\s+(?:has|have|is|was|will|plans|announced|launched|opened|signed|said|reported|expanded|entered|set|established|unveiled|revealed|confirmed|began|started|is set|debuted|rolled|chose|picked|selected)\b/);
  const company = m ? m[1].replace(/^(The|US|U\.S\.|German|Swedish|Chinese|French|British|American|Japanese)\s+/, "").trim() : null;
  if (!company || /^(Multiple|Several|Many|Some|Companies|Firms|Startups)$/i.test(company.split(" ")[0])) return { company: null, date: null, isEntry: false };
  const date = concreteDateInText(c.text) ?? concreteDateInUrl(c.url) ?? concreteDateInText(c.knowbit);
  return { company, date, isEntry: true };
}

function marketCountry(market: string): string[] {
  return market === "the Nordics" ? ["Finland", "Sweden", "Norway", "Denmark", "Iceland"] : [market];
}

