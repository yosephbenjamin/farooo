import { ink, paths, seedOf, INK_FAINT, LIGHT } from "./ink";

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

const W = 840;
const H = 660;
const CX = W / 2;
const CY = H / 2;
const COLS = 5;
const WW = 13; // window width
const WH = 17; // window height
const GX = 7;
const GY = 8;

const r2 = (v: number) => Math.round(v * 10) / 10;

/**
 * Hand-drawn map. The startup sits in the middle; each investor is a small building whose
 * windows are its doors (its keyring). Lit windows are doors that opened recently, labelled
 * on the building's outer side. Roads run from the startup to each building.
 */
export function DoorMap({ startup, investors, doors, animateId, holdId, className, maxPerInvestor = 25, big = false }: MapProps) {
  const sc = big ? 1.35 : 1;
  const inv = investors.slice(0, 6);
  const n = inv.length;
  const spots = layout(n);

  // each door lives in the building of its first investor
  const homes = new Map<string, MapDoor[]>();
  for (const d of doors) {
    const home = d.investorIds.find((id) => inv.some((i) => i.id === id));
    if (home) homes.set(home, [...(homes.get(home) ?? []), d]);
  }

  return (
    <svg viewBox={n <= 2 ? `-70 ${CY - 200} ${W + 140} 400` : `-70 0 ${W + 140} ${H}`} className={className} role="img" aria-label={`Map of ${startup}, its investors and their doors`}>
      {inv.map((iv, i) => {
        const { x, y } = spots[i];
        const all = [...(homes.get(iv.id) ?? [])].sort(
          (a, b) => Number(b.lit || b.id === holdId) - Number(a.lit || a.id === holdId),
        );
        const shown = all.slice(0, maxPerInvestor);
        const rows = Math.max(3, Math.ceil(shown.length / COLS));
        const bw = COLS * WW + (COLS - 1) * GX + 20;
        const bh = rows * WH + (rows - 1) * GY + 20;
        const bx = r2(x - bw / 2);
        const by = r2(y - bh / 2);
        const right = x >= CX; // labels go on the outer side
        const seed = seedOf(iv.id);
        const roadEnd = { x: right ? bx : bx + bw, y: r2(y) };
        const lit = shown
          .map((d, k) => ({ d, k }))
          .filter(({ d }) => d.id === animateId || (d.lit && d.id !== holdId));
        const labelX = right ? bx + bw + 22 : bx - 22;
        const step = 27 * sc;
        const labelTop = r2(y - ((lit.length - 1) * step) / 2);
        return (
          <g key={iv.id}>
            {/* road */}
            {paths(ink.line(CX + (right ? 26 : -26), CY, roadEnd.x, roadEnd.y, { seed, strokeWidth: 1.1, roughness: 1.3 }), `road-${iv.id}`)}
            {/* building */}
            {paths(ink.rect(bx, by, bw, bh, { seed: seed + 1, fill: "var(--paper)", fillStyle: "solid" }), `b-${iv.id}`)}
            {paths(ink.poly([[bx - 4, by], [r2(bx + bw / 2), r2(by - 18)], [bx + bw + 4, by]], { seed: seed + 2, fill: "var(--paper)", fillStyle: "solid" }), `roof-${iv.id}`)}
            {shown.map((d, k) => {
              const wx = r2(bx + 10 + (k % COLS) * (WW + GX));
              const wy = r2(by + 10 + Math.floor(k / COLS) * (WH + GY));
              const isAnim = d.id === animateId;
              const isLit = isAnim || (d.lit && d.id !== holdId);
              const s = seedOf(d.id);
              return (
                <g key={d.id} data-door={d.id}>
                  {isLit && (
                    <rect x={wx} y={wy} width={WW} height={WH} fill={isAnim ? "transparent" : LIGHT} className={isAnim ? "window-lit-anim" : undefined} />
                  )}
                  {paths(ink.rect(wx, wy, WW, WH, { seed: s, strokeWidth: isLit ? 1.1 : 0.8, roughness: 0.8, stroke: isLit ? "var(--ink)" : INK_FAINT }), `w-${d.id}`)}
                </g>
              );
            })}
            {all.length > shown.length && (
              <text x={r2(bx + bw / 2)} y={r2(by + bh + 42 * sc)} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={13} fill="var(--ink-300)">
                +{all.length - shown.length} more
              </text>
            )}
            {/* investor name */}
            <text x={r2(bx + bw / 2)} y={r2(by + bh + 24 * sc)} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={14 * sc} letterSpacing={0.8} fill="var(--ink-500)">
              {iv.name.toUpperCase()}
            </text>
            {/* labels for lit windows, with leader lines */}
            {lit.map(({ d, k }, j) => {
              const wx = bx + 10 + (k % COLS) * (WW + GX) + WW / 2;
              const wy = by + 10 + Math.floor(k / COLS) * (WH + GY) + WH / 2;
              const ly = r2(labelTop + j * step);
              const edge = right ? bx + bw : bx;
              return (
                <g key={`lbl-${d.id}`} className={d.id === animateId ? "window-label-anim" : undefined}>
                  {paths(ink.line(r2(wx), r2(wy), r2(edge + (right ? 6 : -6)), ly - 4, { seed: seedOf(d.id) + 2, strokeWidth: 0.6, roughness: 0.6, stroke: "var(--ink-500)" }), `ll-${d.id}`)}
                  <text x={labelX} y={ly} textAnchor={right ? "start" : "end"} fontFamily="var(--font-serif)" fontStyle="italic" fontSize={22 * sc} fill="var(--ink)">
                    {d.name}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
      {/* the startup: a small house with one lit window */}
      <g>
        {paths(ink.poly([[CX - 21, CY - 5], [CX, CY - 27], [CX + 21, CY - 5]], { seed: 11, fill: "var(--paper)", fillStyle: "solid" }), "h-roof")}
        {paths(ink.rect(CX - 17, CY - 5, 34, 26, { seed: 12, fill: "var(--paper)", fillStyle: "solid" }), "h-body")}
        <rect x={CX - 5} y={CY + 2} width={10} height={12} fill={LIGHT} />
        {paths(ink.rect(CX - 5, CY + 2, 10, 12, { seed: 13, strokeWidth: 0.9, roughness: 0.6 }), "h-win")}
        <text x={CX} y={CY + 48 * sc} textAnchor="middle" fontFamily="var(--font-serif)" fontSize={27 * sc} fill="var(--ink)">
          {startup}
        </text>
      </g>
      {n === 0 && (
        <text x={CX} y={CY + 70} textAnchor="middle" fontFamily="var(--font-serif)" fontStyle="italic" fontSize={16} fill="var(--ink-500)">
          no investors in view
        </text>
      )}
    </svg>
  );
}

/** Building centres: left/right of the startup first, so labels have room on the outer sides. */
function layout(n: number): { x: number; y: number }[] {
  const L = CX - 215;
  const R = CX + 215;
  switch (n) {
    case 0:
      return [];
    case 1:
      return [{ x: R, y: CY }];
    case 2:
      return [{ x: L, y: CY }, { x: R, y: CY }];
    case 3:
      return [{ x: L, y: CY }, { x: R, y: CY - 150 }, { x: R, y: CY + 150 }];
    case 4:
      return [{ x: L, y: CY - 165 }, { x: R, y: CY - 165 }, { x: L, y: CY + 165 }, { x: R, y: CY + 165 }];
    case 5:
      return [{ x: L, y: CY - 175 }, { x: R, y: CY - 175 }, { x: L, y: CY + 30 }, { x: R, y: CY + 30 }, { x: CX, y: CY + 215 }];
    default:
      return [
        { x: L, y: CY - 195 }, { x: R, y: CY - 195 }, { x: L, y: CY }, { x: R, y: CY }, { x: L, y: CY + 195 }, { x: R, y: CY + 195 },
      ].slice(0, n);
  }
}
