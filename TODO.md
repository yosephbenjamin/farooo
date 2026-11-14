# Faro: status

| Milestone | Status | Notes |
|---|---|---|
| M0 Setup | done | Next.js 15 + TS + Tailwind 4; Cala client: 90 s timeout, retries, pacing, on-disk cache |
| M1 Ingest + clean | done, partial data | 29/30 funds → 60 vehicles → 1,066 companies, 680 rounds. **Cala credit ran out (HTTP 402)** before company profiles and ~490 rounds were fetched; companies are minimal records built from link data. Re-run `npm run ingest` with a topped-up key to complete; cached calls are free. |
| M2 Door engine | done | `src/lib/doors.ts`; fit heuristic in `src/lib/sectors.ts` (sector lexicon + complement pairs, evidence from sourced article titles); optional Claude fit lines in `src/lib/llm.ts` |
| M3a Daily rounds job | done, data blocked | `npm run daily`. Verified Vensum (graph round + tech.eu). 35 of 36 queries couldn't run (402). |
| M3b Market-entry trigger | done, data blocked | `npm run market`. 9 sourced claims from the one cached search: 6 non-entries, 3 month-only dates → 0 events (correct). 9 of 10 searches couldn't run (402). |
| M4 UI | done | `/` question, `/for/<startup>` log + hand-drawn map, `/log` sent alerts as emails; Cala palette and stand-in fonts (DESIGN.md) |
| M5 Demo mode | done | Oura, Lovable, Verda precomputed in `data/demo/`; booth mode `?booth=1` with the scripted door-opens moment |
| M6 Ship | done | README, DATA_NOTES, DEMO, DECISIONS |
| Gmail add-on | done, untested | `gmail-addon/`, reads `/api/doors/<startup>` |

## Next, once the Cala balance is topped up

1. `npm run ingest` (fills company profiles, company-side links and remaining rounds; ~45 min).
2. `npm run enrich -- lifeline-ventures creandum byfounders tesi balderton-capital antler j12-ventures` (one-line descriptions for boilerplate companies).
3. `npm run daily && npm run market && npm run demo && npm run alerts`.
4. Optional: set `ANTHROPIC_API_KEY` before step 3 for Claude-written fit lines and claim extraction.
