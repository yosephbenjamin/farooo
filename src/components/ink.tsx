/**
 * Ink-line drawing helpers on top of rough.js's generator (no DOM needed, so it renders
 * identically on the server and the client). Fixed seeds keep drawings from jittering.
 *
 * The line is one confident pen stroke with a slight wobble; colour is a flat wash laid a
 * little off the line, the way a marker misses its outline (see DESIGN.md).
 */
import rough from "roughjs";
import type { Options } from "roughjs/bin/core";
import type { ReactNode } from "react";

const gen = rough.generator();

export const INK = "var(--ink)";
export const INK_FAINT = "var(--ink-300)";
export const LIGHT = "var(--light)";
export const SEA = "var(--sea)";
export const PEACH = "var(--peach)";

const base: Options = { roughness: 0.9, bowing: 1.1, strokeWidth: 1.5, stroke: INK, disableMultiStroke: true, disableMultiStrokeFill: true };

type Drawable = ReturnType<typeof gen.line>;

export function paths(d: Drawable, key: string | number, extra?: React.SVGProps<SVGPathElement>): ReactNode {
  return gen.toPaths(d).map((p, i) => (
    <path
      key={`${key}-${i}`}
      // round so server and browser floating point agree (no hydration mismatch)
      d={p.d.replace(/-?\d+\.\d+(e-?\d+)?/g, (v) => (Math.round(Number(v) * 100) / 100).toString())}
      stroke={p.stroke === "none" ? "none" : p.stroke}
      strokeWidth={p.strokeWidth}
      fill={p.fill ?? "none"}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      {...extra}
    />
  ));
}

export const ink = {
  line: (x1: number, y1: number, x2: number, y2: number, o: Options = {}) => gen.line(x1, y1, x2, y2, { ...base, ...o }),
  rect: (x: number, y: number, w: number, h: number, o: Options = {}) => gen.rectangle(x, y, w, h, { ...base, ...o }),
  poly: (pts: [number, number][], o: Options = {}) => gen.polygon(pts, { ...base, ...o }),
  circle: (x: number, y: number, d: number, o: Options = {}) => gen.circle(x, y, d, { ...base, ...o }),
  path: (d: string, o: Options = {}) => gen.path(d, { ...base, ...o }),
  curve: (pts: [number, number][], o: Options = {}) => gen.curve(pts, { ...base, ...o }),
};

/** A flat wash of colour: no outline, laid a little off the ink line it belongs to. */
export function wash(pts: [number, number][], fill: string, seed: number, key: string, off: [number, number] = [2, 1.5], extra?: React.SVGProps<SVGPathElement>): ReactNode {
  const moved = pts.map(([x, y]) => [x + off[0], y + off[1]] as [number, number]);
  return paths(gen.polygon(moved, { ...base, seed, stroke: "none", fill, fillStyle: "solid", roughness: 0.5 }), key, extra);
}

/** Deterministic small integer from a string (for per-item seeds). */
export function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (Math.abs(h) % 9000) + 1;
}
