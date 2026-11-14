/** JSON shapes for the API and the Gmail add-on. */
import { firstLook, leadWhyYou, rankDoors, NO_TAPS, type Door, type DoorReport, type Taps } from "./doors";
import type { PartnerType } from "./partner";
import { entryLead, entryMeta, headline, industryNoteLine, sourceLine } from "./prose";
import { parseTaps } from "./taps";

/** One door in five parts. `type` is the partnership shown (the first-look slot, else the user's lead type). */
export function doorJson(d: Door, taps: Taps = NO_TAPS, type?: PartnerType) {
  const l = entryLead(d);
  const m = entryMeta(d);
  const t = type ?? leadWhyYou(d, taps).type;
  return {
    id: d.id,
    name: d.name,
    lead: `${l.name}${l.rest}.`,
    type: t,
    why: d.whyYou.find((w) => w.type === t)?.sentence ?? leadWhyYou(d, taps).sentence,
    types: d.whyYou.map((w) => w.type),
    meta: m.parts,
    people: m.people,
    xray: d.xray,
    footnote: sourceLine(d),
    source: d.whyNow.source.url,
    /** Cala's industry code contradicted its description: the why line is uncertain. */
    note: industryNoteLine(d),
  };
}

export function logJson(r: DoorReport, tapsRaw: string | null) {
  const taps = parseTaps(tapsRaw);
  const picks: { door: Door; type?: PartnerType }[] = taps.touched ? rankDoors(r.doors, taps).slice(0, 6).map((door) => ({ door })) : firstLook(r.doors);
  return {
    startup: r.startup.name,
    country: r.startup.country,
    headline: headline(r, rankDoors(r.doors, taps)), // every door, though only the best are listed
    doors: picks.map((x) => doorJson(x.door, taps, x.type)),
  };
}
