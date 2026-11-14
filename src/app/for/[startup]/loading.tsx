"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Lighthouse } from "@/components/Lighthouse";

/**
 * Shown while the log is built. A startup Faro hasn't seen before is looked up live in Cala
 * (read the company's profile and rounds, read its investors, then match doors), which can take
 * ~20 s at Cala's rate limit. Three short lines follow those steps, in order, and stay on the last.
 *
 * They are sequenced with CSS, not timers: this screen is streamed before the page's JavaScript
 * runs, so it must move on its own. All lines sit in one spot; each fades in at its step and out
 * at the next.
 */
const STEPS: { at: number; line: string }[] = [
  { at: 0, line: "Reading the funding records…" },
  { at: 5000, line: "Checking who backed whom…" },
  { at: 11000, line: "Looking for doors…" },
];

export default function Loading() {
  const params = useParams<{ startup: string }>();
  const search = useSearchParams();
  const name = search.get("name")?.trim() || decodeURIComponent(params?.startup ?? "").replace(/-/g, " ");
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-4 sm:px-8" aria-busy="true">
      <div className="flex w-full flex-col items-start gap-8 sm:flex-row sm:items-end sm:gap-12">
        <Lighthouse sweeping className="h-36 w-36 shrink-0 sm:h-52 sm:w-52" />
        <div className="pb-3">
          <p className="text-[clamp(34px,5.5vw,64px)] font-light leading-[1.05] tracking-[-0.015em] text-ink-deep">
            <span className="caret">Looking for {name}</span>
          </p>
          <p className="mt-6 grid text-[19px] italic text-ink-500">
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
        </div>
      </div>
    </main>
  );
}
