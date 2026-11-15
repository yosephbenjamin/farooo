# Faro: 2-minute demo video script

**Hard cap: 2:00. Target runtime: about 1:38, so there are about 20 seconds of margin.** The voice-over is 204 words, about 1:24 at a calm 145 words per minute; the rest is pauses, the loading screen and the end card. Export, then check the file length before uploading: it must read 1:59 or less, and under 1:50 is safer.

Upload to YouTube or Vimeo as **Public** ("available for everyone"). Test the link in a private window.

## Before recording

```bash
npm install && npm run build
CALA_OFFLINE=1 npm start
```

- Browser full screen (F11), zoom 125%, notifications off, light mode (Faro is light only).
- Tabs ready, in this order: `http://localhost:3000/` · `http://localhost:3000/for/measur` · Gmail with the add-on open (see `GMAIL.md`).
- Gmail: set Script property `FARO_TEST_SENDER` = `hello@vensum.com` (Vensum's domain in Cala is `vensum.com`), then open any email. **Delete it after recording.**
- Fill in your name in scene 2. If you'd rather not be on camera, use a still or your voice over the home page; keep the lower-third.
- Record at 1080p, screen capture plus voice. Record the voice-over first, one take per scene, then match the screen to it.

## Script

| Time | Screen | Voice-over |
|---|---|---|
| **0:00–0:08** | Black. White text fades in, one line at a time: *New funding. New hires. A move into your market.* | "Every week, a company gets a reason to partner with you. You usually hear about it months later, or never." |
| **0:08–0:17** | You on camera (or a still), with a plain lower-third: *[Your name], Partnerships Team Lead, Slush*. | "I'm [your name], I lead partnerships at Slush. Startups keep asking me: who should we meet, and who can introduce us?" |
| **0:17–0:26** | Home page `/`: "Which startup are you?" and the hand-drawn lighthouse, beam turning. | "Faro answers that. It shows which companies just got a reason to partner, why they need you, and who can introduce you." |
| **0:26–0:36** | Type *Measur* into the one input, press Enter. The loading screen shows the lighthouse beam and Cala's steps. | "Take Measur, a Finnish startup. Type its name once. Faro reads its industry, headquarters and investors from Cala." |
| **0:36–0:58** | The log, `/for/measur`. Slow zoom on the headline, then the first door (Vensum). Highlight each part as it is spoken: the date and source footnote, the *Customer* line, *Lifeline Ventures*, *Slush*. | "Every reason is dated and sourced. Vensum raised a nine-million-euro Series A on 6 November, per tech.eu. Why you: an energy company with fresh money is a customer. Who introduces you: Lifeline Ventures, who led the round and backs Measur too. And Vensum will be at Slush." |
| **0:58–1:08** | Scroll to the next two doors (QMill, Cerebras), then the hand-drawn map. | "Other doors: QMill grew from four to fifteen people. Cerebras is entering Finland. Different reasons, different partnerships." |
| **1:08–1:28** | Switch to Gmail. Open the email from Vensum. Zoom to the sidebar: header **A door, in your inbox**, then the lead line, why-you, the warm path and "Find the right person". End wide on the whole Gmail window. | "And in Gmail, when Vensum emails you, the same door appears right next to the message. Faro knows you from your work email, so there's nothing to set up. Why they matter, why you, and who can introduce you, without leaving your inbox." |
| **1:28–1:38** | Back to the lighthouse. Text: *Faro. Know who's coming. Find the way in.* Cala credit and "Built for Junction 2026" in small type. | "Every door has a date and a source, or it isn't shown. Faro. Built on Cala." |

**Word count by scene:** 20 + 21 + 22 + 18 + 47 + 17 + 43 + 16 = **204 words.**

## Why it is built this way

- **Problem in 8 seconds, then you.** The partnerships-lead intro says why this matters to the person talking: Slush startups need introductions, and Faro finds them.
- **The product's own line is the pitch.** The north star from `BUILD_SPEC.md` is said once, in scene 3.
- **One startup, one door, end to end.** Vensum carries scenes 5 and 7, so the viewer sees the same door in the web log and in Gmail.
- **Real, checkable data.** Every figure comes from `data/demo/measur.json` (Vensum: €9M Series A, 6 Nov 2026, tech.eu, Lifeline Ventures led, at Slush; QMill: 4 to 15 people, finder.fi; Cerebras: entering Finland, 13 Nov 2026, fool.com).
- **Cala is named three times:** where the profile comes from, why the loading screen shows Cala's steps, and the closing credit.

## Things to avoid saying

- Don't claim live coverage of every company. The offline demo runs from stored Cala data and a precomputed set of three startups; say "from sourced data", not "real-time".
- Don't say Faro finds new local subsidiaries of foreign firms. That pass found none yet (`TODO.md`); today's market-entry doors come from news.
- Don't call the Gmail add-on published. It is a test deployment (`GMAIL.md`).
- Don't name Vensum's people. Cala has no named contacts for Vensum, so the door shows a "Find the right person" link instead.
- Don't say "unicorn", "AI-powered" or similar. The design rules (`DESIGN.md`) keep the tone terse and a little lyrical; the voice should too.

## If you want to add back, or are still long

- Over 1:50 after editing: cut the QMill and Cerebras sentence (scene 6, about 8 s), then shorten the intro.
- Under 1:35 and want more: add *"Tap more like this, or not now, and Faro learns which kind of partner you want."* after scene 6 (about 6 s) while you tap a door.
