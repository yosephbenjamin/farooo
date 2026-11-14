# Faro: the 60-second demo (v2)

Setup (offline, no key needed):

```bash
npm install && npm run build
CALA_OFFLINE=1 npm start
```

Open `http://localhost:3000/for/verda?booth=1` full screen (F11). Verda is a Finnish AI-cloud startup. The booth holds back its top door.

| Time | Screen | Say |
|---|---|---|
| 0:00 | Booth, Verda | "Faro tells you which companies are entering your market, which you'll meet at Slush, who can introduce you, and why they need you. It asks nothing: it read Verda's industry, headquarters and investors from Cala." |
| 0:10 | **Press space** | A line types itself in: *Cerebras Systems is entering Finland.* "Market entry comes first. Dated and sourced: the footnote says 13 November, fool.com." |
| 0:20 | Second line | "Why you: Distribution. They're new to Finland and sell hardware to buyers Verda already reaches. Matched on industry and headquarters, nothing guessed from text." |
| 0:28 | Third line | "Who: their CTOs, from Cala. Where Cala has no one, there's a 'Find the right person →' search link. Faro never scrapes." |
| 0:36 | Point at the map | "Verda in the middle. Buildings are investors; windows are doors. The 'New in Finland' building holds newcomers without a warm path." |
| 0:44 | `/for/lovable` (no booth) | "On the web, the first log is three doors of different kinds: customer, integration, distribution. 'More like this' and 'not now' are the only questions Faro ever asks, and it never asks them out loud." Tap *more like this*. |
| 0:54 | Bottom line | "Door Count: which investor opens the most doors. In Gmail, the same door appears when that company emails you." |

Other demo startups: `/for/oura`, `/for/lovable`, `/for/verda` (add `?booth=1`; `&auto=6000` opens the door by itself after 6 s).

If asked about data: every door has a concrete date and a source (with its source rank: FILING, PRIMARY, PRESS or AGGREGATOR), or it isn't shown. See `DATA_NOTES.md`.
