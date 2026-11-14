"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Lighthouse } from "@/components/Lighthouse";

/**
 * Shown while the log is built. A startup Faro hasn't seen before is looked up live in Cala
 * (find the company, read its profile and investors, then match doors), which can take ~20 s at
 * Cala's rate limit. The lines follow those steps, in order, and stay on the last one.
 */
const STEPS = [
  { at: 0, text: (name: string) => `Finding ${name} in Cala…` },
  { at: 4000, text: () => "Checking who backed whom…" },
  { at: 10000, text: () => "Looking for doors…" },
];

export default function Loading() {
  const params = useParams<{ startup: string }>();
  const search = useSearchParams();
  const name = search.get("name")?.trim() || decodeURIComponent(params?.startup ?? "").replace(/-/g, " ");
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = STEPS.slice(1).map((s, i) => window.setTimeout(() => setStep(i + 1), s.at));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-4 sm:px-8" aria-busy="true">
      <div className="flex w-full flex-col items-start gap-8 sm:flex-row sm:items-end sm:gap-12">
        <Lighthouse sweeping className="h-36 w-36 shrink-0 sm:h-52 sm:w-52" />
        <div className="pb-3">
          <p className="text-[clamp(34px,5.5vw,64px)] font-light leading-[1.05] tracking-[-0.015em] text-ink-deep">
            <span className="caret">Looking for {name}</span>
          </p>
          <p key={step} className="status-in mt-6 text-[19px] italic text-ink-500" aria-live="polite">
            {STEPS[step].text(name)}
          </p>
        </div>
      </div>
    </main>
  );
}
