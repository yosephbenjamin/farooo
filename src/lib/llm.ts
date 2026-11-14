/**
 * Optional LLM step. Used only when ANTHROPIC_API_KEY is set; every caller has a heuristic fallback.
 * - extractClaims: market-entry claims -> {company, market, date, isEntry}
 * - fitSentences: one short "why you" line per door
 */
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";

export function llmEnabled() {
  return !!process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | null = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

/** Ask for JSON, parse the first JSON value in the reply. Returns null on any failure. */
async function askJson<T>(system: string, user: string): Promise<T | null> {
  if (!llmEnabled()) return null;
  try {
    const req = {
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content: user }],
    };
    // `fallbacks` / `output_config` may postdate the installed SDK's types; the API accepts them.
    const res = (await getClient().beta.messages.create(req as never)) as unknown as Anthropic.Beta.BetaMessage;
    if (res.stop_reason === "refusal") return null;
    const text = res.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const m = text.match(/[[{][\s\S]*[\]}]/);
    return m ? (JSON.parse(m[0]) as T) : null;
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) console.warn("[llm] rate limited, falling back to heuristics");
    else if (e instanceof Anthropic.APIError) console.warn(`[llm] API error ${e.status}, falling back to heuristics`);
    else console.warn("[llm] failed, falling back to heuristics");
    return null;
  }
}

export interface ExtractedClaim {
  index: number;
  company: string | null;
  market: string | null;
  date: string | null; // YYYY-MM-DD only if the day is stated
  isEntry: boolean; // an outside company entering a market (not forecasts, mergers, alliances)
}

export async function extractClaims(claims: { index: number; text: string; url: string }[]): Promise<ExtractedClaim[] | null> {
  return askJson<ExtractedClaim[]>(
    "You extract market-entry events from news claims. Reply with a JSON array only.",
    `For each claim, return {index, company, market, date, isEntry}.
- company: the single company doing the expanding, or null.
- market: the country or region it is entering.
- date: YYYY-MM-DD only if the exact day is stated in the claim or the URL; otherwise null.
- isEntry: true only if an outside company is entering or launching in that market. False for market forecasts, mergers, acquisitions, alliances, funding, or a local company growing at home.

Claims:
${claims.map((c) => `${c.index}. ${c.text} [${c.url}]`).join("\n")}`,
  );
}

export async function fitSentences(
  startup: { name: string; description: string },
  doors: { id: string; name: string; description: string }[],
): Promise<Record<string, string> | null> {
  if (!doors.length) return null;
  const out = await askJson<{ id: string; sentence: string }[]>(
    "You write one-line partnership rationales for founders. Terse, concrete, declarative. Max 16 words each. No hype. Reply with a JSON array only.",
    `Startup: ${startup.name}: ${startup.description}

For each company below, write one sentence saying why ${startup.name} and it should talk. Start with the company name.
${doors.map((d) => `- id=${d.id} ${d.name}: ${d.description}`).join("\n")}

Return [{id, sentence}].`,
  );
  if (!out) return null;
  return Object.fromEntries(out.map((o) => [o.id, o.sentence]));
}
