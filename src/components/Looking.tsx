/**
 * What the loader says while the log is built. A startup Faro hasn't seen before is looked up
 * live in Cala (read the company's profile and rounds, read its investors, then match doors),
 * which can take ~20 s at Cala's rate limit. Three short lines follow those steps, in order, and
 * stay on the last.
 *
 * They are sequenced with CSS, not timers, so the screen moves on its own even before the page's
 * JavaScript runs. All lines sit in one spot; each fades in at its step and out at the next.
 */
const STEPS: { at: number; line: string }[] = [
  { at: 0, line: "Reading the funding records…" },
  { at: 5000, line: "Checking who backed whom…" },
  { at: 11000, line: "Looking for doors…" },
];

export function Looking({ name }: { name: string }) {
  return (
    <>
      <p className="text-[clamp(38px,4.7vw,68px)] font-light leading-[1.04] tracking-[-0.02em] text-ink-deep">
        <span className="caret">Looking for {name}</span>
      </p>
      <p className="mt-[4vh] grid text-[clamp(22px,2.2vw,30px)] font-light italic text-ink-500" role="status">
        {STEPS.map((s, i) => {
          const next = STEPS[i + 1];
          return (
            <span
              key={i}
              className="loader-step [grid-area:1/1]"
              style={{
                animationName: next ? "stepshow" : "stepstay",
                animationDelay: `${s.at}ms`,
                animationDuration: next ? `${next.at - s.at}ms` : "600ms",
              }}
            >
              {s.line}
            </span>
          );
        })}
      </p>
    </>
  );
}
