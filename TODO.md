# Faro: status (v2, see BUILD_SPEC.md)

| Milestone | Status | Notes |
|---|---|---|
| N0 Spec | done | `BUILD_SPEC.md` written; v1 items reversed by the north star listed there |
| N1 Entity-only ingest v2 | done | prioritised, resumable, merge-safe; `/v1/knowledge/query` removed; 10 req/min pacing |
| N2 Market entry | partial | **news**: 10 entries after a widened pass (150 searches: 5 phrasings × FI SE NO DK DE UK NL FR, demo industries first) and strict rechecks: atNorth → Finland, Norway; Cerebras → Finland; Arondite → Norway; Tekever → Denmark; OpenAI, Google, Polar Capital → Sweden; Avanza → Denmark. **Subsidiaries**: 0 so far; the entrants pass is resuming (see N7). **Investors** fetched for every entrant |
| N3 Door engine v2 | done | five parts, tiers, taps, first look; codes that contradict the description → read from the description, marked † uncertain (atNorth); self-tested |
| N4 Web log v2 | done | design unchanged; taps re-rank instantly (cookie) |
| N5 Gmail contextual sidebar | done, ready to test | `gmail-addon/`, `/api/gmail`; name asked once on personal addresses; install steps in `GMAIL.md` (Vercel + script.google.com test deployment) |
| N6 Booth | done | Distance Technologies, Dalip, RiACT (seed stage, this week's entry doors) pinned by Cala id and precomputed; Oura and Verda left (not seed stage) |
| N7 Rerun ingest with the new key | done (partial: credit ran out) | users, rounds (with `is_lead`), news, 200 Nordic attendees, 671 foreign attendees (607 calls this pass, ended on 402). 282 profiles cached |
| N8 Docs | done | BUILD_SPEC, README, DECISIONS, DATA_NOTES, DEMO |

## v1 (shipped, superseded where BUILD_SPEC says so)

M0–M6 done: Cala client (timeout, retries, pacing, cache), fund resolution, keyrings, door engine v1, timing jobs, UI, demo, docs. Data is partial: Cala credit ran out mid-ingest (HTTP 402).
