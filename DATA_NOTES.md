# Data notes for Cala

Problems and surprises hit while building Faro on the Cala API (14 Nov 2026). Written as feedback, not complaints: Faro works because the graph is good enough to work around these. Numbers come from `data/ingest-report.json`, `data/funds.json`, `data/daily-report.json` and `data/market-report.json`.

## v2 findings (new key, entity endpoints)

- **Rate limit: ~10 requests per rolling minute** on the new key (a burst of 10, then roughly one every 6 s), still without rate-limit headers. That makes "profile every Slush attendee" a 5-hour job; Faro prioritises instead.
- **Slush 2026 has 2,989 attendees** (2,980 companies), paginated 100 at a time. My client capped pagination at 2,000 at first: watch for silent truncation.
- **Registry sources often lack `source_rank`.** GLEIF, INPI and Companies House founding dates came back with no `source_rank` field, although the guide classes them as FILING. Faro recognises registries by name.
- **Year precision disguised as day precision.** Lovable's `founding_date` is `2023-01-01` with sources marked `day`. Faro treats 1 January dates as year placeholders.
- **Subsidiaries rarely have a website or domain.** Revolut's French and Lithuanian entities have none, so "match by website" alone finds little. GLEIF parent links exist but are sparse (Revolut Ltd lists one child).
- **`HAS_HEADQUARTERS_IN` is often missing on startups** (e.g. Finadeck Oy); the country has to be read from `headquarters_address` text.
- **Industry codes differ from the guide's examples**: `FINTECH`, `HARDWARE_AND_EQUIPMENT`, `INTERNET_AND_WEB_SERVICES`, `HEALTHCARE_PROVIDERS`, `MEDICAL_DEVICES`, `RENEWABLE_ENERGY`, `TRANSPORTATION_AND_LOGISTICS`, `ADVERTISING_AND_MARKETING`, with `original_label`s like `ai`, `cyber`, `enterpriseSoftware`, `robo`.
- **People data is better than expected**: in a sample of 29 Slush attendees, 21 had a CEO or CTO. `WORKS_AT.role` sometimes holds scraps ("per an exhibitor listing").
- **Name-pattern search doesn't find new subsidiaries.** Searching "Finland Oy" / "Sweden AB" (100 results each) surfaced one 2025 company per query, both domestic restructurings.

- **Expansion news (search), v2 run:** 51 sourced claims across Finland, Sweden, Norway, Denmark and the Nordics. 41 weren't market entries (acquisitions, partnerships, incumbents investing at home, job posts), 5 had no concrete date, 1 was local (Netcompany: the claim resolves to NETCOMPANY UK LIMITED, but the company is Danish), 4 kept.
- **Same-name companies are common.** "Oura" resolves to a US entity with no data before "OURA HEALTH OY"; "Verda" to a UK consultancy; "Lovable" has a Swedish and a US entity. Faro pins its demo startups by Cala id and prefers the richest record.
- **Industry codes can be wrong.** atNorth (a data-centre operator) is coded `FINTECH`, so its partnership line reads as a fintech's. Faro reports Cala's industry as given.
- **New registrations at Slush are mostly local.** Of the first 100 Nordic-named attendees, ~20 have a registry founding date in the last year (PRH/YTJ, allabolag), but none tied to a foreign company by website or GLEIF parent.

## Access and limits

- **Rate limit without headers.** Above roughly 1.5 requests/second the API answers `429` with no `Retry-After` and no rate-limit headers, so clients can only guess. Faro paces itself at 1.6 req/s and backs off globally on any 429. A cold ingest of 30 funds needs ~4,000 entity calls, which is about 45 minutes at that rate.
- **Credit ran out mid-build, silently.** After about 1,050 cached calls (entity search, introspection, relationship pages, round lookups) plus a handful of knowledge calls, every endpoint started returning `402 {"detail":"Insufficient balance"}`, including the cheap `GET /v1/entities`. There was no warning header beforehand and no balance endpoint to check. That stopped the ingest after ~680 of 1,172 rounds and before any company profiles. Faro now degrades gracefully (see "What 402 cost us" below), but a `X-Balance-Remaining` header, or a lower-cost tier for entity reads, would help builders plan.
- **Knowledge endpoints are slow and variable.** `/v1/knowledge/query` took 45–67 s per call, `/v1/knowledge/search` 45–68 s. Responses differ between runs of the same input, so results have to be cached by request to stay reproducible.

## Entity search and fund resolution

- **Fund names are ambiguous.** `GET /v1/entities?name=Inventure` returns a Belgian VC (`INVENTURE`), a Swedish 1972 company, a US food company, UK retailers, and the Finnish fund (`Inventure`, Organization) fifth. There's no "is an investor" filter. Faro disambiguates by alias match + country words in the generated description + "has investment relationships" (introspection). Of 30 seed funds, 29 resolved to 60 vehicles; `data/funds.json` lists every accept and reject with its reason.
- **Same-named strangers pass every automatic check.** `InVenture Partners`, `Icebreaker Ventures LLC` / `ICEBREAKER VENTURES LLP`, and `HeartCore Inc.` / `HeartCore Co., Ltd.` (Japanese software companies) have investment relationships and no contradicting country, so they had to be excluded by hand.
- **Fund vehicles carry no links; the brand does.** `Lifeline Ventures Fund I–V Ky`, `Lifeline Ventures Fund VI SCSp`, `Inventure Fund II Ky`, `MAKI.VC FUND I/III Ky`, `Creandum II L.P.`, `NORTHZONE VI/XI L.P.` exist as entities but have no `INVESTED_IN` or round relationships. All portfolio links hang off the brand entity (or a management company). Odd exception: one `Northzone` Organization had none, while three `NORTHZONE VII–IX L.P.` vehicles did.
- **Industrifonden** didn't resolve to any entity with investment relationships.
- **Name variants of the same investor**: the query layer names `byFounders Collective`, while the graph has `byFounders`.

