# Faro: status (v2, see BUILD_SPEC.md)

| Milestone | Status | Notes |
|---|---|---|
| N0 Spec | done | `BUILD_SPEC.md` written; v1 items reversed by the north star listed there |
| N1 Entity-only ingest v2 | done | prioritised, resumable, merge-safe; `/v1/knowledge/query` removed; 10 req/min pacing |
| N2 Market entry | partial | **news**: 4 entries (atNorth → Finland, Cerebras → Finland, Arondite → Norway, Tekever → Denmark). **Subsidiaries**: 0. All 200 Nordic-named Slush attendees checked; foreign attendees: 671 of 2,777 searched (industry-adjacent to the demo startups first), 1 candidate (Nanzen AB, founded Mar 2025: outside the 365-day window), no entry. Stopped on HTTP 402. Remaining 2,106 attendees ≈ 2,100 uncached calls (~3.5 h at 10 req/min): `npm run ingest -- --stage=entrants` once credit is topped up; it resumes from cache |
| N3 Door engine v2 | done | five parts, tiers, taps, first look; codes that contradict the description → read from the description, marked † uncertain (atNorth); self-tested |
| N4 Web log v2 | done | design unchanged; taps re-rank instantly (cookie) |
| N5 Gmail contextual sidebar | done, untested in Gmail | `gmail-addon/`, `/api/gmail` |
| N6 Booth | done | Oura, RiACT, Verda pinned by Cala id and precomputed. RiACT (Danish seed robot software, at Slush) replaced Lovable; its top door is tier 3 (Tekever → Denmark): no entrant attends Slush yet, so tier 1 is unreachable (DECISIONS 38) |
| N7 Rerun ingest with the new key | done (partial: credit ran out) | users, rounds (with `is_lead`), news, 200 Nordic attendees, 671 foreign attendees (607 calls this pass, ended on 402). 282 profiles cached |
| N8 Docs | done | BUILD_SPEC, README, DECISIONS, DATA_NOTES, DEMO |

## v1 (shipped, superseded where BUILD_SPEC says so)

M0–M6 done: Cala client (timeout, retries, pacing, cache), fund resolution, keyrings, door engine v1, timing jobs, UI, demo, docs. Data is partial: Cala credit ran out mid-ingest (HTTP 402).
