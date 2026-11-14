import type { ReactNode } from "react";
import { ink, paths, wash, LIGHT, PEACH, SEA } from "./ink";

interface Props {
  className?: string;
  lit?: boolean;
  /** The loading state: one long beam turns slowly around the lamp, passing behind the tower. */
  sweeping?: boolean;
  /** The line "boils" (two drawings of the same lighthouse alternate): it is at work. */
  boil?: boolean;
  /** The ink lines draw themselves once, then the colour arrives. */
  draw?: boolean;
  /** Standing in the Shore scene: no water of its own. */
  scene?: boolean;
  /** A small mark (the header): heavier line, no fine detail. */
  mark?: boolean;
}

const PAPER = "var(--paper)";
// tower edges at height y (it tapers from the gallery down to the rock)
const L = (y: number) => 96 - ((y - 75) * 10) / 121;
const R = (y: number) => 124 + ((y - 75) * 10) / 121;
const band = (y1: number, y2: number): [number, number][] => [[L(y1), y1], [R(y1), y1], [R(y2), y2], [L(y2), y2]];

/**
 * A small hand-drawn lighthouse: ink line, peach bands, a yellow lamp. Faro's own drawing.
 */
export function Lighthouse({ className, lit = true, sweeping = false, boil = false, draw = false, scene = false, mark = false }: Props) {
  const sw = mark ? 5 : scene ? 1 : 1.5;
  const o = (seed: number, more: object = {}) => ({ seed, strokeWidth: sw, ...more });
  const fine = (seed: number) => ({ seed, strokeWidth: scene ? 0.85 : 1.1 });

  /** Every ink line of the lighthouse, drawn with seeds from `s`. */
  const lines = (s: number): ReactNode => (
    <>
      {paths(ink.poly([[96, 75], [124, 75], [134, 196], [86, 196]], o(s + 12)), "tower")}
      {paths(ink.rect(90, 68, 40, 7, o(s + 8)), "gallery")}
      {paths(ink.rect(97, 44, 26, 24, o(s + 5)), "lamproom")}
      {paths(ink.poly([[93, 44], [110, 25], [127, 44]], o(s + 3)), "roof")}
      {paths(ink.line(110, 25, 110, 15, o(s + 4)), "finial")}
      {!mark && (
        <>
          {paths(ink.line(110, 44, 110, 68, fine(s + 7)), "mullion")}
          {paths(ink.line(90, 61, 130, 61, fine(s + 11)), "rail")}
          {paths(ink.line(92, 68, 92, 61, fine(s + 9)), "rail1")}
          {paths(ink.line(128, 68, 128, 61, fine(s + 10)), "rail2")}
          {paths(ink.line(L(106), 106, R(106), 106, o(s + 13)), "band1")}
          {paths(ink.line(L(126), 126, R(126), 126, o(s + 14)), "band1b")}
          {paths(ink.line(L(150), 150, R(150), 150, o(s + 15)), "band2")}
          {paths(ink.line(L(170), 170, R(170), 170, o(s + 16)), "band2b")}
          {paths(ink.path("M104 196 L104 183 Q110 175 116 183 L116 196", o(s + 17)), "door")}
          {paths(ink.rect(106, 86, 8, 11, fine(s + 18)), "win")}
        </>
      )}
      {paths(ink.curve([[58, 201], [78, 193], [100, 197], [124, 193], [146, 198], [166, 203]], o(s + 19)), "rock")}
      {!scene && !mark && (
        <>
          {paths(ink.line(30, 216, 62, 215, fine(s + 20)), "wave1")}
          {paths(ink.line(72, 216, 80, 216, fine(s + 21)), "wave1b")}
          {paths(ink.line(140, 224, 190, 223, fine(s + 22)), "wave2")}
          {paths(ink.line(96, 231, 122, 231, fine(s + 23)), "wave3")}
        </>
      )}
    </>
  );

  const s = 7;
  return (
    <svg
      viewBox={scene ? "34 0 152 208" : mark ? "40 6 140 204" : "0 0 220 240"}
      className={`overflow-visible ${className ?? ""}`}
      role="img"
      aria-label={sweeping ? "A hand-drawn lighthouse, its beam turning" : "A hand-drawn lighthouse"}
    >
      {/* the sea it stands in (the Shore scene brings its own) */}
      {!scene && !mark && <g className={draw ? "wash-in" : undefined}>{wash([[20, 206], [198, 204], [204, 236], [14, 238]], SEA, s + 40, "sea", [0, 0])}</g>}
      {/* the turning beam (loading) */}
      {sweeping && (
        <g className="sweep" style={{ transformOrigin: "110px 56px" }}>
          {wash([[110, 56], [226, 28], [226, 84]], LIGHT, s + 30, "sweepbeam", [0, 0], { opacity: 0.7 })}
        </g>
      )}
      {/* paper behind the tower, so the turning beam passes behind it */}
      {sweeping && wash([[93, 44], [110, 25], [127, 44], [126, 68], [130, 68], [130, 75], [124, 75], [134, 196], [86, 196], [96, 75], [90, 75], [90, 68], [94, 68]], PAPER, s + 33, "occlude", [0, 0])}
      {/* the resting beams */}
      {lit && !sweeping && !mark && (
        <g className={draw ? "wash-in" : undefined}>
          <g className="beam">
            {wash([[110, 56], [10, 36], [10, 76]], LIGHT, s + 1, "beamL", [0, 0], { opacity: 0.5 })}
            {wash([[110, 56], [210, 38], [210, 74]], LIGHT, s + 2, "beamR", [0, 0], { opacity: 0.5 })}
          </g>
        </g>
      )}
      {/* colour: peach roof and bands, the yellow lamp */}
      <g className={draw ? "wash-in" : undefined}>
        {wash([[93, 44], [110, 25], [127, 44]], PEACH, s + 41, "roofwash", mark ? [0, 0] : [2.5, 1.5])}
        {wash(band(106, 126), PEACH, s + 42, "bandwash1", mark ? [0, 0] : [2.5, 1.5])}
        {wash(band(150, 170), PEACH, s + 43, "bandwash2", mark ? [0, 0] : [2.5, 1.5])}
        {lit && wash([[100, 47], [121, 47], [121, 66], [100, 66]], LIGHT, s + 6, "lamp", mark ? [0, 0] : [1, 0.5])}
      </g>
      {/* ink */}
      {boil ? (
        <>
          <g className="boil-a">{lines(s)}</g>
          <g className="boil-b">{lines(s + 200)}</g>
        </>
      ) : (
        <g className={draw ? "draw" : undefined}>{lines(s)}</g>
      )}
    </svg>
  );
}
