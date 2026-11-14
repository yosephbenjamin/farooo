import type { ReactNode } from "react";
import { ink, paths, LIGHT } from "./ink";
import { Lighthouse } from "./Lighthouse";

const still = { vectorEffect: "non-scaling-stroke" as const };

/**
 * The cove at dusk: a mint sea across the bottom of the screen, a low sun on the horizon, the
 * lighthouse standing in the water. The startup screen and the loader share it, so one becomes
 * the other without a jump. Drawn by hand, in Faro's own line (see DESIGN.md).
 */
export function Shore({ children, sweeping = false, draw = false }: { children: ReactNode; sweeping?: boolean; draw?: boolean }) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden" aria-busy={sweeping || undefined}>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between px-5 sm:flex-row sm:items-end sm:justify-start sm:gap-[5vw] sm:px-10">
        <div className="order-1 w-full pt-[13vh] sm:order-2 sm:self-center sm:pb-[3vh] sm:pt-0">{children}</div>
        <Lighthouse scene sweeping={sweeping} boil={sweeping} draw={draw} className="relative z-10 order-2 -mb-[2.6vh] h-[36vh] w-auto shrink-0 self-start sm:order-1 sm:h-[56vh] sm:self-end" />
      </div>
      <div className="relative h-[17vh] bg-sea sm:h-[21vh]">
        {/* the sun, half set */}
        <svg viewBox="0 0 120 60" className={`absolute bottom-full right-[12%] h-[7vh] w-auto sm:right-[16%] sm:h-[9.5vh] ${draw ? "sun-in" : ""}`} aria-hidden>
          {paths(ink.path("M3 60 C3 27 28 3 60 3 C92 3 117 27 117 60 Z", { seed: 61, stroke: "none", fill: LIGHT, fillStyle: "solid", roughness: 0.7 }), "sun")}
        </svg>
        {/* the horizon: one pen line, lifted here and there, a little above the colour */}
        <svg viewBox="0 0 1440 12" preserveAspectRatio="none" className="absolute -top-[6px] left-0 h-[12px] w-full" aria-hidden>
          {([[0, 318], [344, 700], [726, 748], [790, 1166], [1196, 1440]] as const).map(([a, b], i) =>
            paths(ink.line(a, 6, b, 6, { seed: 70 + i, roughness: b - a < 60 ? 0.2 : 0.6, bowing: b - a < 60 ? 0 : 0.3, strokeWidth: 2 }), `hz-${i}`, still),
          )}
        </svg>
        {/* the sun on the water, and a few strokes of swell that drift */}
        <svg viewBox="0 0 1440 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          <g className="drift">
            {paths(ink.line(250, 58, 330, 58, { seed: 81, roughness: 0.5, bowing: 0.3, strokeWidth: 1.8 }), "sw1", still)}
            {paths(ink.line(352, 60, 372, 60, { seed: 82, roughness: 0.5, bowing: 0.3, strokeWidth: 1.8 }), "sw2", still)}
            {paths(ink.line(820, 132, 930, 132, { seed: 83, roughness: 0.5, bowing: 0.3, strokeWidth: 1.8 }), "sw3", still)}
            {paths(ink.line(1130, 34, 1190, 34, { seed: 88, stroke: LIGHT, roughness: 0.5, bowing: 0.3, strokeWidth: 2.5 }), "sr1", still)}
          </g>
          <g className="drift-back">
            {paths(ink.line(560, 96, 640, 96, { seed: 84, roughness: 0.5, bowing: 0.3, strokeWidth: 1.8 }), "sw4", still)}
            {paths(ink.line(1270, 150, 1350, 150, { seed: 85, roughness: 0.5, bowing: 0.3, strokeWidth: 1.8 }), "sw5", still)}
            {paths(ink.line(1372, 152, 1388, 152, { seed: 86, roughness: 0.5, bowing: 0.3, strokeWidth: 1.8 }), "sw6", still)}
            {paths(ink.line(1100, 78, 1210, 78, { seed: 89, stroke: LIGHT, roughness: 0.5, bowing: 0.3, strokeWidth: 2.5 }), "sr2", still)}
            {paths(ink.line(1140, 122, 1180, 122, { seed: 90, stroke: LIGHT, roughness: 0.5, bowing: 0.3, strokeWidth: 2.5 }), "sr3", still)}
          </g>
        </svg>
      </div>
    </main>
  );
}
