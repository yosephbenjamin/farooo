# Faro: the 60-second demo

> **Faro tells you which companies just got a reason to partner (new money, new hires, new acquisitions), why they need you, and who can introduce you.**

Everything below is frozen in `data/demo/`. Nothing calls Cala, so nobody waits.

## Before you start

```bash
npm install && npm run build
```

```bash
CALA_OFFLINE=1 npm start
```

Open three tabs, full screen (F11), in this order:

1. `http://localhost:3000/for/distance-technologies?booth=1`
2. `http://localhost:3000/for/riact?booth=1`
3. Gmail, with the Faro sidebar open on any email (see "The Gmail moment" below)

Booth mode holds back each startup's best warm-path door until you press **space**.

## The script

| Time | Screen | Do | Say |
|---|---|---|---|
| 0:00 | Tab 1, Distance Technologies | Nothing yet | "Faro tells you which companies just got a reason to partner: new money, new hires, new acquisitions. Why they need you. And who can introduce you." |
| 0:08 | Same | Point at the headline | "Distance Technologies, mixed-reality displays from Helsinki. Eleven doors opened since December. Three through people they know. Faro asked them nothing." |
| 0:16 | Same | **Press space** | Let the line type itself: *Volare raised a €7.1M Series A.* "New money. Dated 26 October, sourced." |
| 0:22 | Same | Point at the two lines under it | "Why they need you: a customer, a food company with money to spend. Who can introduce you: Maki.vc led their round and backs you too. They'll be at Slush. Ask for the CEO, by name." |
| 0:32 | Same | Point at the map | "That's the window that just lit, in Maki.vc's building." |
| 0:36 | Tab 2, RiACT | **Press space** | "RiACT, robot software from Denmark. A different reason: new hires. Zenniz grew from 12 people to 19. Butterfly Ventures backs them both." |
| 0:46 | Tab 3, Gmail | Open the email | "And when Volare writes to you, the door is already in your inbox. Same fact, same source, same introducer. No tab to remember." |
| 0:56 | Same | Stop | "Every line comes from Cala, with a date and a source, or it isn't shown." |

If you have ten more seconds: on a normal log (no `?booth=1`), tap **more like this** under a door. Two similar doors appear below it. That tap and **not now** are the only questions Faro ever asks.

## The three doors

| Startup | Its best warm-path door | Why now (source) | Why you | Who can introduce you |
|---|---|---|---|---|
| **Distance Technologies** (Finland) | Volare | Raised a €7.1M Series A, 26 Oct 2026 (techfundingnews.com, press) | Customer | Maki.vc led their round and backs you too. At Slush 2026. Ask for Jarna Hyvönen, CEO, or Matti Tähtinen, CTO |
| **RiACT** (Denmark) | Zenniz | Grew from 12 people to 19, 1 Dec 2025 (finder.fi) | Customer | Butterfly Ventures backs you both. At Slush 2026. Ask for Eero Kuusi, CEO |
| **Measur** (Finland), backup | Vensum | Raised a €9M Series A, 6 Nov 2026 (tech.eu, press) | Customer | Lifeline Ventures led their round and backs you too. At Slush 2026 |

These are the doors booth mode opens (`data/demo/scripted.json`): each one is the startup's top-ranked door, and all three have a warm path.

## The Gmail moment

Set up once, following `GMAIL.md` (Faro on a public URL, the add-on as a test deployment). Then:

1. In the sidebar, type **Distance Technologies** once.
2. In Apps Script, Project Settings, Script properties, set `FARO_TEST_SENDER` = `hello@volare.fi`.
3. Open any email. The card reads **One of your doors** and shows Volare: the round, why you, Maki.vc.

For RiACT use `hello@zenniz.com`; for Measur, `hello@vensum.com`. Delete `FARO_TEST_SENDER` after the demo.

No Gmail on the day? Show the same door as JSON, from the same data:

```bash
curl "http://localhost:3000/api/gmail?user=you@gmail.com&startup=Distance%20Technologies&sender=hello@volare.fi"
```

## If something goes wrong

| Problem | Do this |
|---|---|
| A tab misbehaves | Open the backup: `http://localhost:3000/for/measur?booth=1`, press space. Vensum raised a €9M Series A; Lifeline Ventures led it and backs Measur too. |
| Space does nothing | Click the page first, or click **Open the door** (top right). |
| You want it hands-free | Add `&auto=6000`: the door opens by itself after six seconds. |
| Someone types an unknown startup | The loader shows the lighthouse at work. Offline, it ends in "The lighthouse can't see X yet." Go back to a demo startup. |

## If asked

- **Where does it come from?** Cala's entity graph: funding rounds, headcount series, executives, corporate events, investors. Each door has a concrete date and a source with its rank (filing, primary, press), or it isn't shown. See `DATA_NOTES.md`.
- **How is it ranked?** A reason with a warm path beats a reason alone. Slush is a boost, not a tier. A giant never leads.
- **What did it ask the user?** Nothing. A startup's name on the web, the email domain in Gmail.
