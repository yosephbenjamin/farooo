# Faro: status (v3, see the north star at the top of BUILD_SPEC.md)

| Milestone | Status | Notes |
|---|---|---|
| N9 North-star reasons | done | new money (financing events, FundingRounds), new hires (headcount jump, new executives), new acquisitions (MNA_COMPLETED as acquirer); `--stage=signals` walked 100 keyring companies of the demo startups' investors in 117 calls; `--stage=reparse` rebuilds events from cache for free |
| N0 Spec | done | `BUILD_SPEC.md` written; v1 items reversed by the north star listed there |
| N1 Entity-only ingest v2 | done | prioritised, resumable, merge-safe; `/v1/knowledge/query` removed; 10 req/min pacing |
| N2 Market entry | partial | **news**: 10 entries after a widened pass (150 searches: 5 phrasings × FI SE NO DK DE UK NL FR, demo industries first) and strict rechecks: atNorth → Finland, Norway; Cerebras → Finland; Arondite → Norway; Tekever → Denmark; OpenAI, Google, Polar Capital → Sweden; Avanza → Denmark. **Subsidiaries**: 0 so far; the entrants pass is resuming (see N7). **Investors** fetched for every entrant |
| N3 Door engine v2 | done | five parts, tiers, taps, first look; codes that contradict the description → read from the description, marked † uncertain (atNorth); self-tested |
| N4 Web log v2 | done | design unchanged; taps re-rank instantly (cookie) |
| N5 Gmail contextual sidebar | done, ready to test | `gmail-addon/`, `/api/gmail`; name asked once on personal addresses; install steps in `GMAIL.md` (Vercel + script.google.com test deployment) |
| N6 Booth | done | Distance Technologies, Dalip, RiACT (seed stage); each first look has three different reasons; warm paths for Distance (Maki.vc) and RiACT (Butterfly Ventures); no weapons makers, no giant headlines |
| N7 Rerun ingest | partial | new key (14 Nov): 150 widened news searches + 819 entity calls succeeded, no 402. Entrants pass at 1,350 of 2,777 foreign attendees (stopped externally), 2 candidates, no subsidiary yet. Resume: `npm run ingest -- --stage=entrants,investors` (~1,400 calls), then `--stage=recheck` and `npm run demo` |
| N8 Docs | done | BUILD_SPEC, README, DECISIONS, DATA_NOTES, DEMO |

## v1 (shipped, superseded where BUILD_SPEC says so)

M0–M6 done: Cala client (timeout, retries, pacing, cache), fund resolution, keyrings, door engine v1, timing jobs, UI, demo, docs. Data is partial: Cala credit ran out mid-ingest (HTTP 402).
