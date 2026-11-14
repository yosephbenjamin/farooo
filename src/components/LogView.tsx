"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Door, DoorReport } from "@/lib/doors";
import { dayMonth, doorCountLine, entryLead, entryWhy, headline, shortDate, subline } from "@/lib/prose";
import { hostOf } from "@/lib/hosts";
import { DoorMap } from "./DoorMap";
import { Lighthouse } from "./Lighthouse";

interface Props {
  report: DoorReport;
  booth?: boolean;
  /** Door held back for the scripted "a door opens" moment (booth mode). */
  scriptedId?: string | null;
  /** Reveal the scripted door automatically after this many ms. */
  autoMs?: number | null;
}

export function LogView({ report, booth = false, scriptedId = null, autoMs = null }: Props) {
  const [revealed, setRevealed] = useState(!scriptedId);
  const [typed, setTyped] = useState(0);
  const scripted = useMemo(() => report.opened.find((d) => d.companyId === scriptedId) ?? null, [report, scriptedId]);

  const reveal = useCallback(() => setRevealed(true), []);

  // keyboard: space / enter / "o" opens the door
  useEffect(() => {
    if (!scripted || revealed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter" || e.key.toLowerCase() === "o") {
        e.preventDefault();
        reveal();
      }
    };
    window.addEventListener("keydown", onKey);
    const t = autoMs ? window.setTimeout(reveal, autoMs) : undefined;
    return () => {
      window.removeEventListener("keydown", onKey);
      if (t) window.clearTimeout(t);
    };
  }, [scripted, revealed, reveal, autoMs]);

  // typewriter for the scripted lead line
  const leadText = scripted ? `${scripted.name}${entryLead(scripted).rest}.` : "";
  useEffect(() => {
    if (!revealed || !scripted) return;
    if (typed >= leadText.length) return;
    const t = window.setTimeout(() => setTyped((n) => n + 1), 38);
    return () => window.clearTimeout(t);
  }, [revealed, scripted, typed, leadText]);

  const opened = useMemo(
    () => (scripted && !revealed ? report.opened.filter((d) => d.companyId !== scripted.companyId) : report.opened),
    [report, scripted, revealed],
  );
  const shown = opened.slice(0, booth ? 3 : 6);
  const footnotes = shown.filter((d) => d.reason);
  const count = doorCountLine(report);
  const timed = report.timed.slice(0, 3);

  const mapDoors = useMemo(
    () =>
      report.doors.map((d) => ({
        id: d.companyId,
        name: d.name,
        investorIds: d.via.map((v) => v.investorId),
        lit: report.opened.some((o) => o.companyId === d.companyId),
      })),
    [report],
  );

  const T = booth
    ? { h1: "text-[clamp(44px,4.4vw,88px)] leading-[1.03]", lead: "text-[clamp(24px,1.95vw,38px)]", why: "text-[clamp(18px,1.35vw,26px)]", small: "text-[clamp(13px,0.85vw,17px)]", gap: "space-y-8" }
    : { h1: "text-[clamp(38px,5vw,64px)] leading-[1.05]", lead: "text-[22px] sm:text-[25px]", why: "text-[17px] sm:text-[19px]", small: "text-[12px]", gap: "space-y-8" };

  return (
    <main className={`mx-auto w-full ${booth ? "max-w-[1800px] px-[4vw] py-[4vh] min-h-screen" : "max-w-6xl px-4 sm:px-8 py-10 sm:py-14"}`}>
      <header className={`flex items-center justify-between ${booth ? "mb-[4vh]" : "mb-10 sm:mb-14"}`}>
        <Link href="/" className="flex items-center gap-2 no-underline" aria-label="Faro, home">
          <Lighthouse className={booth ? "h-12 w-12" : "h-8 w-8"} lit={revealed} />
          <span className={`mono uppercase tracking-[0.18em] text-ink-500 ${booth ? "text-sm" : "text-[11px]"}`}>Faro</span>
        </Link>
        {scripted && !revealed && (
          <button onClick={reveal} className={`mono uppercase tracking-[0.18em] text-ink-300 hover:text-ink ${booth ? "text-sm" : "text-[11px]"}`}>
            watch
          </button>
        )}
      </header>

      <div className={`grid gap-12 ${booth ? "lg:grid-cols-[1fr_1.15fr] lg:gap-[4vw]" : "md:grid-cols-[1fr_1.1fr] md:gap-12"}`}>
        <section>
          <h1 className={`font-light tracking-[-0.015em] text-ink-deep ${T.h1}`}>{headline(report, opened)}</h1>
          {subline(report) && <p className={`mt-4 italic text-ink-500 ${T.why}`}>{subline(report)}</p>}

          <ol className={`${booth ? "mt-[5vh]" : "mt-12"} ${T.gap}`}>
            {scripted && revealed && (
              <Entry
                key="scripted"
                d={scripted}
                n={1}
                T={T}
                leadOverride={typed < leadText.length ? leadText.slice(0, typed) : null}
                fresh
              />
            )}
            {shown
              .filter((d) => !(scripted && revealed && d.companyId === scripted.companyId))
              .map((d, i) => (
                <Entry key={d.companyId} d={d} n={i + 1 + (scripted && revealed ? 1 : 0)} T={T} />
              ))}
          </ol>

          {timed.length > 0 && (
            <p className={`mt-12 ${T.why} text-ink-500`}>
              <span className="italic">Also arriving where you are: </span>
              {timed.map((d, i) => (
                <span key={d.companyId}>
                  {i > 0 && ", "}
                  <a href={d.reason!.source.url} target="_blank" rel="noreferrer">
                    {d.name}
                  </a>
                  <span className="mono text-[0.7em]"> {dayMonth(d.reason!.date)}</span>
                </span>
              ))}
              .
            </p>
          )}

          {(footnotes.length > 0 || (scripted && revealed)) && (
            <ol className={`mono mt-14 space-y-1 text-ink-500 ${T.small}`}>
              {[...(scripted && revealed ? [scripted] : []), ...footnotes.filter((d) => !(scripted && revealed && d.companyId === scripted.companyId))].map(
                (d, i) => (
                  <li key={`fn-${d.companyId}`} className="flex gap-3">
                    <span className="w-4 text-right text-ink-300">{i + 1}</span>
                    <a href={d.reason!.source.url} target="_blank" rel="noreferrer" className="no-underline hover:underline">
                      {shortDate(d.reason!.date)} · {cleanSource(d.reason!.source.name, d.reason!.source.url)}
                    </a>
                  </li>
                ),
              )}
            </ol>
          )}

          {count && (
            <p className={`mono mt-10 text-ink-500 ${T.small}`}>
              <span className="text-ink-300">Doors per investor  </span>
              {count}
            </p>
          )}
        </section>

        <aside className={booth ? "lg:sticky lg:top-[5vh] self-start" : "md:sticky md:top-10 self-start"}>
          <DoorMap
            startup={report.startup.name}
            investors={report.startup.investors.map((i) => ({ id: i.investorId, name: i.investorName }))}
            doors={mapDoors}
            holdId={scripted && !revealed ? scripted.companyId : null}
            animateId={scripted && revealed ? scripted.companyId : null}
            className="w-full h-auto"
            maxPerInvestor={25}
            big={booth}
          />
        </aside>
      </div>
    </main>
  );
}

