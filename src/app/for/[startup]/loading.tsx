"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Lighthouse } from "@/components/Lighthouse";

/**
 * Shown while the log is built. A startup Faro hasn't seen before is looked up live in Cala,
 * which can take ~20 s at Cala's rate limit; the lighthouse keeps turning meanwhile.
 */
export default function Loading() {
  const params = useParams<{ startup: string }>();
  const search = useSearchParams();
  const name = search.get("name")?.trim() || decodeURIComponent(params?.startup ?? "").replace(/-/g, " ");
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-4 sm:px-8" aria-busy="true" aria-live="polite">
      <div className="flex w-full flex-col items-start gap-8 sm:flex-row sm:items-end sm:gap-12">
        <Lighthouse sweeping className="h-36 w-36 shrink-0 sm:h-52 sm:w-52" />
        <div className="pb-3">
          <p className="text-[clamp(34px,5.5vw,64px)] font-light leading-[1.05] tracking-[-0.015em] text-ink-deep">
            <span className="caret">Looking for {name}</span>
          </p>
          <p className="mono mt-6 text-[12px] text-ink-500">Reading Cala · a new startup can take up to half a minute</p>
        </div>
      </div>
    </main>
  );
}