## Graph shape

- **Portfolios are split across three relationship types.** `INVESTED_IN` (fund → company), `PARTICIPATES_IN_CORPORATE_EVENT` → `PrivateCompanyFundingRound` (`event_date`, `round_type`), and `PARTICIPATES_IN_FUNDING_ROUND` → `FundingRound` (`announcement_date`, `round_label`). Inventure has 23 `INVESTED_IN` links but 30 corporate events. A full portfolio needs all three, plus a hop through each round to find the `ISSUER`.
- **Two parallel round models.** `PrivateCompanyFundingRound` and `FundingRound` look like two pipelines describing the same kind of event. 48 company+date pairs had two round entities for the same round (e.g. Lovable's $400M Series C on 12 Aug 2026 appears twice).
- **Generic round names.** Round entities are named `FINANCING_RAISED_OR_FACILITY_ENTERED` or `Seed`; the company appears only in the description text or via the `ISSUER` hop.
- **Inconsistent round labels.** `Seed` (178) vs `SEED` (68), `Series A` (132) vs `SERIES_A` (35), `Pre-Seed` vs `PRE_SEED`, plus `Venture Round`. Faro normalises them for prose.
- **Round roles beyond INVESTOR/ISSUER**: `LENDER` and `COUNTERPARTY` appear. Faro treats both as non-issuers.
- **One-directional links.** Inventure lists Wolt; Wolt's record doesn't list Inventure. Faro unions fund-side, company-side and round-side links (`oneDirectional` in the ingest report). Because company profiles weren't fetched (402), company-side links are missing from the shipped dataset: 1,207 links are fund-side only, 10 come only from rounds.
- **"Approximate date".** `PrivateCompanyFundingRound` descriptions say "Approximate date: 2021-09-02". The structured `event_date` is day-precise, but the text admits it may not be.
- **Lead flags** (`is_lead`) are present on some `FundingRound` links and absent elsewhere. Not used for ranking, as advised.

## Company records

- **Duplicates.** 77 merges across 1,143 records: `Carbo Culture` / `Carbo Culture Oy`, `Receipt Hero` / `ReceiptHero`, `Strise` / `STRISE AS`, `FLOWHAVEN OY` / `Flowhaven Oy`, `ÄIO` / `AIO`, and several exact-name duplicates with different ids (`Lovable`, `Inven`, `TheStorage`, `Trade`).
- **Boilerplate descriptions.** Many generated descriptions only say "Swedish company founded in 2017 and headquartered in Stockholm." They carry no sector, which is what a partnership fit needs. Industry tags (`OPERATES_IN_INDUSTRY`) are coarse (`SOFTWARE_AND_SERVICES`).
- **Article titles are the best sector signal.** Round sources often carry the article title ("Helsinki's Ambio raises €5.1 million to scale its AI-powered recycled plastics procurement platform"). Faro uses titles and URL slugs of sources about the company as sector evidence, never shown verbatim.
- **Sources skew to aggregators.** Of round sources: tracxn.com 495, pitchbook.com 125, crunchbase.com 113, against techcrunch.com 261, tech.eu 45, eu-startups.com 41. Aggregator profile pages carry crawl dates (e.g. 2026-08-25), not publication dates. Faro prefers press sources whose date is near the event.

## Query layer (`/v1/knowledge/query`)

- **Rows have no sources.** A query for Nordic rounds in Oct–Nov 2026 returned 14 good rows (Legora, Sumary, Vensum Power, Teton.ai…) with `date`, `amount`, `stage`, `key_investors`, but no URL per row. Every row must be verified elsewhere before it can be alerted on.
- **Dates are free text.** "Oct 2026", "Early Nov 2026", "Nov 2026", "30 Oct 2026", "10 Nov 2026". Only 3 of 14 were day-precise. Faro keeps month-only rows only if verification yields a day-precise date with a source.
- **Verification result (cached run):** 14 rows → 1 verified against a dated, sourced graph round (Vensum, €9M Series A, tech.eu, 6 Nov 2026), 10 with no shared investor in the keyrings, 3 unverified. Sumary (byFounders, 10 Nov) had a concrete date but no source, and the verifying search call couldn't run once credit was gone, so it was correctly dropped.
- **Entity mentions help.** `entities[].mentions` maps "Vensum Power" → a Cala id, which saves a search call per row.

## Search layer (`/v1/knowledge/search`) for market entry

- **Every claim is sourced.** `explainability[].references` → `context[].origins[].document.url`. Good.
- **Few concrete dates.** For "Which companies announced expanding into Finland in 2026?": 9 claims, 0 with a day-precise date in the claim text. URLs sometimes carry one (`fool.com/.../2026/11/13/...`). 3 claims had only a month.
- **Many claims aren't market entries.** Investments by incumbents (Google's €13B in Finland), acquisitions (SOL Group / Nowus), cooperation packages (Ukraine–Finland defence), a local incubator expanding at home (ESA BIC Finland). 6 of 9 were filtered out as non-entries.
- **Subsidiary detection doesn't work** (confirmed before the build): not used.

## What 402 cost us

- Company profiles (description, country, industry, aliases, company-side investors) for all 1,066 companies. Faro built minimal records from link names and the company text inside round descriptions instead; 966 companies have no country.
- ~490 fund-side rounds, the company-side rounds, the enrichment pass, 35 of 36 daily queries, and 9 of 10 market searches.
- Everything is cached by request, so `npm run ingest`, `daily` and `market` will fill the gaps with no code changes once the balance is topped up.
