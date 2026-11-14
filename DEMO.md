# Faro: the 60-second demo (v3)

> **Faro tells you which companies just got a reason to partner (new money, new hires, new acquisitions), why they need you, and who can introduce you.**

Setup (offline, no key needed):

```bash
npm install && npm run build
CALA_OFFLINE=1 npm start
```

Open `http://localhost:3000/for/distance-technologies?booth=1` full screen (F11). Distance Technologies is a seed-stage Helsinki deep-tech startup. The booth holds back its top door.

| Time | Screen | Say |
|---|---|---|
| 0:00 | Booth, Distance Technologies | Read the north-star line. "It asked nothing: it read Distance's industry, headquarters and investors from Cala." |
| 0:10 | **Press space** | A line types itself in: *Volare raised a €7.1M Series A.* "New money, dated and sourced: 26 October, techfundingnews.com." |
| 0:20 | Second line | "Why you: Customer. A food company with fresh money is a buyer of deep tech. Matched on industry and headquarters, nothing guessed." |
| 0:28 | Third line | "Who can introduce you: Maki.vc, who led their round. And you'll meet them at Slush. Their CEO and CTO are named from Cala." |
| 0:36 | The other doors | "New hires: QMill grew from 4 to 15 people, also through Maki.vc. Market entry: Cerebras is entering Finland. Three reasons, three kinds of partnership." |
| 0:44 | `/for/measur` (no booth) | "Measur, materials testing in Finland. Vensum raised a €9M Series A, and Lifeline Ventures, who led it, is Measur's investor too. 'More like this' and 'not now' are the only questions Faro ever asks." Tap *more like this*. |
| 0:54 | `/for/riact`, then Gmail | "RiACT, robot software in Denmark: Zenniz grew from 12 to 19 people, through Butterfly Ventures. In Gmail, the same door appears when Zenniz emails you." |

Demo startups (seed stage, pinned by Cala id in `data/demo/startups.json`): `/for/distance-technologies`, `/for/measur`, `/for/riact` (add `?booth=1`; `&auto=6000` opens the door by itself after 6 s).

| Startup | Top 3 doors (first look) |
|---|---|
| Distance Technologies (FI, seed) | **New money:** Volare raised a €7.1M Series A, 26 Oct (techfundingnews.com · PRESS); customer; through Maki.vc, who led; at Slush · **New hires:** QMill grew from 4 to 15 people, 31 Dec 2025 (finder.fi); integration; through Maki.vc; at Slush · **Market entry:** Cerebras Systems is entering Finland, 13 Nov (fool.com); distribution; 2 CTOs |
| Measur (FI, seed) | **New money:** Vensum raised a €9M Series A, 6 Nov (tech.eu · PRESS); customer; through Lifeline Ventures, who led; at Slush · **New hires:** QMill grew from 4 to 15 people, 31 Dec 2025 (finder.fi); integration; at Slush · **Market entry:** Cerebras Systems is entering Finland, 13 Nov (fool.com); distribution |
| RiACT (DK, seed) | **New hires:** Zenniz grew from 12 to 19 people, 1 Dec 2025 (finder.fi); customer; through Butterfly Ventures; at Slush · **New money:** Birdsview raised a round, 1 Aug (finsmes.com); integration; through Butterfly Ventures · **Market entry:** Avanza is entering Denmark, 12 Oct (investors.avanza.se · PRIMARY); customer |

Ranking: any reason + warm path first, then any reason alone; Slush is a boost inside each. Every demo startup has warm-path doors (Distance 3 via Maki.vc, Measur 4 via Lifeline Ventures, RiACT 2 via Butterfly Ventures). Demo rules: no weapons makers, no giant leads a log (Cerebras stays third). Dalip left the demo: its investors are angels with no portfolios in Cala, so it can't get a warm path.

If asked about data: every door has a concrete date and a source (with its source rank: FILING, PRIMARY, PRESS or AGGREGATOR), or it isn't shown. See `DATA_NOTES.md`.
