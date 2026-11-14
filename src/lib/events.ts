/** "Door opened" events produced by the timing jobs (M3a rounds, M3b market entry). */
export interface FaroEvent {
  id: string;
  kind: "round" | "market-entry";
  /** Canonical dataset company id, if the company is in a keyring. */
  companyId: string | null;
  /** Cala entity id, if resolved. */
  calaId: string | null;
  companyName: string;
  /** YYYY-MM-DD, always concrete. */
  date: string;
  /** Short predicate: "raised a €9M Series A", "is entering Finland". */
  text: string;
  /** Market entered (M3b only). */
  market?: string;
  source: { name: string; url: string };
  /** What the company does, as reported alongside the event (sector line). */
  description?: string;
  /** Seed investors in the round (M3a), when known. */
  investorIds?: string[];
  /** Where the event came from. */
  origin: "query" | "search" | "graph";
  detectedAt: string;
}
