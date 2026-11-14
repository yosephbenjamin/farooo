# Design

Extracted from `https://cala.ai/assets/index-DqWhE9AI.css` (fetched 14 Nov 2026). Faro uses Cala's palette exactly.

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

Cala also declares blue (`#30bfff`), pink (`#e1bee6`), orange (`#fb6f3f`) and green. Faro doesn't use them: one accent, max. Yellow was chosen because a lighthouse emits it. It never carries text (contrast on beige is too low); it only fills shapes.

## Cala's fonts

| Cala | Licence | Faro substitute |
|---|---|---|
| `tiempos` — Tiempos Headline Light (Klim) | commercial | **Newsreader** (Production Type, OFL): a transitional text serif with optical sizes, close in colour to Tiempos at display sizes |
| `waldenburg` — KMR Waldenburg (Kometa) | commercial | not used: Faro is serif + mono only |
| `Stefan-Simple`, `Stefan-Bubble` — ABC Stefan (Dinamo) | commercial | not used |
| `--font-mono` system mono stack | — | **IBM Plex Mono** (OFL) for dates, sources, counts |

Cala's licensed font files are served from cala.ai; Faro doesn't hotlink or redistribute them. Fonts are self-hosted through `@fontsource` packages so the booth works offline. No Instrument Serif, Inter, Playfair Display or Fraunces.

## Rules

- Paper `#f6e8cd`, ink brown-900, footnotes brown-500, light yellow. Nothing else.
- No gradients, no shadows, no rounded cards, no emoji, no glass.
- Illustrations: ink-line SVG with a slight wobble (rough.js, fixed seeds so drawings don't jitter between renders). Stroke in ink, ~1.25 px.
- Type: Newsreader for headlines and prose (light weights at large sizes, like Tiempos Headline Light), Plex Mono at small sizes for data.
- Tone: terse, declarative, a little lyrical. "Three doors opened for Acme this week."
- Booth: the log at 2 m means body copy ≥ 28 px in full-screen mode, headline ≥ 64 px.
