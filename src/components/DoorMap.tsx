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
}

const W = 640;
const H = 600;
const CX = W / 2;
const CY = H / 2 + 6;

/**
 * Hand-drawn map: the startup at the centre, its investors on a ring, and each investor's
 * doors as tiny windows. Lit windows are doors that opened recently.
 */
export function DoorMap({ startup, investors, doors, animateId, holdId, className, maxPerInvestor = 18 }: MapProps) {
  const inv = investors.slice(0, 7);
  const n = Math.max(inv.length, 1);
  const R = n === 1 ? 0 : 150;
  const pos = new Map<string, { x: number; y: number; a: number }>();
  inv.forEach((iv, i) => {
    const a = n === 1 ? -Math.PI / 2 : -Math.PI / 2 + (i * 2 * Math.PI) / n;
    pos.set(iv.id, { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a), a });
  });

  // group doors by their first investor; lit ones first so they're always on the map
  const groups = new Map<string, MapDoor[]>();
  for (const d of doors) {
    const home = d.investorIds.find((id) => pos.has(id));
    if (!home) continue;
    groups.set(home, [...(groups.get(home) ?? []), d]);
  }
  const windows: { d: MapDoor; x: number; y: number; home: string }[] = [];
  const overflow: { home: string; n: number }[] = [];
  for (const [home, ds] of groups) {
    const p = pos.get(home)!;
    const sorted = [...ds].sort((a, b) => Number(b.lit) - Number(a.lit) || Number(b.id === holdId) - Number(a.id === holdId));
    const shown = sorted.slice(0, maxPerInvestor);
    if (sorted.length > shown.length) overflow.push({ home, n: sorted.length - shown.length });
    // windows on an outward fan around the investor
    const outA = n === 1 ? -Math.PI / 2 : p.a;
    shown.forEach((d, i) => {
      const ring = Math.floor(i / 6);
      const k = i % 6;
      const spread = 0.95 / (ring + 1);
      const ang = outA + (k - 2.5) * (spread / 2.5) * 0.9;
      const r = 62 + ring * 26 + (n === 1 ? 40 : 0);
      windows.push({ d, x: p.x + r * Math.cos(ang), y: p.y + r * Math.sin(ang), home });
    });
  }

  const byId = new Map(windows.map((w) => [w.d.id, w]));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`Map of ${startup}, its investors and their doors`}>
      {/* startup → investor lines */}
      {inv.map((iv) => {
        const p = pos.get(iv.id)!;
        return paths(ink.line(CX, CY, p.x, p.y, { seed: seedOf(iv.id), strokeWidth: 1.1 }), `l-${iv.id}`);
      })}
      {/* investor → lit window threads, plus second warm paths */}
      {windows.map((w) => {
        const p = pos.get(w.home)!;
        const out = [];
        if (w.d.lit || w.d.id === holdId)
          out.push(paths(ink.line(p.x, p.y, w.x, w.y, { seed: seedOf(w.d.id), strokeWidth: 0.8, roughness: 1.4 }), `t-${w.d.id}`, { stroke: "var(--ink-500)" }));
        for (const other of w.d.investorIds) {
          if (other === w.home || !pos.has(other)) continue;
          const q = pos.get(other)!;
          out.push(paths(ink.line(q.x, q.y, w.x, w.y, { seed: seedOf(w.d.id + other), strokeWidth: 0.6, roughness: 1.6, stroke: INK_FAINT }), `t2-${w.d.id}-${other}`));
        }
        return out;
      })}
      {/* windows */}
      {windows.map((w) => {
        const isHeld = w.d.id === holdId && w.d.id !== animateId;
        const lit = (w.d.lit && !isHeld) || w.d.id === animateId;
        const seed = seedOf(w.d.id);
        return (
          <g key={`w-${w.d.id}`} data-door={w.d.id}>
            {lit && (
              <rect
                x={w.x - 4.5}
                y={w.y - 5.5}
                width={9}
                height={11}
                fill={w.d.id === animateId ? "transparent" : LIGHT}
                className={w.d.id === animateId ? "window-lit-anim" : undefined}
              />
            )}
            {paths(ink.rect(w.x - 4.5, w.y - 5.5, 9, 11, { seed, strokeWidth: lit ? 1.2 : 0.9, roughness: 0.9, stroke: lit ? "var(--ink)" : INK_FAINT }), `wr-${w.d.id}`)}
            {paths(ink.line(w.x, w.y - 5.5, w.x, w.y + 5.5, { seed: seed + 1, strokeWidth: 0.6, roughness: 0.6, stroke: lit ? "var(--ink)" : INK_FAINT }), `wm-${w.d.id}`)}
            {lit && (
              <text
                x={w.x + (w.x >= CX ? 9 : -9)}
                y={w.y + 4}
                textAnchor={w.x >= CX ? "start" : "end"}
                fontFamily="var(--font-serif)"
                fontStyle="italic"
                fontSize={14}
                fill="var(--ink)"
              >
                {w.d.name}
              </text>
            )}
          </g>
        );
      })}
      {/* investors */}
      {inv.map((iv) => {
        const p = pos.get(iv.id)!;
        const below = p.y >= CY - 1;
        return (
          <g key={`i-${iv.id}`}>
            {paths(ink.circle(p.x, p.y, 15, { seed: seedOf(iv.id) + 3, fill: "var(--paper)", fillStyle: "solid" }), `ic-${iv.id}`)}
            <text x={p.x} y={below ? p.y + 26 : p.y - 16} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} fill="var(--ink-500)" letterSpacing={0.4}>
              {iv.name.toUpperCase()}
            </text>
          </g>
        );
      })}
      {overflow.map((o) => {
        const p = pos.get(o.home)!;
        const outA = n === 1 ? -Math.PI / 2 : p.a;
        const x = p.x + 128 * Math.cos(outA);
        const y = p.y + 128 * Math.sin(outA);
        return (
          <text key={`o-${o.home}`} x={x} y={y} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10} fill="var(--ink-300)">
            +{o.n}
          </text>
        );
      })}
      {/* the startup: a small house with one lit window */}
      <g>
        {paths(ink.poly([[CX - 13, CY - 2], [CX, CY - 15], [CX + 13, CY - 2]], { seed: 11, fill: "var(--paper)", fillStyle: "solid" }), "h-roof")}
        {paths(ink.rect(CX - 10, CY - 2, 20, 16, { seed: 12, fill: "var(--paper)", fillStyle: "solid" }), "h-body")}
        <rect x={CX - 3.5} y={CY + 2} width={7} height={7} fill={LIGHT} />
        {paths(ink.rect(CX - 3.5, CY + 2, 7, 7, { seed: 13, strokeWidth: 0.9, roughness: 0.6 }), "h-win")}
        <text x={CX} y={CY + 34} textAnchor="middle" fontFamily="var(--font-serif)" fontSize={18} fill="var(--ink)">
          {startup}
        </text>
      </g>
      {byId.size === 0 && inv.length === 0 && (
        <text x={CX} y={CY + 60} textAnchor="middle" fontFamily="var(--font-serif)" fontStyle="italic" fontSize={15} fill="var(--ink-500)">
          no investors in view
        </text>
      )}
    </svg>
  );
}
