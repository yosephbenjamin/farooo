"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { firstLook, leadWhyYou, rankDoors, tierOf, type Door, type DoorReport, type Taps } from "@/lib/doors";
import { doorCountLine, entryLead, entryMeta, entryWhy, headline, industryNoteLine, numWord, sourceLine } from "@/lib/prose";
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

type Pick = { door: Door; type?: PartnerType; added?: boolean };
const reasonOf = (d: Door) => (d.whyNow.kind === "news" || d.whyNow.kind === "entry" ? "entry" : d.whyNow.kind);

export function LogView({ report, slug, taps: initialTaps, booth = false, scriptedId = null, autoMs = null }: Props) {
  const [taps, setTaps] = useState<Taps>(initialTaps);
  const [revealed, setRevealed] = useState(!scriptedId);
  const [typed, setTyped] = useState(0);

  // What the page opened with: the first look (three doors of different kinds), or, for someone who
  // has tapped before, their ranked doors. It stays put while they tap: "more like this" adds doors
  // like the tapped one right below it, "not now" removes a door. Nothing else moves.
  const [initial] = useState<Pick[]>(() =>
    booth || initialTaps.touched ? rankDoors(report.doors, initialTaps).slice(0, booth ? undefined : 6).map((door) => ({ door })) : firstLook(report.doors),
  );
  const [more, setMore] = useState<Record<string, Pick[]>>({});
  const all = useMemo<Pick[]>(() => {
    const hidden = new Set(taps.hidden);
    const out: Pick[] = [];
    const add = (x: Pick) => {
      if (hidden.has(x.door.id) || out.some((o) => o.door.id === x.door.id)) return;
      out.push(x);
      for (const y of more[x.door.id] ?? []) add(y);
    };
    initial.forEach(add);
    return out;
  }, [initial, more, taps]);
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

  const max = booth ? 3 : all.length;
  const visible = (scripted && !revealed ? all.filter((x) => x.door.id !== scripted.id) : all).slice(0, max);
  const ordered = scripted && revealed ? [all.find((x) => x.door.id === scripted.id)!, ...visible.filter((x) => x.door.id !== scripted.id)].slice(0, max) : visible;
  const shownDoors = ordered.map((x) => x.door);
  const count = doorCountLine(report);

  const tap = (d: Door, type: PartnerType, kind: "more" | "notnow") => {
    const next = applyTap(taps, type, kind, d.id);
    setTaps(next);
    if (kind === "more") {
      // up to two doors like this one (same partnership, same reason first), right below it
      const shown = new Set(all.map((x) => x.door.id));
      const like = rankDoors(report.doors, next)
        .filter((x) => !shown.has(x.id) && x.whyYou.some((w) => w.type === type))
        .map((x, i) => ({ x, i, same: reasonOf(x) === reasonOf(d) ? 0 : 1 }))
        .sort((a, b) => a.same - b.same || a.i - b.i)
        .slice(0, 2)
        .map(({ x }) => ({ door: x, type, added: true }));
      setMore((m) => ({ ...m, [d.id]: like }));
    }
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
    ? { h1: "text-[clamp(44px,3.5vw,72px)] leading-[1.06]", lead: "text-[clamp(26px,2.05vw,40px)]", why: "text-[clamp(20px,1.5vw,30px)]", small: "text-[clamp(15px,1vw,20px)]", gap: "space-y-[3.4vh]" }
    : { h1: "text-[clamp(34px,4.2vw,60px)] leading-[1.07]", lead: "text-[23px] sm:text-[27px]", why: "text-[17px] sm:text-[19px]", small: "text-[14px] sm:text-[15px]", gap: "space-y-11" };
  // the headline's two sentences: what opened, then the warm paths on a line of their own
  const [opened, ...through] = headline(report, rankDoors(report.doors, taps)).split(/(?<=\.) /);

  return (
    <main className={`mx-auto w-full ${booth ? "max-w-[1800px] px-[4vw] py-[4vh] min-h-screen" : "max-w-[76rem] px-5 sm:px-10 py-8 sm:py-12"}`}>
      <header className={`flex items-center justify-between ${booth ? "mb-[5vh]" : "mb-10 sm:mb-16"}`}>
        <Link href="/" className="flex items-end gap-2.5 no-underline" aria-label="Faro, home">
          <Lighthouse mark className={booth ? "h-12 w-auto" : "h-9 w-auto"} lit={revealed} />
          <span className={`pb-0.5 uppercase tracking-[0.22em] text-ink ${booth ? "text-lg" : "text-[14px]"}`}>Faro</span>
        </Link>
        {scripted && !revealed && (
          <button onClick={reveal} className={`uppercase tracking-[0.22em] text-ink-500 underline decoration-ink-300 underline-offset-[6px] ${booth ? "text-lg" : "text-[14px]"}`}>
            Open the door
          </button>
        )}
      </header>

      <h1 className={`font-light tracking-[-0.018em] text-ink-deep ${T.h1}`}>
        <span className="block max-w-[30ch] [text-wrap:balance]">{opened}</span>
        {through.length > 0 && <span className="mt-[0.3em] block text-[0.74em] italic text-ink-500">{through.join(" ")}</span>}
      </h1>

      <div className={`grid gap-12 ${booth ? "mt-[5vh] lg:grid-cols-[1fr_1fr] lg:gap-[5vw]" : "mt-12 sm:mt-16 md:grid-cols-[1.05fr_1fr] md:gap-16"}`}>
        <section>
          <ol className={T.gap}>
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
                  added={!!x.added}
                  moreShown={more[x.door.id]?.length}
                  onTap={booth ? null : tap}
                />
              );
            })}
          </ol>

          {shownDoors.length > 0 && (
            <ol className={`mt-14 space-y-1.5 border-t border-paper-200 pt-6 text-ink-500 ${T.small}`}>
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
            <p className={`mt-6 italic text-ink-500 ${T.small}`}>
              {count}
            </p>
          )}
        </section>

        <aside className={booth ? "lg:sticky lg:top-[6vh] self-start" : "md:sticky md:top-12 self-start"}>
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
  added,
  moreShown,
  onTap,
}: {
  d: Door;
  type: PartnerType;
  taps: Taps;
  n: number;
  T: { lead: string; why: string; small: string };
  leadOverride?: string | null;
  fresh?: boolean;
  /** Added by a "more like this" tap: fades in. */
  added?: boolean;
  /** How many doors a "more like this" tap on this door added (undefined: not tapped). */
  moreShown?: number;
  onTap: ((d: Door, type: PartnerType, kind: "more" | "notnow") => void) | null;
}) {
  const lead = entryLead(d);
  const why = d.whyYou.find((w) => w.type === type)?.sentence ?? entryWhy(d, taps);
  // "Customer. A food company…": the partnership is a small label, the rest is the sentence
  const cut = why.indexOf(". ");
  const [kind, because] = cut > 0 && cut < 14 ? [why.slice(0, cut), why.slice(cut + 2)] : [null, why];
  const meta = entryMeta(d);
  // who can introduce you is Faro's edge: those sentences sit a shade darker than the rest
  const warmN = (d.warm.some((w) => w.led) ? 1 : 0) + (d.warm.some((w) => !w.led) ? 1 : 0);
  const warm = meta.parts.slice(0, warmN);
  const rest = [...meta.parts.slice(warmN), meta.people].filter(Boolean) as string[];
  const hide = fresh && leadOverride != null ? "opacity-0" : "opacity-100";
  return (
    <li data-tier={tierOf(d)} className={added ? "door-in" : undefined}>
      {/* 1. why now */}
      <p className={`${T.lead} max-w-[32ch] leading-[1.25] tracking-[-0.005em] text-ink-deep`}>
        {leadOverride != null ? (
          <span className="caret">{leadOverride}</span>
        ) : (
          <>
            <span className="font-medium">{lead.name}</span>
            {lead.rest}.
            <a href={d.whyNow.source.url} target="_blank" rel="noreferrer" className="no-underline" aria-label={`Source ${n}`}>
              <sup className="ml-0.5 text-[0.55em] text-ink-500">{n}</sup>
            </a>
          </>
        )}
      </p>
      {/* 2. why you */}
      <p className={`mt-[0.55em] ${T.why} max-w-[44ch] leading-[1.45] text-ink-500 transition-opacity duration-700 ${hide}`}>
        {kind && <span className="mr-[0.7em] text-[0.72em] uppercase tracking-[0.16em] text-ink">{kind}</span>}
        {because}
        {d.industryNote && (
          <sup className="ml-0.5 text-[0.6em] text-ink-500" title={industryNoteLine(d) ?? undefined}>
            †
          </sup>
        )}
      </p>
      {/* 3–5. where to meet, warm path, who */}
      <p className={`mt-[0.2em] ${T.why} max-w-[44ch] leading-[1.45] text-ink-500 italic transition-opacity duration-700 ${hide}`}>
        {warm.length > 0 && <span className="text-ink-deep">{warm.join(". ")}. </span>}
        {rest.length > 0 && `${rest.join(". ")}. `}
        {!meta.people && (
          <a href={d.xray} target="_blank" rel="noreferrer" className="not-italic">
            Find the right person →
          </a>
        )}
      </p>
      {onTap && (
        <p className={`mt-3.5 flex gap-6 text-[15px] text-ink-500 transition-opacity duration-700 ${hide}`}>
          {moreShown === undefined ? (
            <button className="underline decoration-ink-300 underline-offset-4" onClick={() => onTap(d, type, "more")}>
              more like this
            </button>
          ) : (
            <span className="text-ink-deep">{moreShown ? `${numWord(moreShown)} more like this below` : "No more like this yet"}</span>
          )}
          <button className="underline decoration-ink-300 underline-offset-4" onClick={() => onTap(d, type, "notnow")}>
            not now
          </button>
        </p>
      )}
    </li>
  );
}