function cleanSource(name: string, url: string) {
  const n = name && name.length < 40 && !/^https?:/.test(name) ? name : hostOf(url);
  return n.replace(/^www\./, "");
}

function Entry({
  d,
  n,
  T,
  leadOverride,
  fresh,
}: {
  d: Door;
  n: number;
  T: { lead: string; why: string; small: string };
  leadOverride?: string | null;
  fresh?: boolean;
}) {
  const lead = entryLead(d);
  return (
    <li>
      <p className={`${T.lead} max-w-[30ch] leading-snug text-ink-deep`}>
        {leadOverride != null ? (
          <span className="caret">{leadOverride}</span>
        ) : (
          <>
            <span className="font-medium">{lead.name}</span>
            {lead.rest}.
            {d.reason && (
              <a href={d.reason.source.url} target="_blank" rel="noreferrer" className="no-underline" aria-label={`Source ${n}`}>
                <sup className="mono ml-0.5 text-[0.5em] text-ink-500">{n}</sup>
              </a>
            )}
          </>
        )}
      </p>
      <p
        className={`mt-1.5 ${T.why} max-w-[46ch] leading-relaxed text-ink-500 transition-opacity duration-700 ${fresh && leadOverride != null ? "opacity-0" : "opacity-100"}`}
      >
        {entryWhy(d)}
      </p>
    </li>
  );
}
