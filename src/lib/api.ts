/** JSON shapes for the API and the Gmail add-on. */
import { firstLook, rankDoors, NO_TAPS, type Door, type DoorReport } from "./doors";
import { entryLead, entryMeta, entryWhy, headline, sourceLine } from "./prose";
import { parseTaps } from "./taps";

export function doorJson(d: Door, taps = NO_TAPS) {
  const l = entryLead(d);
  const m = entryMeta(d);
  return {
    id: d.id,
    name: d.name,
    lead: `${l.name}${l.rest}.`,
    why: entryWhy(d, taps),
    types: d.whyYou.map((w) => w.type),
    meta: m.parts,
    people: m.people,
    xray: d.xray,
    footnote: sourceLine(d),
    source: d.whyNow.source.url,
  };
}

export function logJson(r: DoorReport, tapsRaw: string | null) {
  const taps = parseTaps(tapsRaw);
  const doors = taps.touched ? rankDoors(r.doors, taps).slice(0, 6) : firstLook(r.doors).map((x) => x.door);
  return { startup: r.startup.name, country: r.startup.country, headline: headline(r, doors), doors: doors.map((d) => doorJson(d, taps)) };
}

