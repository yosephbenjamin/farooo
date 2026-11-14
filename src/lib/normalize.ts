/** Name normalisation for entity resolution. Pure functions, shared by ingest and the app. */

const LEGAL_SUFFIXES = new Set([
  "oy", "oyj", "ab", "publ", "ky", "ltd", "limited", "llc", "llp", "lp", "inc", "incorporated", "corp", "corporation",
  "gmbh", "ag", "as", "asa", "aps", "sa", "sas", "sarl", "scsp", "scs", "sca", "bv", "nv", "plc", "srl", "spa", "co",
  "ehf", "hf", "kb", "hb", "ou", "uab", "sia", "oü", "kft", "sp", "zoo", "pte", "pty", "company", "the",
]);

const ROMAN = new Set(["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"]);

function base(s: string): string[] {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(publ\)/g, " ")
    .replace(/s\.?\s?à\.?\s?r\.?\s?l\.?/g, " sarl ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Collapse single-letter runs like "l p" -> "lp", "a s" -> "as". */
function joinInitials(tokens: string[]): string[] {
  const out: string[] = [];
  let run = "";
  for (const t of tokens) {
    if (t.length === 1 && /[a-z]/.test(t)) {
      run += t;
    } else {
      if (run) out.push(run);
      run = "";
      out.push(t);
    }
  }
  if (run) out.push(run);
  return out;
}

/** Company key: strips legal forms, punctuation and case. "Carbo Culture Oy" -> "carbo culture". */
export function normalizeCompany(name: string): string {
  let t = joinInitials(base(name));
  while (t.length > 1 && LEGAL_SUFFIXES.has(t[t.length - 1])) t = t.slice(0, -1);
  while (t.length > 1 && LEGAL_SUFFIXES.has(t[0]) && t[0] === "the") t = t.slice(1);
  return t.join(" ");
}

/**
 * Fund key: additionally strips vehicle markers.
 * "Lifeline Ventures Fund II Ky" -> "lifeline ventures", "Creandum III LP" -> "creandum".
 */
export function normalizeFund(name: string): string {
  let t = joinInitials(base(name)).filter((x) => !LEGAL_SUFFIXES.has(x));
  // drop roman numerals / digits that mark fund generations, and the word "fund"
  t = t.filter((x, i) => !(i > 0 && (ROMAN.has(x) || /^\d{1,2}$/.test(x))));
  t = t.filter((x, i) => !(i > 0 && (x === "fund" || x === "funds" || x === "feeder" || x === "parallel")));
  return t.join(" ");
}

export function slug(name: string): string {
  return normalizeFund(name).replace(/\s+/g, "-");
}
