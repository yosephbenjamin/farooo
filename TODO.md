# Faro: status (v2, see BUILD_SPEC.md)

| Milestone | Status | Notes |
|---|---|---|
| N0 Spec | done | `BUILD_SPEC.md` written; v1 items reversed by the north star listed there |
| N1 Entity-only ingest v2 | todo | profiles with `website`, `founding_date` (+ `source_rank`), industries, HQ, domains, people, Slush attendance; `FundingRound` participants with `is_lead`; drop `/v1/knowledge/query` |
| N2 Market entry | todo | (a) national subsidiaries: FILING `founding_date` + website match; (b) expansion news from search |
| N3 Door engine v2 | todo | five parts; partnership type from industry × HQ; tiers; tap weights; drop doors without a reason |
| N4 Web log v2 | todo | identity asked once; first log = three doors of different types with "more like this · not now"; five-part entries; `source_rank` in footnotes; design unchanged |
| N5 Gmail contextual sidebar | todo | identity from the user's domain; door shown when a matching company emails |
| N6 Booth | todo | precomputed startups skip identity; scripted door-opens moment offline |
| N7 Rerun ingest with the new key | blocked | no working Cala key yet (old key: HTTP 402) |
| N8 Docs | todo | README, DATA_NOTES, DEMO, DECISIONS |

## v1 (shipped, superseded where BUILD_SPEC says so)

M0–M6 done: Cala client (timeout, retries, pacing, cache), fund resolution, keyrings, door engine v1, timing jobs, UI, demo, docs. Data is partial: Cala credit ran out mid-ingest (HTTP 402).
