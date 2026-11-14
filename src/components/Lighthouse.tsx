import { ink, paths, LIGHT } from "./ink";

/** A small hand-drawn lighthouse. The lamp is the page's only yellow. */
export function Lighthouse({ className, lit = true }: { className?: string; lit?: boolean }) {
  const s = 7;
  return (
    <svg viewBox="0 0 220 240" className={className} role="img" aria-label="A hand-drawn lighthouse">
      {/* beam */}
      {lit && (
        <g className="beam">
          {paths(ink.poly([[110, 58], [8, 34], [8, 74]], { seed: s + 1, stroke: "none", fill: LIGHT, fillStyle: "solid", roughness: 0.6 }), "beamL", { opacity: 0.55 })}
          {paths(ink.poly([[110, 58], [212, 38], [212, 70]], { seed: s + 2, stroke: "none", fill: LIGHT, fillStyle: "solid", roughness: 0.6 }), "beamR", { opacity: 0.55 })}
        </g>
      )}
      {/* roof + finial */}
      {paths(ink.poly([[94, 44], [110, 26], [126, 44]], { seed: s + 3 }), "roof")}
      {paths(ink.line(110, 26, 110, 16, { seed: s + 4 }), "finial")}
      {/* lamp room */}
      {paths(ink.rect(97, 44, 26, 24, { seed: s + 5 }), "lamproom")}
      {lit && paths(ink.rect(103, 49, 14, 14, { seed: s + 6, stroke: "none", fill: LIGHT, fillStyle: "solid", roughness: 0.4 }), "lamp")}
      {paths(ink.line(110, 44, 110, 68, { seed: s + 7, strokeWidth: 0.9 }), "mullion")}
      {/* gallery */}
      {paths(ink.rect(90, 68, 40, 7, { seed: s + 8 }), "gallery")}
      {paths(ink.line(92, 68, 92, 62, { seed: s + 9, strokeWidth: 0.9 }), "rail1")}
      {paths(ink.line(128, 68, 128, 62, { seed: s + 10, strokeWidth: 0.9 }), "rail2")}
      {paths(ink.line(90, 62, 130, 62, { seed: s + 11, strokeWidth: 0.9 }), "rail3")}
      {/* tower */}
      {paths(ink.poly([[96, 75], [124, 75], [134, 196], [86, 196]], { seed: s + 12 }), "tower")}
      {/* bands */}
      {paths(ink.line(93, 112, 127, 112, { seed: s + 13 }), "band1")}
      {paths(ink.line(91, 124, 129, 124, { seed: s + 14 }), "band1b")}
      {paths(ink.line(89, 154, 131, 154, { seed: s + 15 }), "band2")}
      {paths(ink.line(88, 166, 132, 166, { seed: s + 16 }), "band2b")}
      {/* door + window */}
      {paths(ink.path("M104 196 L104 182 Q110 175 116 182 L116 196", { seed: s + 17 }), "door")}
      {paths(ink.rect(106, 88, 8, 11, { seed: s + 18, strokeWidth: 1 }), "win")}
      {/* rocks and water */}
      {paths(ink.curve([[62, 200], [80, 192], [100, 197], [124, 193], [146, 198], [162, 202]], { seed: s + 19 }), "rock")}
      {paths(ink.curve([[30, 214], [48, 209], [66, 214], [84, 209], [102, 214]], { seed: s + 20, strokeWidth: 1 }), "wave1")}
      {paths(ink.curve([[120, 222], [138, 217], [156, 222], [174, 217], [192, 222]], { seed: s + 21, strokeWidth: 1 }), "wave2")}
      {paths(ink.curve([[56, 230], [70, 226], [84, 230]], { seed: s + 22, strokeWidth: 0.9 }), "wave3")}
    </svg>
  );
}
