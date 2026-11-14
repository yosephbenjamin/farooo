# Decisions

Choices made without stopping to ask. Newest last.

1. **Stack as suggested.** Next.js 15 (App Router) + TypeScript + Tailwind 4. Scripts run with `tsx`.
2. **Cache is committed.** `data/cache/cala/*.json` holds raw Cala responses keyed by a hash of (method, path, body). Headers (and so the API key) are never part of the key or the record. Committing it means the booth demo and re-ingests work offline and nothing is queried twice, even across machines.
3. **Node fetch behind a proxy.** In the cloud sandbox Node's built-in fetch needs `NODE_USE_ENV_PROXY=1`. Documented in `.env.example`; no proxy code in the app.
4. **Fund resolution is automatic but audited.** Each seed fund is searched under several spellings; candidates must match an alias after `normalizeFund` (strips Fund I–VI, Ky, Oy, AB, LP, …), not be described as based in an unrelated country, and have investment relationships. Same-named strangers we caught by eye are listed in `seed.ts` (`exclude`, `excludeNames`). The full accept/reject log is `data/funds.json`.
5. **Portfolio = union of three link types**: `INVESTED_IN`, issuers of `PrivateCompanyFundingRound`s and `FundingRound`s the fund took part in, and the company-side `INVESTED_IN` (incoming). Fund-like targets (fund-of-funds links, e.g. Tesi into VC funds) are dropped.
6. **Company merging** is union-find over normalised names and aliases (≥ 4 chars), but never across two different countries ("Wolt" Finland vs "WOLT S.R.L." Italy stay apart).
7. **Client-side pacing at 1.6 req/s.** Cala returns 429 above roughly 1.5 req/s without rate-limit headers. The client paces requests, backs everyone off on a 429, and retries up to 6 times.
8. **Industrifonden dropped** from the seed list in practice: no matching investor entity found (see DATA_NOTES). Spintop Ventures replaces an uncertain name.
9. **"Concrete date" means day precision.** Month-only dates ("Oct 2026", "Early Nov 2026") and placeholders ("Recent") are never alerted on. A month-only query row is kept only if verification (graph round or a search claim) yields a day-precise date with a source.
10. **Doors "open" for 120 days.** A door's reason counts as "why now" for 120 days; the headline then narrows to this week / this month when it can.
11. **Door Count = doors with a real fit** (complement or same non-generic sector, fit score ≥ 2) per investor. Keyring size is kept alongside but not shown.
12. **LLM is optional.** With `ANTHROPIC_API_KEY`, claim extraction and fit lines use Claude (`claude-opus-5-5`, low effort, server-side refusal fallback on). Without it, regex + a sector lexicon with complement pairs. No key was available while building, so the shipped data uses the heuristics.
13. **Light only.** Cala's site has no dark theme; Faro matches it.
14. **Single input on the question screen.** The short description the spec mentions comes from Cala (or the demo profile), not a second field: "one input" won.
