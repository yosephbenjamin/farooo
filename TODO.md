# Faro: status (v2, see BUILD_SPEC.md)

| Milestone | Status | Notes |
|---|---|---|
| N0 Spec | done | `BUILD_SPEC.md` written; v1 items reversed by the north star listed there |
| N1 Entity-only ingest v2 | done | prioritised, resumable, merge-safe; `/v1/knowledge/query` removed; 10 req/min pacing |
| N2 Market entry | partial | news: 4 entries (atNorth → Finland, Cerebras → Finland, Arondite → Norway, Tekever → Denmark). Subsidiaries: detection runs over Slush attendees in the background; 0 found in the first 100 Nordic-named attendees (all new registrations were local startups) |
| N3 Door engine v2 | done | five parts, tiers, taps, first look; self-tested |
| N4 Web log v2 | done | design unchanged; taps re-rank instantly (cookie) |
| N5 Gmail contextual sidebar | done, untested in Gmail | `gmail-addon/`, `/api/gmail` |
| N6 Booth | done | Oura, Lovable, Verda pinned by Cala id and precomputed |
| N7 Rerun ingest with the new key | running | users, rounds and news done; Slush stage resumes from cache (`npm run ingest -- --stage=slush`), then `npm run demo` |
| N8 Docs | done | BUILD_SPEC, README, DECISIONS, DATA_NOTES, DEMO |

## v1 (shipped, superseded where BUILD_SPEC says so)

M0–M6 done: Cala client (timeout, retries, pacing, cache), fund resolution, keyrings, door engine v1, timing jobs, UI, demo, docs. Data is partial: Cala credit ran out mid-ingest (HTTP 402).
