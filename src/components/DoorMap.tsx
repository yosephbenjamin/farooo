import type { ReactNode } from "react";
import { ink, paths, seedOf, wash, INK_FAINT, LIGHT, PEACH, SEA } from "./ink";

export interface MapDoor {
  id: string;
  name: string;
  investorIds: string[];
  lit: boolean;
}

export interface MapProps {
  startup: string;
  investors: { id: string; name: string }[];
  doors: MapDoor[];
  /** A window that lights up with an animation (the scripted moment). */
  animateId?: string | null;
  /** Hide this window's light until revealed. */
  holdId?: string | null;
  className?: string;
  maxPerInvestor?: number;
  /** Larger labels for booth mode (read from 2 m). */
  big?: boolean;
}

const SLOT = 205;
const W = SLOT * 3;
const COLS = 5;
const WW = 15; // window width
const WH = 20; // window height
const GX = 8;
const GY = 9;
const PAD = 13;
const BW = COLS * WW + (COLS - 1) * GX + PAD * 2;
const ROOF = 24;
const MAX_LABELS = 6;

const r2 = (v: number) => Math.round(v * 10) / 10;

/**
 * Hand-drawn map: a small town on the cove. The startup's house stands on the first street,
 * between its investors; each investor is a building whose windows are its doors (its keyring).
 * A lit window is a door in the log, and its name hangs above the roof.
 */
