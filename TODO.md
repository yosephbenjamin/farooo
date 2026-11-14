# Faro: status (v2, see BUILD_SPEC.md)

| Milestone | Status | Notes |
|---|---|---|
| N0 Spec | done | `BUILD_SPEC.md` written; v1 items reversed by the north star listed there |
| N1 Entity-only ingest v2 | done | prioritised, resumable, merge-safe; `/v1/knowledge/query` removed; 10 req/min pacing |
| N2 Market entry | partial | **news**: 4 entries (atNorth → Finland, Cerebras → Finland, Arondite → Norway, Tekever → Denmark). **Subsidiaries**: 0 so far. Checked all 200 Nordic-named Slush attendees (≈40 registered in the last year, all local startups) and sampled 69 of 2,777 foreign attendees (no recently founded Nordic entity found). Full foreign pass: `npm run ingest -- --stage=entrants` (~4.6 h at 10 req/min) |
| N3 Door engine v2 | done | five parts, tiers, taps, first look; self-tested |
| N4 Web log v2 | done | design unchanged; taps re-rank instantly (cookie) |
| N5 Gmail contextual sidebar | done, untested in Gmail | `gmail-addon/`, `/api/gmail` |
| N6 Booth | done | Oura, Lovable, Verda pinned by Cala id and precomputed |
| N7 Rerun ingest with the new key | done (partial by design) | users, rounds (with `is_lead`), news, 200 Nordic attendees, 69 foreign attendees. 281 profiles cached. Remaining attendees are opt-in (hours) |
| N8 Docs | done | BUILD_SPEC, README, DECISIONS, DATA_NOTES, DEMO |

## v1 (shipped, superseded where BUILD_SPEC says so)

M0–M6 done: Cala client (timeout, retries, pacing, cache), fund resolution, keyrings, door engine v1, timing jobs, UI, demo, docs. Data is partial: Cala credit ran out mid-ingest (HTTP 402).
