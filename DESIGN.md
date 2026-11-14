# Design

Extracted from `https://cala.ai/assets/index-DqWhE9AI.css` (fetched 14 Nov 2026) and from Cala's own drawings (the Junction workshop deck). Faro lives in Cala's world: cream paper, ink line drawings, a yellow sun, a mint sea, soft peach. The palette and the line are Cala's; every drawing is Faro's own (a lighthouse, a cove, a small town). No Cala mascot, no copied illustration.

## Cala's palette (as declared in their CSS)

| Token (Cala) | Value | Faro role |
|---|---|---|
| `--color-beige` / `--background` | `#f6e8cd` | page background (paper) |
| `--color-beige-50` / `--card` | `#fcf8f0` | email body, quiet panels |
| `--color-beige-100` | `#f6e8cd` | — |
| `--color-beige-200` / `--accent` | `#f1dbb7` | hairlines on paper, input fill |
| `--color-brown-900` / `--foreground`, `--primary` | `oklch(32% .015 54.05)` | ink: text and line drawings |
| `--color-brown-500` / `--border`, `--muted-foreground` | `oklch(62.4% .028 52.01)` | secondary text, footnotes, rules |
| `--color-brown-300` | `oklch(77.7% .033 50.31)` | unlit windows, faint map lines |
| `--color-brown` | `#2e2723` | full-screen booth ink (deepest) |
| `--color-yellow` | `#ffc234` | **the one accent**: lit windows and the lighthouse beam |

Two more colours come from Cala's drawings, sampled from the deck. They are washes inside illustrations only, never UI, never text:

| Wash | Value | Where |
|---|---|---|
| mint sea | `#d6dec9` (`--sea`) | the sea on the startup screen and loader, the cove under the map, the email's bottom edge |
| soft peach | `#f6c3aa` (`--peach`) | the lighthouse's roof and bands, the roofs on the map |

Cala also declares blue (`#30bfff`), pink (`#e1bee6`), orange (`#fb6f3f`) and green. Faro doesn't use them. Still one accent: yellow, because a lighthouse emits it (the lamp, the beam, the low sun, a lit window). It never carries text (contrast on beige is too low); it only fills shapes.

## Cala's fonts

| Cala | Licence | Faro substitute |
|---|---|---|
| `tiempos` — Tiempos Headline Light (Klim) | commercial | **Newsreader** (Production Type, OFL): a transitional text serif with optical sizes, close in colour to Tiempos at display sizes |
| `waldenburg` — KMR Waldenburg (Kometa) | commercial | not used: Faro is serif + mono only |
| `Stefan-Simple`, `Stefan-Bubble` — ABC Stefan (Dinamo) | commercial | not used |
| `--font-mono` system mono stack | — | **IBM Plex Mono** (OFL) for dates, sources, counts |

Cala's licensed font files are served from cala.ai; Faro doesn't hotlink or redistribute them. Fonts are self-hosted through `@fontsource` packages so the booth works offline. No Instrument Serif, Inter, Playfair Display or Fraunces.

## Rules

- Paper `#f6e8cd`, ink brown-900, footnotes brown-500, light yellow; mint and peach as washes in drawings. Nothing else.
- No gradients, no shadows, no rounded cards, no emoji, no glass.
- Line: one confident pen stroke with a slight wobble (rough.js, single stroke, fixed seeds so drawings don't jitter between renders), about 2 px on screen. Horizons and streets are one line, lifted here and there.
- Colour: flat washes without outlines, laid a little off the ink line, the way a marker misses its outline.
- Motion, kept small: on the startup screen the lighthouse draws itself once and the colour arrives after; while Faro works the beam turns and the line boils (two drawings of the same lighthouse alternate); the swell drifts a few pixels. Everything stops under `prefers-reduced-motion`.
- Type: Newsreader only (light at display sizes, like Tiempos Headline Light). The headline's second sentence, the warm paths, is italic and a step smaller. Partnership types are small tracked capitals. Who can introduce you sits a shade darker than the rest of its line.
- Tone: terse, declarative, a little lyrical. "Eleven doors opened for Measur since December. Four through people you know."
- Booth: the log at 2 m means body copy ≥ 28 px in full-screen mode, headline ≥ 64 px (at 1920 × 1080: headline 67 px, why-now 39 px, why-you 29 px).

## The drawings

| Drawing | File | Notes |
|---|---|---|
| Lighthouse | `src/components/Lighthouse.tsx` | peach roof and bands, yellow lamp; `mark` (header, icons), `scene`, `sweeping`, `boil`, `draw` |
| The cove at dusk | `src/components/Shore.tsx` | mint sea, a half-set sun, the lighthouse in the water; shared by the startup screen and the loader, so one becomes the other without a jump |
| The town | `src/components/DoorMap.tsx` | the startup's house on the first street between its investors; each investor a building, each window a door, lit windows named above the roof; the cove below |
