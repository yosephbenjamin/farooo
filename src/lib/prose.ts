/** Faro's voice: terse, declarative, a little lyrical. All copy is generated here. */
import type { Door, DoorReport } from "./doors";

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
function monthOf(iso: string) {
  return MONTHS[Number(iso.split("-")[1]) - 1];
}
function daysAgo(now: string, iso: string) {
  return Math.round((Date.parse(now) - Date.parse(iso)) / 86_400_000);
}

export function doorsThisWeek(r: DoorReport) {
  return r.opened.filter((d) => daysAgo(r.now, d.reason!.date) <= 7);
}

export function headline(r: DoorReport, openedOverride?: Door[]): string {
  const opened = openedOverride ?? r.opened;
  const name = r.startup.name;
  if (!r.startup.investors.length) return `The lighthouse can't see ${name}'s investors yet.`;
  const week = opened.filter((d) => daysAgo(r.now, d.reason!.date) <= 7).length;
  const month = opened.filter((d) => daysAgo(r.now, d.reason!.date) <= 31).length;
  const door = (n: number) => (n === 1 ? "door" : "doors");
  if (week) return `${numWord(week)} ${door(week)} opened for ${name} this week.`;
  if (month) return `${numWord(month)} ${door(month)} opened for ${name} this month.`;
  if (opened.length) {
    const oldest = opened[opened.length - 1].reason!.date;
    return `${numWord(opened.length)} ${door(opened.length)} opened for ${name} since ${monthOf(oldest)}.`;
  }
  return `Quiet water for ${name}. No door has opened lately.`;
}

/** The line under the headline. */
export function subline(r: DoorReport): string | null {
  const n = r.startup.investors.length;
  if (!n) return "Try another name, or one of the demo startups.";
  const names = r.startup.investors.map((i) => i.investorName);
  const list = names.length <= 2 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return `Watched through ${list}.`;
}

/** First line of an entry: who, and what happened. */
export function entryLead(d: Door): { name: string; rest: string } {
  const text = d.reason?.text ?? "";
  return { name: d.name, rest: text ? ` ${text}` : "" };
}

/** Second line: why you, and the warm path. */
export function entryWhy(d: Door): string {
  const via = d.via.map((v) => v.investorName);
  const path = d.timed ? "No shared investor; worth a hello." : `Through ${via.length > 1 ? `${via.slice(0, -1).join(", ")} and ${via.at(-1)}` : via[0]}.`;
  let why = "";
  if (d.fit.score >= 2) why = d.fit.sentence;
  else if (d.blurb) why = `It works on ${d.blurb.replace(/^(a|an|the) /i, (m) => m.toLowerCase())}.`;
  return why ? `${why} ${path}` : path;
}

export function doorCountLine(r: DoorReport): string | null {
  if (!r.doorCount.length) return null;
  return r.doorCount.map((c) => `${c.investorName} ${c.count}`).join("  ·  ");
}

export function emailSubject() {
  return "The lighthouse saw something";
}