export function DoorMap({ startup, investors, doors, animateId, holdId, className, maxPerInvestor = 25, big = false }: MapProps) {
  const sc = big ? 1.12 : 1;
  const inv = investors.slice(0, 6);
  const LINE = 26 * sc; // label line height

  // each door lives in the building of its first investor
  const homes = new Map<string, MapDoor[]>();
  for (const d of doors) {
    const home = d.investorIds.find((id) => inv.some((i) => i.id === id));
    if (home) homes.set(home, [...(homes.get(home) ?? []), d]);
  }

  const buildings = inv.map((iv) => {
    const all = [...(homes.get(iv.id) ?? [])].sort((a, b) => Number(b.lit || b.id === holdId) - Number(a.lit || a.id === holdId));
    const shown = all.slice(0, maxPerInvestor);
    const rows = Math.max(3, Math.ceil(shown.length / COLS));
    const lit = shown.map((d, k) => ({ d, k })).filter(({ d }) => d.id === animateId || (d.lit && d.id !== holdId));
    // room is kept for a held window's name, so nothing moves when it lights
    const labels = Math.min(MAX_LABELS, lit.length + (shown.some((d) => d.id === holdId) ? 1 : 0));
    return { iv, all, shown, lit, labels, bh: rows * WH + (rows - 1) * GY + PAD * 2 };
  });

  // streets: the house between the first two investors, then three buildings to a street
  type Item = { house: true } | { house?: false; b: (typeof buildings)[number] };
  const first: Item[] = buildings.length === 0 ? [{ house: true }] : buildings.length === 1 ? [{ house: true }, { b: buildings[0] }] : [{ b: buildings[0] }, { house: true }, { b: buildings[1] }];
  const streets: Item[][] = [first];
  for (let i = 2; i < buildings.length; i += 3) streets.push(buildings.slice(i, i + 3).map((b) => ({ b })));

  let y = 8;
  const out: ReactNode[] = [];
  streets.forEach((street, si) => {
    const labelSpace = Math.max(0, ...street.map((it) => (it.house ? 0 : it.b.labels))) * LINE + 16;
    const tallest = Math.max(64, ...street.map((it) => (it.house ? 0 : it.b.bh))) + ROOF;
    const ground = r2(y + labelSpace + tallest);
    const x0 = (W - street.length * SLOT) / 2;
    // the street: one pen line, lifted once
    out.push(paths(ink.line(x0 + 6, ground, x0 + street.length * SLOT * 0.62, ground, { seed: 300 + si, roughness: 0.6, bowing: 0.3, strokeWidth: 1.4 }), `g1-${si}`));
    out.push(paths(ink.line(x0 + street.length * SLOT * 0.62 + 18, ground, x0 + street.length * SLOT - 6, ground, { seed: 320 + si, roughness: 0.6, bowing: 0.3, strokeWidth: 1.4 }), `g2-${si}`));
    street.forEach((it, i) => {
      const cx = r2(x0 + SLOT * (i + 0.5));
      if (it.house) {
        // the startup: a small house with one lit window
        out.push(
          <g key="house">
            {wash([[cx - 30, ground - 40], [cx, ground - 68], [cx + 30, ground - 40]], PEACH, 14, "h-roofwash", [3, 1.5])}
            {paths(ink.rect(cx - 24, ground - 40, 48, 40, { seed: 12, fill: "var(--paper)", fillStyle: "solid" }), "h-body")}
            {paths(ink.poly([[cx - 30, ground - 40], [cx, ground - 68], [cx + 30, ground - 40]], { seed: 11 }), "h-roof")}
            <rect x={cx - 8} y={ground - 29} width={16} height={18} fill={LIGHT} />
            {paths(ink.rect(cx - 8, ground - 29, 16, 18, { seed: 13, strokeWidth: 1.1, roughness: 0.6 }), "h-win")}
            <text x={cx} y={r2(ground - 80)} textAnchor="middle" fontFamily="var(--font-serif)" fontSize={r2(21 * sc)} fill="var(--ink-deep)">
              {startup}
            </text>
            {buildings.length === 0 && (
              <text x={cx} y={r2(ground + 26 * sc)} textAnchor="middle" fontFamily="var(--font-serif)" fontStyle="italic" fontSize={16} fill="var(--ink-500)">
                no investors in view
              </text>
            )}
          </g>,
        );
        return;
      }
      const { iv, all, shown, lit, bh } = it.b;
      const bx = r2(cx - BW / 2);
      const by = r2(ground - bh);
      const seed = seedOf(iv.id);
      const top = by - ROOF;
      const roof: [number, number][] = [[bx - 6, by], [cx, top], [bx + BW + 6, by]];
      const more = lit.length > MAX_LABELS ? lit.length - (MAX_LABELS - 1) : 0;
      const named = more ? lit.slice(0, MAX_LABELS - 1) : lit;
      out.push(
        <g key={iv.id}>
          {wash(roof, PEACH, seed + 3, `roofwash-${iv.id}`, [3, 1.5])}
          {paths(ink.rect(bx, by, BW, bh, { seed: seed + 1, fill: "var(--paper)", fillStyle: "solid" }), `b-${iv.id}`)}
          {paths(ink.poly(roof, { seed: seed + 2 }), `roof-${iv.id}`)}
          {shown.map((d, k) => {
            const wx = r2(bx + PAD + (k % COLS) * (WW + GX));
            const wy = r2(by + PAD + Math.floor(k / COLS) * (WH + GY));
            const isAnim = d.id === animateId;
            const isLit = isAnim || (d.lit && d.id !== holdId);
            return (
              <g key={d.id} data-door={d.id}>
                {isLit && <rect x={wx} y={wy} width={WW} height={WH} fill={isAnim ? "transparent" : LIGHT} className={isAnim ? "window-lit-anim" : undefined} />}
                {paths(ink.rect(wx, wy, WW, WH, { seed: seedOf(d.id), strokeWidth: isLit ? 1.2 : 0.9, roughness: 0.7, stroke: isLit ? "var(--ink)" : INK_FAINT }), `w-${d.id}`)}
              </g>
            );
          })}
          {/* the investor, under the street */}
          <text x={cx} y={r2(ground + 24 * sc)} textAnchor="middle" fontFamily="var(--font-serif)" fontSize={r2(13 * sc)} letterSpacing={1.3} fill="var(--ink-500)">
            {iv.name.toUpperCase()}
          </text>
          {all.length > shown.length && (
            <text x={cx} y={r2(ground + 43 * sc)} textAnchor="middle" fontFamily="var(--font-serif)" fontStyle="italic" fontSize={r2(14 * sc)} fill="var(--ink-500)">
              and {all.length - shown.length} more
            </text>
          )}
          {/* the lit windows' names, above the roof (the newest nearest it) */}
          {named.map(({ d }, j) => (
            <text
              key={`lbl-${d.id}`}
              x={cx}
              y={r2(top - 12 - (named.length - 1 - j + (more ? 1 : 0)) * LINE)}
              textAnchor="middle"
              fontFamily="var(--font-serif)"
              fontStyle="italic"
              fontSize={r2(20 * sc)}
              fill="var(--ink-deep)"
              className={d.id === animateId ? "window-label-anim" : undefined}
            >
              {d.name}
            </text>
          ))}
          {more > 0 && (
            <text x={cx} y={r2(top - 12)} textAnchor="middle" fontFamily="var(--font-serif)" fontStyle="italic" fontSize={r2(17 * sc)} fill="var(--ink-500)">
              and {more} more
            </text>
          )}
        </g>,
      );
    });
    y = ground + 56 * sc;
  });

  // the cove below the town
  const seaTop = r2(y + 2);
  const H = seaTop + 46;
  return (
    <svg viewBox={`0 0 ${W} ${r2(H)}`} className={className} role="img" aria-label={`Map of ${startup}, its investors and their doors`}>
      {out}
      {wash([[0, seaTop + 4], [W, seaTop + 2], [W, H], [0, H]], SEA, 400, "cove", [0, 0])}
      {paths(ink.line(0, seaTop, W * 0.44, seaTop, { seed: 401, roughness: 0.6, bowing: 0.3, strokeWidth: 1.4 }), "cv1")}
      {paths(ink.line(W * 0.44 + 22, seaTop, W, seaTop, { seed: 402, roughness: 0.6, bowing: 0.3, strokeWidth: 1.4 }), "cv2")}
      <g className="drift">
        {paths(ink.line(70, seaTop + 20, 118, seaTop + 20, { seed: 403, roughness: 0.5, strokeWidth: 1.1 }), "cs1")}
        {paths(ink.line(128, seaTop + 21, 137, seaTop + 21, { seed: 404, roughness: 0.5, strokeWidth: 1.1 }), "cs2")}
        {paths(ink.line(430, seaTop + 30, 490, seaTop + 30, { seed: 405, roughness: 0.5, strokeWidth: 1.1 }), "cs3")}
      </g>
    </svg>
  );
}
