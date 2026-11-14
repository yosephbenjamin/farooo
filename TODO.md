# Faro — status

| Milestone | Status | Notes |
|---|---|---|
| M0 Setup | done | Next.js 15 + TS + Tailwind 4, Cala client (90 s timeout, retries, disk cache, concurrency cap) |
| M1 Ingest + clean | in progress | 30 seed funds -> 60 vehicles; graph walk running (Cala rate limit ~1.5 req/s) |
| M2 Door engine | code written | `src/lib/doors.ts`, heuristic fit in `src/lib/sectors.ts`, optional LLM in `src/lib/llm.ts` |
| M3a Daily rounds job | code written | `scripts/daily-rounds.ts` |
| M3b Market-entry trigger | code written | `scripts/market-entry.ts` |
| M4 UI (question + log) | code written | `/`, `/for/[startup]`, `/log`; palette and fonts from cala.ai in DESIGN.md |
| M5 Demo mode | todo | |
| M6 Ship docs | todo | |
