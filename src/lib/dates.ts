/**
 * Date extraction. Faro only alerts on concrete (day-precision) dates.
 * "Recent", "Early Nov 2026", "Q3 2026" and "Oct 2026" are not concrete.
 */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};

function iso(y: number, m: number, d: number): string | null {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return dt.toISOString().slice(0, 10);
}

const MON = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

/** Concrete date in free text, or null. Takes the first match. */
export function concreteDateInText(text: string): string | null {
  const t = text.toLowerCase();
  let m = t.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = t.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MON}\\.?,?\\s+(20\\d{2})\\b`));
  if (m) return iso(+m[3], MONTHS[m[2].replace(".", "")], +m[1]);
  m = t.match(new RegExp(`\\b${MON}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d{2})\\b`));
  if (m) return iso(+m[3], MONTHS[m[1].replace(".", "")], +m[2]);
  return null;
}

/** Concrete date from a URL path like /2026/11/07/ or -2026-11-07-. */
export function concreteDateInUrl(url: string): string | null {
  let m = url.match(/\/(20\d{2})\/(\d{1,2})\/(\d{1,2})(?:\/|$)/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = url.match(/[/_-](20\d{2})-(\d{2})-(\d{2})(?:[/_.-]|$)/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = url.match(/[/_-](20\d{2})(\d{2})(\d{2})(?:[/_.-]|$)/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  return null;
}

/** Month precision (for matching a vague query row against a dated round). */
export function monthInText(text: string): { y: number; m: number } | null {
  const t = text.toLowerCase();
  const m = t.match(new RegExp(`${MON}\\.?\\s+(20\\d{2})`));
  if (m) return { y: +m[2], m: MONTHS[m[1].replace(".", "")] };
  const n = t.match(/\b(20\d{2})-(\d{2})\b/);
  if (n) return { y: +n[1], m: +n[2] };
  return null;
}

export function isPlaceholderDate(text: string | null | undefined): boolean {
  return !text || /recent|ongoing|upcoming|tbd|n\/a|unknown|not (specified|disclosed)/i.test(text);
}
