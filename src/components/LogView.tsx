"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { firstLook, leadWhyYou, rankDoors, tierOf, type Door, type DoorReport, type Taps } from "@/lib/doors";
import { doorCountLine, entryLead, entryMeta, entryWhy, headline, industryNoteLine, sourceLine, subline } from "@/lib/prose";
import { applyTap, serializeTaps, tapsCookie } from "@/lib/taps";
import type { PartnerType } from "@/lib/partner";
import { DoorMap } from "./DoorMap";
import { Lighthouse } from "./Lighthouse";

interface Props {
  report: DoorReport;
  slug: string;
  taps: Taps;
  booth?: boolean;
  /** Door held back for the scripted "a door opens" moment (booth mode). */
  scriptedId?: string | null;
  /** Reveal the scripted door automatically after this many ms. */
  autoMs?: number | null;
}

const NEW = "__new";

export function LogView({ report, slug, taps: initialTaps, booth = false, scriptedId = null, autoMs = null }: Props) {
  const [taps, setTaps] = useState<Taps>(initialTaps);
  const [revealed, setRevealed] = useState(!scriptedId);
  const [typed, setTyped] = useState(0);

  // The first look (no taps yet): three doors of different partnership types. After a tap: ranked.
  const all = useMemo<{ door: Door; type?: PartnerType }[]>(
    () => (taps.touched || booth ? rankDoors(report.doors, taps).map((door) => ({ door })) : firstLook(report.doors)),
    [report, taps, booth],
  );
  const scripted = useMemo(() => all.find((x) => x.door.id === scriptedId)?.door ?? null, [all, scriptedId]);
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
    if (!revealed || !scripted || typed >= leadText.length) return;
    const t = window.setTimeout(() => setTyped((n) => n + 1), 38);
    return () => window.clearTimeout(t);
  }, [revealed, scripted, typed, leadText]);

  const max = booth ? 3 : taps.touched ? 6 : 3;
  const visible = (scripted && !revealed ? all.filter((x) => x.door.id !== scripted.id) : all).slice(0, max);
  const ordered = scripted && revealed ? [all.find((x) => x.door.id === scripted.id)!, ...visible.filter((x) => x.door.id !== scripted.id)].slice(0, max) : visible;
  const shownDoors = ordered.map((x) => x.door);
  const count = doorCountLine(report);

  const tap = (d: Door, type: PartnerType, kind: "more" | "notnow") => {
    const next = applyTap(taps, type, kind, d.id);
    setTaps(next);
    try {
      document.cookie = `${tapsCookie(slug)}=${serializeTaps(next)}; path=/; max-age=31536000; samesite=lax`;
    } catch {}
  };

  // map: buildings are the investors behind warm paths, plus one for newcomers without one
  const country = report.startup.country ?? "your market";
  // a building per investor that is the first warm path of at least one door (no empty buildings)
  const warmNames = [...new Set(rankDoors(report.doors, taps).flatMap((d) => (d.warm[0] ? [d.warm[0].investor] : [])))];
  const mapInvestors = [
    ...warmNames.slice(0, 5).map((n) => ({ id: n, name: n })),
    ...(report.doors.some((d) => !d.warm.some((w) => warmNames.slice(0, 5).includes(w.investor))) ? [{ id: NEW, name: `New in ${country}` }] : []),
  ];
  const mapDoors = useMemo(
    () =>
      rankDoors(report.doors, taps).map((d) => ({
        id: d.id,
        name: d.name,
        investorIds: (() => {
          const ids = d.warm.map((w) => w.investor).filter((n) => warmNames.slice(0, 5).includes(n));
          return ids.length ? ids : [NEW];
        })(),
        lit: shownDoors.some((s) => s.id === d.id) || d.id === scriptedId,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [report, taps, shownDoors.map((d) => d.id).join(), scriptedId],
  );

  const T = booth
    ? { h1: "text-[clamp(44px,4.4vw,88px)] leading-[1.03]", lead: "text-[clamp(24px,1.95vw,38px)]", why: "text-[clamp(18px,1.35vw,26px)]", small: "text-[clamp(13px,0.85vw,17px)]", gap: "space-y-8" }
    : { h1: "text-[clamp(38px,5vw,64px)] leading-[1.05]", lead: "text-[22px] sm:text-[25px]", why: "text-[17px] sm:text-[19px]", small: "text-[12px]", gap: "space-y-9" };

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
          <h1 className={`font-light tracking-[-0.015em] text-ink-deep ${T.h1}`}>{headline(report, rankDoors(report.doors, taps))}</h1>
          {subline(report) && <p className={`mt-4 italic text-ink-500 ${T.why}`}>{subline(report)}</p>}

          <ol className={`${booth ? "mt-[5vh]" : "mt-12"} ${T.gap}`}>
            {ordered.map((x, i) => {
              const isScripted = scripted && revealed && x.door.id === scripted.id;
              return (
                <Entry
                  key={x.door.id}
                  d={x.door}
                  type={x.type ?? leadWhyYou(x.door, taps).type}
                  taps={taps}
                  n={i + 1}
                  T={T}
                  leadOverride={isScripted && typed < leadText.length ? leadText.slice(0, typed) : null}
                  fresh={!!isScripted}
                  onTap={booth ? null : tap}
                />
              );
            })}
          </ol>

          {shownDoors.length > 0 && (
            <ol className={`mono mt-14 space-y-1 text-ink-500 ${T.small}`}>
              {shownDoors.map((d, i) => (
                <li key={`fn-${d.id}`} className="flex gap-3">
                  <span className="w-4 text-right text-ink-300">{i + 1}</span>
                  <a href={d.whyNow.source.url} target="_blank" rel="noreferrer" className="no-underline hover:underline">
                    {sourceLine(d)}
                  </a>
                </li>
              ))}
              {shownDoors.filter((d) => d.industryNote).map((d) => (
                <li key={`ind-${d.id}`} className="flex gap-3 text-ink-300">
                  <span className="w-4 text-right">†</span>
                  <span>{industryNoteLine(d)}</span>
                </li>
              ))}
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
            investors={mapInvestors}
            doors={mapDoors}
            holdId={scripted && !revealed ? scripted.id : null}
            animateId={scripted && revealed ? scripted.id : null}
            className="w-full h-auto"
            maxPerInvestor={25}
            big={booth}
          />
        </aside>
      </div>
    </main>
  );
}

function Entry({
  d,
  type,
  taps,
  n,
  T,
  leadOverride,
  fresh,
  onTap,
}: {
  d: Door;
  type: PartnerType;
  taps: Taps;
  n: number;
  T: { lead: string; why: string; small: string };
  leadOverride?: string | null;
  fresh?: boolean;
  onTap: ((d: Door, type: PartnerType, kind: "more" | "notnow") => void) | null;
}) {
  const lead = entryLead(d);
  const why = d.whyYou.find((w) => w.type === type)?.sentence ?? entryWhy(d, taps);
  const meta = entryMeta(d);
  const hide = fresh && leadOverride != null ? "opacity-0" : "opacity-100";
  return (
    <li data-tier={tierOf(d)}>
      {/* 1. why now */}
      <p className={`${T.lead} max-w-[30ch] leading-snug text-ink-deep`}>
        {leadOverride != null ? (
          <span className="caret">{leadOverride}</span>
        ) : (
          <>
            <span className="font-medium">{lead.name}</span>
            {lead.rest}.
            <a href={d.whyNow.source.url} target="_blank" rel="noreferrer" className="no-underline" aria-label={`Source ${n}`}>
              <sup className="mono ml-0.5 text-[0.5em] text-ink-500">{n}</sup>
            </a>
          </>
        )}
      </p>
      {/* 2. why you */}
      <p className={`mt-1.5 ${T.why} max-w-[46ch] leading-relaxed text-ink-500 transition-opacity duration-700 ${hide}`}>
        {why}
        {d.industryNote && (
          <sup className="mono ml-0.5 text-[0.6em] text-ink-300" title={industryNoteLine(d) ?? undefined}>
            †
          </sup>
        )}
      </p>
      {/* 3–5. where to meet · warm path · who */}
      <p className={`mt-1 ${T.why} max-w-[46ch] leading-relaxed text-ink-500 italic transition-opacity duration-700 ${hide}`}>
        {[...meta.parts, meta.people].filter(Boolean).join(". ")}
        {meta.parts.length || meta.people ? (meta.people ? ". " : ". ") : ""}
        {!meta.people && (
          <a href={d.xray} target="_blank" rel="noreferrer" className="not-italic">
            Find the right person →
          </a>
        )}
      </p>
      {onTap && (
        <p className={`mono mt-2 text-[11px] text-ink-300 transition-opacity duration-700 ${hide}`}>
          <button className="hover:text-ink" onClick={() => onTap(d, type, "more")}>
            more like this
          </button>
          <span className="px-1.5">·</span>
          <button className="hover:text-ink" onClick={() => onTap(d, type, "notnow")}>
            not now
          </button>
        </p>
      )}
    </li>
  );
}
