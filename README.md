# Faro

*Faro* is lighthouse in Spanish and Italian. Cala is the hidden cove. Faro is the lighthouse that guides you to it.

Faro tells you which companies are entering your market, which of them you'll meet at Slush, who can introduce you, and why they need you, all from sourced data.

It asks nothing. On the web you type your startup's name once; in Gmail it knows you from your email domain. Your profile (industry, headquarters, investors) comes from Cala.

Each door has five parts:

1. **Why now.** A foreign company just registered a company in your country (a registry-sourced founding date), or expansion news says they're coming. Fresh rounds come second.
2. **Why you.** The partnership they'll need from you: customer, integration or distribution, from industry and headquarters only.
3. **Where to meet.** Whether they attend Slush 2026.
4. **Warm path.** An investor you share, and whether they led.
5. **Who.** People with roles from Cala, or a "Find the right person →" search link.

Every door has a concrete date and a source, or it isn't shown. The first log shows three doors of different partnership types, each with "more like this · not now"; those taps quietly re-rank everything after.

Built for Junction 2026, Cala challenge. The full spec is in `BUILD_SPEC.md`.

## Two screens

1. **The question.** `/`: "Which startup are you?" One input, one hand-drawn lighthouse in a mint cove at dusk. The loader is the same scene with the beam turning.
2. **The log.** `/for/<startup>`: an editorial headline, the doors as short prose with footnoted sources (date · source · source rank), a hand-drawn map (a small town: investors as buildings, doors as windows, plus a "Close by" building for doors without an introducer), and a quiet Door Count line.

Plus `/log` (alerts as emails), booth mode `/for/<startup>?booth=1` (press space to watch a door open), `GET /api/doors?name=…|email=…`, and the contextual Gmail sidebar in `gmail-addon/` (`GET /api/gmail?user=…&sender=…`).

## Run it

```bash
npm install
npm run dev
```

The repo ships with the ingested data (`data/dataset.json`), the raw Cala response cache (`data/cache/cala/`) and three precomputed demo startups (`data/demo/`), so the app and the booth demo work offline with no key.

To refresh data you need a Cala key in the environment (never in a file):

```bash
export CALA_API_KEY=...        # or a proxy-injected secret with CALA_API_KEY=proxy-injected
export NODE_USE_ENV_PROXY=1    # only behind an HTTPS proxy (Node >= 22.21)
```

| Command | What it does | Speed |
|---|---|---|
| `npm run ingest` | v2: users → fresh rounds (with `is_lead`) → expansion news → Slush attendees → new national companies of foreign firms (`slush`: Nordic attendees → foreign parent; `entrants`: foreign attendees → new Nordic company). Writes `data/pool.json` after each stage; resumable; `--stage=` and `--budget=` flags | ~10 calls/min on the current key: minutes for the first three stages, hours for all 2,989 Slush attendees |
| `npm run keyrings` | v1: seed funds → vehicles → portfolios (`data/dataset.json`), used for warm paths and fresh rounds | from cache |
| `npm run profiles` | Prefetch one profile per Slush attendee and portfolio company into the cache | hours |
| `npm run alerts` | New doors per subscriber → email via Resend, or kept for `/log` | seconds |
| `npm run demo` | Freeze the three booth reports from the pool | seconds |
| `npm test` | Normaliser, dates, profile parsing, partnership types, tiers, first look, taps | instant |

Every Cala response is cached on disk by request, so nothing is queried twice. `CALA_OFFLINE=1` forbids network calls entirely.

Optional: `ANTHROPIC_API_KEY` (Claude writes the fit lines and extracts market-entry claims; otherwise a keyword/sector heuristic does), `RESEND_API_KEY` + `ALERT_TO` + `ALERT_FROM` (send alerts by email).

## Architecture

```
identity   web: name → entity search → profile      Gmail: email domain → company whose website matches
profile    one retrieval: website, founding_date (+ source_rank), OPERATES_IN_INDUSTRY, HQ,
           HAS_DOMAIN_NAME, INVESTED_IN, FundingRounds, PARTICIPATES_IN_EVENT, people, GLEIF parents

why now    1. new national company of a foreign firm: FILING founding_date ≤ 365 days, tied to the
              foreign company by GLEIF parent link or the same website
           2. expansion news: /v1/knowledge/search claims with a concrete date + source
           3. fresh rounds (≤ 120 days), only with a warm path
why you    industry sectors × HQ: customer · integration · distribution, or no door
where      Slush 2026 attendee (event bc844d56…, incoming PARTICIPATES_IN_EVENT)
warm path  shared investor (INVESTED_IN + round participants), is_lead on the round
who        CEO / CTO / VP / WORKS_AT roles, else a Google X-ray link (link only)

ranking    1 entry + warm + shared event · 2 entry + warm · 3 entry · 4 fresh round + warm
           within a tier: partnership types you tapped "more like this" on
```

| Path | Role |
|---|---|
| `src/lib/cala.ts` | Cala client: 90 s timeout, retries, pacing (10/min), on-disk cache |
| `src/lib/profile.ts` | One-call company profile, source ranks, FILING founding dates |
| `src/lib/partner.ts` | Partnership type from industry sectors and HQ |
| `src/lib/doors.ts` | The door engine: five parts, tiers, ranking, first look |
| `src/lib/identity.ts` | Who the user is, from a name or an email domain |
| `src/lib/news.ts` | Expansion-news claim parsing |
| `src/lib/taps.ts` | "more like this · not now" |
| `src/lib/prose.ts` | Every sentence Faro says |
| `src/components/` | Lighthouse, door map, log view |
| `scripts/ingest.ts` | The v2 ingest |
| `gmail-addon/` | Contextual Gmail sidebar |

## Data status

Real Cala data, fetched 14 Nov 2026 with the new key (about 10 requests per minute): the three demo startups, 14 fresh rounds with lead flags, 4 sourced market entries from expansion news, and 281 company profiles, including the 200 Nordic-named Slush attendees. No national subsidiary of a foreign company turned up among the attendees checked, so today's market-entry doors come from news. Every door shown has a concrete date and a source. See `TODO.md` for the remaining (hours-long) passes.

## Notes

- `DESIGN.md`: Cala's palette and fonts, extracted from cala.ai, and the rules.
- `DATA_NOTES.md`: every data problem hit, as feedback for Cala.
- `DECISIONS.md`: choices made without stopping to ask.
- `BUILD_SPEC.md`: the v2 spec, and which v1 items it reversed.
- `DEMO.md`: the 60-second booth script.
- `TODO.md`: status.
