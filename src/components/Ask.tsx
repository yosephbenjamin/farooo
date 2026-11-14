"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeCompany } from "@/lib/normalize";
import { ink, paths } from "./ink";
import { Looking } from "./Looking";
import { Shore } from "./Shore";

/**
 * The startup screen: one question, one input, a hand-drawn send arrow.
 *
 * Sending doesn't wait for the browser: the same scene turns into the loader at once (the beam
 * starts looking around) and the log is fetched behind it. A plain form post left the loader to
 * the browser's handling of a streamed page, and phones (Safari above all) kept showing the old
 * screen until the whole answer had arrived. Without JavaScript the form still posts as before.
 */
export function Ask({ demos }: { demos: string[] }) {
  const router = useRouter();
  const [looking, setLooking] = useState<string | null>(null);

  // coming back with the browser's back button: ask again, don't keep looking
  useEffect(() => {
    const reset = () => setLooking(null);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  if (looking) {
    return (
      <Shore sweeping>
        <Looking name={looking} />
      </Shore>
    );
  }

  return (
    <Shore draw>
      <form
        action="/for"
        method="get"
        onSubmit={(e) => {
          const name = String(new FormData(e.currentTarget).get("s") ?? "").trim();
          if (!name) return;
          e.preventDefault();
          (document.activeElement as HTMLElement | null)?.blur(); // put the phone's keyboard away
          setLooking(name);
          const slug = normalizeCompany(name).replace(/\s+/g, "-") || "unknown"; // as slugify() in lib/report
          router.push(`/for/${slug}?name=${encodeURIComponent(name)}`);
        }}
      >
        <label htmlFor="startup" className="block text-[clamp(38px,4.7vw,68px)] font-light leading-[1.04] tracking-[-0.02em] text-ink-deep">
          Which startup are you?
        </label>
        {/* the input and its send arrow share one ink underline */}
        <div className="send mt-[4vh] flex w-full max-w-[30rem] items-end border-b-[1.5px] border-ink focus-within:border-ink-deep">
          <input
            id="startup"
            name="s"
            list="demo-startups"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
            required
            placeholder={demos[0] ?? ""}
            className="peer min-w-0 flex-1 border-0 bg-transparent pb-2 text-[clamp(24px,2.5vw,34px)] font-light text-ink-deep outline-none placeholder:italic placeholder:text-ink-300"
          />
          {/* send: a hand-drawn arrow, faint until there's a name to send */}
          <button
            type="submit"
            aria-label="Show my doors"
            title="Show my doors"
            className="-mr-2 flex h-12 w-14 shrink-0 items-center justify-center text-ink-deep opacity-100 transition-opacity duration-300 peer-placeholder-shown:opacity-30"
          >
            <svg viewBox="0 0 44 24" className="send-arrow h-6 w-11 overflow-visible" aria-hidden>
              {paths(ink.line(3, 12.5, 39, 11.5, { seed: 91, strokeWidth: 1.8, roughness: 0.7, bowing: 0.6, stroke: "currentColor" }), "shaft")}
              {paths(ink.line(29, 4, 40, 11.5, { seed: 92, strokeWidth: 1.8, roughness: 0.5, stroke: "currentColor" }), "head1")}
              {paths(ink.line(40, 11.5, 29.5, 20, { seed: 93, strokeWidth: 1.8, roughness: 0.5, stroke: "currentColor" }), "head2")}
            </svg>
          </button>
        </div>
        <p className="mt-6 max-w-[30rem] text-[clamp(17px,1.35vw,20px)] leading-[1.5] text-ink-500">
          New money, new hires, new acquisitions. Faro tells you who just got a reason to partner, and who can introduce you.
        </p>
        <datalist id="demo-startups">
          {demos.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </form>
    </Shore>
  );
}
