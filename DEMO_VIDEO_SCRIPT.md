# Faro: 2-minute demo video script

**Hard cap: 2:00. Target runtime: 1:53, so there is a safety margin.** The voice-over is 237 words, about 1:38 at a calm 145 words per minute; the rest is silence while the screen does the work. Export, then check the file length before uploading: if the player says 2:00 or more, cut a line from the scenes marked ✂.

Upload to YouTube or Vimeo as **Public** (or *Unlisted* only if the rules allow it; "available for everyone" means Public is safest). Test the link in a private window.

## Before recording

```bash
npm install && npm run build
CALA_OFFLINE=1 npm start
```

- Browser full screen (F11), zoom 125%, notifications off, light mode (Faro is light only).
- Tabs ready, in this order: `http://localhost:3000/` · `http://localhost:3000/for/distance-technologies` · `http://localhost:3000/for/distance-technologies?booth=1` · Gmail with the add-on open (see `GMAIL.md`).
- Gmail: set Script property `FARO_TEST_SENDER` = `hello@volare.fi`, then open any email. **Delete it after recording.**
- Record at 1080p, screen capture plus voice only. No music over the voice; a quiet track at -25 dB is optional.
- Fill in your name in scene 2. If you'd rather not be on camera, use a still or your voice over the home page; keep the lower-third.
- Record the voice-over first, in one take per scene, then match the screen to it.

## Script

| Time | Screen | Voice-over |
|---|---|---|
| **0:00–0:11** | Black. White text fades in, one line at a time: *New funding. New hires. A move into your market.* | "Every week, a company gets a reason to partner with you. New funding. New hires. A move into your market. You hear about it months later, or never." |
| **0:11–0:21** | You on camera (or a still), with a plain lower-third: *[Your name], Partnerships Team Lead, Slush*. | "I'm [your name], I lead the partnerships team at Slush. Every startup we work with asks me the same thing: who should we meet, and who can introduce us?" |
| **0:21–0:31** | Home page `/`: "Which startup are you?" and the hand-drawn lighthouse, beam turning. | "That is what Faro answers. It tells you which companies just got a reason to partner, why they need you, and who can introduce you." |
| **0:31–0:43** | Type *Distance Technologies* into the one input, press Enter. The loading screen shows the lighthouse beam and Cala's steps. | "Take one of our startups, Distance Technologies. You type its name once. Faro reads industry, headquarters and investors from Cala." |
| **0:43–1:12** | The log, `/for/distance-technologies`. Slow zoom on the headline, then the first door (Volare). Highlight each part as it is spoken: the date and source footnote, the *Customer* line, *Maki.vc*, *Slush*, the CEO and CTO names. | "Every reason is dated and sourced. Volare raised a seven-million-euro Series A on 26 October, from techfundingnews. Why you: a food company with fresh money is a customer for deep tech. Who can introduce you: Maki.vc, who led the round. Volare will be at Slush, and their CEO and CTO are named." |
| **1:12–1:25** | Scroll to the next two doors, then the hand-drawn map (investors as buildings, lit windows as doors). | "Other reasons show up too. QMill grew from four to fifteen people. Cerebras is entering Finland, thirteen November. Three reasons, three kinds of partnership." |
| **1:25–1:36** | Tap **more like this** on one door. Similar doors appear below it, with a line saying so. ✂ | "Faro never asks what you want. Tap *more like this*, or *not now*, and it learns which kind of partner you want." |
| **1:36–1:47** | Switch to Gmail. Open the email from Volare. The sidebar header reads **A door, in your inbox** and shows the same door in five parts. ✂ | "And it follows you into Gmail. When Volare emails you, the sidebar shows why they matter, and who can introduce you." |
| **1:47–1:53** | Back to the lighthouse. Text: *Faro. Know who's coming. Find the way in.* Cala credit and "Built for Junction 2026" in small type. | "Every door has a date and a source, or it isn't shown. Faro. Built on Cala." |

**Word count by scene:** 28 + 29 + 25 + 20 + 52 + 24 + 22 + 21 + 16 = **237 words.** At 145 wpm that is about 1:38, leaving room for pauses, the loading screen and the end card. Record it, then time the real take: if it runs past 1:55, cut as described at the bottom.

## Why it is built this way

- **Problem in the first 11 seconds, then you.** The partnerships lead intro says why this matters to the person talking: Slush startups need introductions, and Faro finds them.
- **The product's own line is the pitch.** The north star from `BUILD_SPEC.md` is said once, in scene 3.
- **One startup, one door, end to end.** Volare carries scenes 5 and 8, so the viewer sees the same door in the web log and in Gmail.
- **Real, checkable data.** Every figure above comes from `data/demo/distance-technologies.json` (Volare: €7.1M Series A, 26 Oct 2026, techfundingnews.com, Maki.vc led, at Slush, CEO Jarna Hyvönen and CTO Matti Tähtinen; Cerebras: entering Finland, 13 Nov 2026, fool.com). QMill's hiring jump (4 to 15, finder.fi) is from `DEMO.md`.
- **Cala is named three times:** where the profile comes from, why the loading screen shows Cala's steps, and the closing credit.

## Things to avoid saying

- Don't claim live coverage of every company. The offline demo runs from stored Cala data and a precomputed set of three startups; say "from sourced data", not "real-time".
- Don't say Faro finds new local subsidiaries of foreign firms. That pass found none yet (`TODO.md`); today's market-entry doors come from news.
- Don't call the Gmail add-on published. It is a test deployment (`GMAIL.md`).
- Say "Series A", not "unicorn", "AI-powered" or similar. The design rules (`DESIGN.md`) keep the tone terse and a little lyrical; the voice should too.

## If you are over 2:00 after editing

Cut in this order: (1) scene 7, "more like this" (about 11 s), (2) the QMill sentence in scene 6 (about 4 s), (3) the Gmail scene 8 (about 11 s). Then re-export and re-check.
