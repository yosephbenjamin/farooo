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
15. **Degrade, don't stop, on 402.** When Cala's balance ran out, the ingest switched to cache-only mode and builds minimal company records from what links and round descriptions already said. Nothing is invented; missing fields stay empty.
16. **Sector evidence from source titles.** With most descriptions missing or boilerplate, the fit heuristic also reads the titles and URL slugs of round sources *about that company* (aggregators and roundups skipped). It's evidence for picking a sector, never shown as text.
17. **A door's generic tags (AI, SaaS, data, consumer, marketing) never trigger a complement.** Too many companies mention AI; a complement needs a specific sector on the door's side.
18. **Demo startups: Oura, Lovable, Verda.** Real Nordic companies backed by seed funds (Lifeline + Tesi; byFounders + Creandum + Balderton + Antler; Lifeline + byFounders + J12 + Tesi), with several dated, sourced doors each. Their reports are frozen at `FARO_NOW=2026-11-14`.
19. **The scripted moment holds back the newest opened door** (Vensum for Verda and Oura) and reveals it on space, a click on "watch", or after `&auto=` ms.
20. **The map: investors as buildings, doors as windows.** Easier to read than a force graph at booth distance, and it fits the lighthouse metaphor. Up to 25 windows per building, lit first.
21. **Typed name wins for display.** "Oura" resolves to Cala's "OURA HEALTH OY" but reads as "Oura".
22. **Gmail add-on is a thin card** over `/api/doors/<startup>`; not tested in a live Gmail account.

## v2 (new north star, see BUILD_SPEC.md)

23. **v1 items reversed by the north star are listed in BUILD_SPEC.md** (people, subsidiaries, keyword fit, query endpoint, keyrings-as-doors, Slush). Nothing you changed during the session conflicted; the working tree was clean.
24. **The new Cala key lives in the environment's network secrets**, injected by the proxy into requests to api.cala.ai. Scripts run with `CALA_API_KEY=proxy-injected` (a placeholder the proxy overwrites). No key in any file.
25. **Door-centric, prioritised ingest.** The new key allows ~10 requests per rolling minute. Profiling all 2,989 Slush attendees plus 1,143 portfolio companies would take ~7 hours, so the ingest runs in priority order (users → fresh rounds → news → Slush attendees, Nordic legal names first), saves `data/pool.json` after each stage, and resumes from cache.
26. **"Matched by website", made workable.** Registry subsidiaries rarely carry a website, so a new national company is tied to its foreign parent by (a) a GLEIF parent link (`IS_DIRECT_PARENT_OF` / `IS_ULTIMATE_PARENT_OF`), rejected if both have websites and they differ; or (b) the same website or domain on a same-brand company headquartered abroad. Name similarity alone never counts.
27. **FILING founding date** = a founding-date source with `source_rank: FILING`, or from a known registry (GLEIF, PRH/YTJ, Bolagsverket, Brønnøysund, CVR, Companies House, INPI, Zefix…), since Cala's registry sources often arrive without a `source_rank`. Day precision only, and 1 January dates are treated as year placeholders.
28. **Windows:** a new national company counts as market entry for 365 days after its registry founding date; expansion news 180 days; fresh rounds 120 days.
29. **Why you is structured.** Industry codes are grouped into sectors by the code itself (`FINTECH` → finance, `MEDICAL_DEVICES` → health…). Customer = your sector sells to theirs; integration = products that connect (software–software, software–payments, software–health); distribution = same sector, and they're entering your market from abroad. Same code and same label = competitor, dropped. No overlap = no door.
30. **Slush match** by attendee id, or by the attendee's exact normalised name (attendees are listed under brand names while doors are often legal entities).
31. **Taps** live in a per-startup cookie on the web (`faro_taps_<slug>`) and in user properties in Gmail, with the same shape. Ranking runs client-side too, so a tap re-ranks instantly. "not now" hides that door and lowers its type; three "not now"s on a type mute it.
32. **First look = three doors, one per partnership type** where the data allows; after the first tap the log becomes the ranked list (up to six).
33. **Who:** CEO, CTO, VP and `WORKS_AT` roles (scraps like "per an exhibitor listing" filtered out), up to two people; otherwise a Google X-ray link whose role terms follow the partnership type. Link only.
34. **The map keeps its design**: investors behind warm paths are buildings, plus one building "New in <country>" for entrants without a warm path. Lit windows are the doors in the log.
35. **Door Count kept** (doors per investor via warm paths), as a quiet line. It doesn't conflict with v2.
