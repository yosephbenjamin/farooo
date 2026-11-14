# Faro: build spec (v2, Junction 2026, Cala challenge)

*Faro* = lighthouse. Cala is the hidden cove; Faro is the lighthouse that guides you to it. It stays quiet until a door opens, then sends one signal.

## North star

> Faro tells you which companies are entering your market, which of them you'll meet at Slush, who can introduce you, and why they need you, all from sourced data.

**Users:** founders, and early partnerships/GTM teams.

**Quality bar:** precision over volume. Every door has a concrete date and a source, or it isn't shown.

## Onboarding: no questions

- **Identity.** In Gmail: infer the user's company from their email domain, matched to a Cala company's `website` / `HAS_DOMAIN_NAME`. On the web: ask for the startup's name once. Build the profile from Cala: `description`, `OPERATES_IN_INDUSTRY`, `HAS_HEADQUARTERS_IN` (plus investors, for warm paths).
- **Intent: never asked.** The first log shows three doors of different partnership types (customer, distribution, integration), each with "more like this · not now". Those taps weight future doors by type. No chips, no ICP sentence, no forms.

## A door has five parts, in this order

1. **Why now.** Market entry first:
   - recently founded national subsidiaries of foreign companies (a `founding_date` with a `FILING` source, the subsidiary matched to its parent by website);
   - then expansion news from `/v1/knowledge/search`.
   Fresh rounds come second.
2. **Why you.** The specific partnership they'll need: customer, integration or distribution. Matched on industry (`OPERATES_IN_INDUSTRY`) and headquarters (`HAS_HEADQUARTERS_IN`) against the inferred profile and the user's taps. No keyword guesses. Doors without a real reason are dropped.
3. **Where to meet.** Flag doors attending Slush 2026 (event `bc844d56-6ab4-452b-96bf-2661e86e592b`, incoming `PARTICIPATES_IN_EVENT`).
4. **Warm path.** A shared investor, noting when they led (`is_lead`).
5. **Who.** Executives or staff with roles where Cala has them (`IS_CEO_OF`, `IS_CTO_OF`, `IS_VICEPRESIDENT_OF`, `WORKS_AT` + `role`). Otherwise a "Find the right person →" Google X-ray link (`site:linkedin.com/in`). Generate the link only; never scrape.

## Ranking

1. market entry + warm path + shared event (Slush 2026 is the event Cala has)
2. market entry + warm path
3. market entry
4. fresh round + warm path

Faro works all year; Slush is one "where to meet" signal, not the point.

Within each tier, favour the partnership types the user tapped "more like this" on. Anything outside these tiers isn't shown.

## Data

- Entity endpoints only: search → introspection → retrieval. The slow `/v1/knowledge/query` endpoint is dropped. `/v1/knowledge/search` stays for expansion news.
- Show `source_rank` (FILING / PRIMARY / PRESS / AGGREGATOR) quietly in each footnote.
- Read the API key from `CALA_API_KEY` (or a proxy-injected credential). Never write it to a file, log or commit.
- Every Cala response is cached on disk by request. When a working key is available, rerun the ingest.

## Delivery

- **Web:** the log, design unchanged.
- **Gmail:** a contextual sidebar. It knows the user from their domain and shows the door when a matching company emails.
- **Booth:** precomputed startups skip identity; the scripted "a door opens" moment still works offline.

## Carried over from v1 (unchanged)

- Stack: Next.js (App Router) + TypeScript + Tailwind; cached JSON under `/data`.
- Design (`DESIGN.md`): Cala's palette exactly, one accent (yellow), hand-drawn ink SVGs (rough.js), Newsreader + IBM Plex Mono, no gradients, shadows or emoji, booth-readable at 2 m.
- Two screens: the question, and the log (editorial headline, doors as short prose, hand-drawn map, quiet Door Count line). `/log` shows alerts as emails; Resend if `RESEND_API_KEY` is set.
- Rules: commit and push after every milestone; keep `TODO.md` current; log choices in `DECISIONS.md` and data problems in `DATA_NOTES.md`; only alert on concrete dates with sources, never "Recent".
- Entity resolution: normalise names, merge fund vehicles and duplicate companies, union links from both directions.

## Superseded from v1 (explicitly reversed by the new north star)

| v1 | v2 |
|---|---|
| Named contacts and people roles out of scope | "Who": people with roles from Cala, else an X-ray link |
| Don't build on subsidiary detection | Detect recently founded national subsidiaries by FILING `founding_date` + website match (not GLEIF parent links) |
| Keyword/sector heuristic fit line | Partnership type from industry + HQ only; no keyword guesses |
| Daily job on `/v1/knowledge/query` | Entity endpoints only |
| Doors = shared-investor keyrings | Doors = market entrants first; warm path is a ranking factor |
| Slush out of scope | Slush 2026 attendance from Cala's event entity (no Slush internal data or branding) |
