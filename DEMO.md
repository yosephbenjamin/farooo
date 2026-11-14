# Faro: the 60-second demo (v2.1)

Setup (offline, no key needed):

```bash
npm install && npm run build
CALA_OFFLINE=1 npm start
```

Open `http://localhost:3000/for/distance-technologies?booth=1` full screen (F11). Distance Technologies is a seed-stage Helsinki deep-tech startup (mixed-reality displays). The booth holds back its top door.

| Time | Screen | Say |
|---|---|---|
| 0:00 | Booth, Distance Technologies | "Faro finds partners: which companies need you right now, why you, where to meet, who can introduce you. It works all year. It asked nothing: it read Distance's industry, headquarters and investors from Cala." |
| 0:10 | **Press space** | A line types itself in: *Cerebras Systems is entering Finland.* "Market entry comes first. Dated and sourced: the footnote says 13 November, fool.com." |
| 0:20 | Second line | "Why you: Distribution. They're new to Finland and sell to the buyers Distance already reaches. Matched on industry and headquarters, nothing guessed." |
| 0:28 | Third line | "Who: their CTOs, named from Cala. Where Cala has no one, a 'Find the right person →' search link. Faro never scrapes." |
| 0:36 | Point at the map | "Buildings are investors; windows are doors. The 'New in Finland' building holds newcomers without a warm path yet." |
| 0:44 | `/for/dalip` (no booth) | "Dalip, pre-seed AI in Oslo. Arondite, the UK defence-AI company, is opening its first international office in Oslo: a customer. The first log is three doors of different kinds; 'more like this' and 'not now' are the only questions Faro ever asks." Tap *more like this*. |
| 0:54 | `/for/riact`, then Gmail | "RiACT, robot software in Denmark: Tekever, the drone maker, opened its first Nordic base in Odense. In Gmail, the same door appears when Tekever emails you." |

Demo startups (all seed stage, pinned by Cala id in `data/demo/startups.json`): `/for/distance-technologies`, `/for/dalip`, `/for/riact` (add `?booth=1`; `&auto=6000` opens the door by itself after 6 s).

| Startup | Top door | Why you | Who |
|---|---|---|---|
| Distance Technologies (Finland, seed) | Cerebras Systems is entering Finland, 13 Nov 2026 (fool.com) | distribution / integration | 2 CTOs |
| Dalip (Norway, pre-seed) | Arondite is entering Norway, 12 Nov 2026 (gov.uk) | customer / integration / distribution | X-ray link |
| RiACT (Denmark, seed) | Tekever is entering Denmark, 10 Nov 2026 (investinodense.com) | customer / integration / distribution | 2 CEOs |

All three top doors are tier 3 (market entry). No seed-stage Nordic startup has a warm path into this week's entrants yet: their investors (Cerebras: Sequoia, Benchmark, Atreides…; Arondite: Creator Fund; Tekever: NSSIF, Cedrus; OpenAI: Khosla, Thrive, Point Nine…; Avanza: Creades) back no seed-stage company in the market each is entering. Oura reaches tier 2 (Cerebras, through Atreides Management) but isn't seed stage; `/for/oura` still works live.

If asked about data: every door has a concrete date and a source (with its source rank: FILING, PRIMARY, PRESS or AGGREGATOR), or it isn't shown. See `DATA_NOTES.md`.
