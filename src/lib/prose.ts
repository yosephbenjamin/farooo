/** Faro's voice: terse, declarative, a little lyrical. All copy is generated here. */
import { leadWhyYou, type Door, type DoorReport, type Taps } from "./doors";
import { NO_TAPS } from "./doors";

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
export const numWord = (n: number) => (n < WORDS.length ? WORDS[n] : String(n));

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function shortDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MON[m - 1]} ${y}`;
}
export function dayMonth(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MON[m - 1]}`;
}
const monthOf = (iso: string) => MONTHS[Number(iso.split("-")[1]) - 1];
const daysAgo = (now: string, iso: string) => Math.round((Date.parse(now) - Date.parse(iso)) / 86_400_000);
const list = (xs: string[]) => (xs.length <= 2 ? xs.join(" and ") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

/**
 * "Eleven doors opened for Measur since December. Four through people you know."
 * Counts every door (the log lists the best); the warm paths, Faro's edge, get the second sentence.
 */
export function headline(r: DoorReport, doors: Door[]): string {
  return [opened(r, doors), throughPeople(doors)].filter(Boolean).join(" ");
}

function opened(r: DoorReport, shown: Door[]): string {
  const name = r.startup.name;
  if (!r.startup.country && !r.startup.industries.length) return `The lighthouse can't see ${name} yet.`;
  if (!shown.length) return `Quiet water for ${name}. No door has opened.`;
  const door = (n: number) => (n === 1 ? "door" : "doors");
  const week = shown.filter((d) => daysAgo(r.now, d.whyNow.date) <= 7).length;
  if (week === shown.length) return `${numWord(week)} ${door(week)} opened for ${name} this week.`;
  const month = shown.filter((d) => daysAgo(r.now, d.whyNow.date) <= 31).length;
  if (month === shown.length) return `${numWord(month)} ${door(month)} opened for ${name} this month.`;
  const oldest = [...shown].sort((a, b) => a.whyNow.date.localeCompare(b.whyNow.date))[0].whyNow.date;
  // a month name alone is the most recent one: the year is only needed past eleven months back
  const months = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7));
  const bare = months(r.now) - months(oldest) < 12;
  return `${numWord(shown.length)} ${door(shown.length)} opened for ${name} since ${monthOf(oldest)}${bare ? "" : ` ${oldest.slice(0, 4)}`}.`;
}

/** "Four through people you know." / "All through people you know." / "" */
export function throughPeople(doors: Door[]): string {
  const warm = doors.filter((d) => d.warm.length).length;
  if (!warm) return "";
  if (warm === doors.length && warm > 1) return "All through people you know.";
  if (warm === 1 && doors.length === 1) return "Through someone you know.";
  return `${numWord(warm)} through people you know.`;
}

/** The line under the headline: where we're watching and through whom. */
export function subline(r: DoorReport): string | null {
  const s = r.startup;
  if (!s.country) return "Try another name, or one of the demo startups.";
  // warm-path investors first, then the rest; all-caps legal names in normal case
  const warm = new Set(r.doors.flatMap((d) => d.warm.map((w) => w.investor)));
  const tidy = (n: string) => (n === n.toUpperCase() && /[A-Z]{4,}/.test(n) ? n.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()) : n).replace(/,? (LP|LLC|LLP|Ltd|AB|Oy|Inc)\.?$/i, "");
  const inv = [...s.investors].sort((a, b) => Number(warm.has(b.name)) - Number(warm.has(a.name))).map((i) => tidy(i.name)).slice(0, 3);
  return inv.length ? `Watching ${s.country}, through ${list(inv)}.` : `Watching ${s.country}.`;
}

/** 1. Why now. The fact as Cala has it, said the way a person would. */
export function entryLead(d: Door): { name: string; rest: string } {
  const text = d.whyNow.text
    .replace(/^grew from (\d[\d,.]*) to (\d[\d,.]*) people$/, "grew from $1 people to $2")
    .replace(/^raised a round$/, "raised new money");
  return { name: d.name, rest: ` ${text}` };
}

/** 2. Why you. */
export function entryWhy(d: Door, taps: Taps = NO_TAPS): string {
  return leadWhyYou(d, taps).sentence;
}

/**
 * 3–5. Who can introduce you (the investor you share, and whether they led), where to meet, who
 * to ask for. Sentences without their full stop; the view joins them and renders the X-ray link.
 */
export function entryMeta(d: Door): { parts: string[]; people: string | null } {
  const parts: string[] = [];
  if (d.warm.length) {
    const led = d.warm.filter((w) => w.led).map((w) => w.investor);
    const rest = d.warm.filter((w) => !w.led).map((w) => w.investor);
    if (led.length) parts.push(`${list(led)} led their round and ${led.length > 1 ? "back" : "backs"} you too`);
    if (rest.length) parts.push(led.length ? `So ${rest.length > 1 ? "do" : "does"} ${list(rest)}` : `${list(rest)} ${rest.length > 1 ? "back" : "backs"} you both`);
  }
  if (d.slush) parts.push("They'll be at Slush 2026");
  const names = d.people.map((p) => `${p.name}, ${p.role}`);
  const people = names.length ? `Ask for ${names.length > 1 ? `${names.slice(0, -1).join("; ")}, or ${names.at(-1)}` : names[0]}` : null;
  return { parts, people };
}

export function sourceLine(d: Door): string {
  const s = d.whyNow.source;
  // a page title ("Welcome to GOV.UK", "News | Acme") reads worse than the host
  const titleLike = /^(welcome|home)\b|\s[|\-–]\s|:\s/i.test(s.name ?? "");
  const name = s.name && s.name.length < 40 && !/^https?:/.test(s.name) && !titleLike ? s.name.replace(/^www\./, "") : hostName(s.url);
  return `${shortDate(d.whyNow.date)}, ${name}${s.rank ? `, ${s.rank.toLowerCase()}` : ""}`;
}

/** The quiet † footnote when Cala's industry code contradicted the description. */
export function industryNoteLine(d: Door): string | null {
  const n = d.industryNote;
  if (!n) return null;
  return `${d.name}: Cala files it under ${n.coded}, but its description says ${n.read}. We read the description. Uncertain.`;
}

function hostName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Door Count: who the warm paths run through, quietly. "Four through Lifeline Ventures, one through Tesi." */
export function doorCountLine(r: DoorReport): string | null {
  const counts = new Map<string, number>();
  for (const d of r.doors) for (const w of d.warm) counts.set(w.investor, (counts.get(w.investor) ?? 0) + 1);
  if (!counts.size) return null;
  const line = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${numWord(c).toLowerCase()} through ${n}`).join(", ");
  return `${line[0].toUpperCase()}${line.slice(1)}.`;
}

/** The subject is the news itself: "Volare raised a €7.1M Series A. Four more doors opened." */
export function emailSubject(fresh: Door[] = []) {
  const top = fresh[0];
  if (!top) return "A door opened";
  const more = fresh.length - 1;
  return `${top.name}${entryLead(top).rest}.${more ? ` ${numWord(more)} more ${more === 1 ? "door" : "doors"} opened.` : ""}`;
}

void dayMonth;
