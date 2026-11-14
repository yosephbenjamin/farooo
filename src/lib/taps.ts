/**
 * "more like this · not now": the only intent signal. Stored per startup in a cookie on the web
 * (so the server can rank) and in user properties in Gmail. Client-safe.
 */
import type { PartnerType } from "./partner";
import { NO_TAPS, type Taps } from "./doors";

export const tapsCookie = (slug: string) => `faro_taps_${slug.replace(/[^a-z0-9-]/g, "")}`;

export function parseTaps(raw: string | undefined | null): Taps {
  if (!raw) return NO_TAPS;
  try {
    const t = JSON.parse(decodeURIComponent(raw));
    return { weights: t.weights ?? {}, hidden: Array.isArray(t.hidden) ? t.hidden.slice(-200) : [], touched: !!t.touched };
  } catch {
    return NO_TAPS;
  }
}

export function applyTap(t: Taps, type: PartnerType, kind: "more" | "notnow", doorId: string): Taps {
  const weights = { ...t.weights, [type]: (t.weights[type] ?? 0) + (kind === "more" ? 1 : -1) };
  const hidden = kind === "notnow" ? [...t.hidden, doorId] : t.hidden;
  return { weights, hidden, touched: true };
}

export function serializeTaps(t: Taps): string {
  return encodeURIComponent(JSON.stringify(t));
}
