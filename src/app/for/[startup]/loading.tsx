"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Lighthouse } from "@/components/Lighthouse";

/**
 * Shown while the log is built. A startup Faro hasn't seen before is looked up live in Cala
 * (find the company, read its profile and investors, then match doors), which can take ~20 s at
 * Cala's rate limit. The lines follow those steps, in order, and stay on the last one. Each step
 * has a few true phrasings, picked at random, so the wait doesn't read the same every time.
 */
const STEPS: { at: number; lines: ((name: string) => string)[] }[] = [
  { at: 0, lines: [(n) => `Finding ${n} in Cala…`, (n) => `Looking ${n} up in Cala…`, (n) => `Searching Cala for ${n}…`] },
  { at: 4000, lines: [() => "Checking who backed whom…", () => "Reading the funding records…", (n) => `Reading who invested in ${n}…`, (n) => `Finding out what ${n} builds…`] },
  { at: 10000, lines: [() => "Looking for doors…", () => "Matching new money, new hires and acquisitions…", () => "Checking who just got a reason to partner…", () => "Looking for people who can introduce you…"] },
  { at: 20000, lines: [() => "Still reading Cala…", () => "Cala is still answering…", () => "Nearly there, still reading…"] },
];

export default function Loading() {
  const params = useParams<{ startup: string }>();
  const search = useSearchParams();
  const name = search.get("name")?.trim() || decodeURIComponent(params?.startup ?? "").replace(/-/g, " ");
  const [step, setStep] = useState(0);
  // first render (server and browser alike) uses each step's first line; pick at random after mount
  const [pick, setPick] = useState<number[]>(() => STEPS.map(() => 0));
  useEffect(() => {
    setPick(STEPS.map((s) => Math.floor(Math.random() * s.lines.length)));
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
            {STEPS[step].lines[pick[step]](name)}
          </p>
        </div>
      </div>
    </main>
  );
}
