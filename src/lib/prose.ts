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

export function headline(r: DoorReport, shown: Door[]): string {
  const name = r.startup.name;
  if (!r.startup.country && !r.startup.industries.length) return `The lighthouse can't see ${name} yet.`;
  if (!shown.length) return `Quiet water for ${name}. No door has opened.`;
  const door = (n: number) => (n === 1 ? "door" : "doors");
  const week = shown.filter((d) => daysAgo(r.now, d.whyNow.date) <= 7).length;
  if (week === shown.length) return `${numWord(week)} ${door(week)} opened for ${name} this week.`;
  const month = shown.filter((d) => daysAgo(r.now, d.whyNow.date) <= 31).length;
  if (month === shown.length) return `${numWord(month)} ${door(month)} opened for ${name} this month.`;
  const oldest = [...shown].sort((a, b) => a.whyNow.date.localeCompare(b.whyNow.date))[0].whyNow.date;
  const sameYear = oldest.slice(0, 4) === r.now.slice(0, 4);
  return `${numWord(shown.length)} ${door(shown.length)} opened for ${name} since ${monthOf(oldest)}${sameYear ? "" : ` ${oldest.slice(0, 4)}`}.`;
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

/** 1. Why now. */
export function entryLead(d: Door): { name: string; rest: string } {
  return { name: d.name, rest: ` ${d.whyNow.text}` };
}

/** 2. Why you. */
export function entryWhy(d: Door, taps: Taps = NO_TAPS): string {
  return leadWhyYou(d, taps).sentence;
}

/** 3–5. Where to meet, warm path, who. Returns parts; the view renders the X-ray link. */
export function entryMeta(d: Door): { parts: string[]; people: string | null } {
  const parts: string[] = [];
  if (d.slush) parts.push("Meet them at Slush 2026");
  if (d.warm.length) {
    const led = d.warm.filter((w) => w.led).map((w) => w.investor);
    const rest = d.warm.filter((w) => !w.led).map((w) => w.investor);
    if (led.length) parts.push(`Through ${list(led)}, who led their round${rest.length ? `; also ${list(rest)}` : ""}`);
    else parts.push(`Through ${list(rest)}`);
  }
  const people = d.people.length ? d.people.map((p) => `${p.name}, ${p.role}`).join("; ") : null;
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
  return `${d.name}: Cala codes it ${n.coded}; why-you read from its description (${n.read}). Uncertain.`;
}

function hostName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Door Count: doors each investor opens (warm paths), quietly. */
export function doorCountLine(r: DoorReport): string | null {
  const counts = new Map<string, number>();
  for (const d of r.doors) for (const w of d.warm) counts.set(w.investor, (counts.get(w.investor) ?? 0) + 1);
  if (!counts.size) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} ${c}`).join(", ");
}

export function emailSubject() {
  return "The lighthouse saw something";
}

void dayMonth;
