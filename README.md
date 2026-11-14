# Faro

*Faro* is lighthouse in Spanish and Italian. Cala is the hidden cove. Faro is the lighthouse that guides you to it.

Faro watches Cala's funding data and tells a founder the moment a company that shares one of their investors raises a round, or enters their market. Each signal comes with the date, the source and the shared investor: the warm path. It also counts how many such doors each fund opens, so founders can pick investors who actually add value.

It stays silent until a door opens, then sends one signal.

Built for Junction 2026, Cala challenge.

## Two screens

1. **The question.** `/`: "Which startup are you?" One input, one hand-drawn lighthouse.
2. **The log.** `/for/<startup>`: an editorial sentence ("Three doors opened for Pleo this month."), the doors as short prose with footnoted sources, a hand-drawn map of the startup, its investors and their doors as tiny windows (lit = opened), and a quiet Door Count line.

Plus `/log`, which shows every alert exactly as it was emailed, and booth mode: `/for/<startup>?booth=1` (press space, or add `&auto=6000`, to watch a door open).

## Run it

```bash
npm install
npm run dev
```

The repo ships with the ingested data (`data/dataset.json`), the raw Cala response cache (`data/cache/cala/`) and three precomputed demo startups (`data/demo/`), so the app and the booth demo work offline with no key.

To refresh data you need a Cala key in the environment (never in a file):

```bash
export CALA_API_KEY=...        # required for ingest and live lookups
export NODE_USE_ENV_PROXY=1    # only behind an HTTPS proxy (Node >= 22.21)
```

| Command | What it does | Speed |
|---|---|---|
| `npm run ingest` | Seed funds → vehicles → portfolios → rounds → companies; clean and merge; write `data/dataset.json` | ~1 h cold (Cala allows ~1.5 req/s), seconds warm |
| `npm run enrich -- <investor…>` | One-line "what it does" for companies whose Cala description is boilerplate | ~50 s per 25 companies |
| `npm run daily` | M3a: recent rounds from the query layer, verified against the graph or a sourced search claim | ~1 min per query |
| `npm run market` | M3b: market-entry claims from search, extracted, filtered, resolved | ~1 min per search |
| `npm run alerts` | New doors per subscriber → email via Resend, or kept for `/log` | seconds |
| `npm run demo` | Freeze the three booth reports | seconds |
| `npm test` | Checks for the normaliser, date parser and fit heuristic | instant |

Every Cala response is cached on disk by request, so nothing is queried twice. `CALA_OFFLINE=1` forbids network calls entirely.

Optional: `ANTHROPIC_API_KEY` (Claude writes the fit lines and extracts market-entry claims; otherwise a keyword/sector heuristic does), `RESEND_API_KEY` + `ALERT_TO` + `ALERT_FROM` (send alerts by email).

## Architecture

```
seed funds (src/lib/seed.ts)
  └─ GET /v1/entities?name=…            resolve fund vehicles (Fund I–VI, Ky, AB, LP…) → one investor
       └─ POST /v1/entities/{id}         INVESTED_IN, PARTICIPATES_IN_CORPORATE_EVENT, PARTICIPATES_IN_FUNDING_ROUND
            └─ rounds → ISSUER            the hop that finds most of the portfolio
                 └─ companies             profile, country, industry, investors (other direction), recent rounds
                      └─ clean            normalise names, merge duplicates, union links, drop fund-of-fund targets
                           → data/dataset.json   investors · companies · rounds · keyrings

POST /v1/knowledge/query  (daily)   recent rounds ─┐
POST /v1/knowledge/search (nightly) market entry ──┴─ verify, keep concrete date + source → data/events.json

door engine (src/lib/doors.ts)
  startup → its investors → their keyrings → doors
  each door: fit line (why you) · reason with date + source (why now) · shared investor (warm path)
  Door Count per investor
       → /for/<startup>   → email (Resend) or /log
```

| Path | Role |
|---|---|
| `src/lib/cala.ts` | Cala client: 90 s timeout, retries, pacing, on-disk cache |
| `src/lib/graph.ts` | Graph walks (vehicle links, rounds, company profiles) |
| `src/lib/normalize.ts` | Entity resolution keys |
| `src/lib/doors.ts` | The door engine |
| `src/lib/sectors.ts` | Fit heuristic: sector lexicon and complement pairs |
| `src/lib/llm.ts` | Optional Claude step |
| `src/lib/prose.ts` | Every sentence Faro says |
| `src/components/` | Lighthouse, door map (rough.js ink lines), log view |
| `scripts/` | ingest, enrich, daily, market, alerts, demo, selftest |

## Notes

- `DESIGN.md`: Cala's palette and fonts, extracted from cala.ai, and the rules.
- `DATA_NOTES.md`: every data problem hit, as feedback for Cala.
- `DECISIONS.md`: choices made without stopping to ask.
- `DEMO.md`: the 60-second booth script.
- `TODO.md`: status.
