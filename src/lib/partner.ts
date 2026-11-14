/**
 * Why you: the partnership a door will need from you. Decided only from structured fields:
 * industry (OPERATES_IN_INDUSTRY code + the source's label) and headquarters country,
 * plus whether the door is entering your market. No keyword guesses on descriptions.
 */
import type { Industry } from "./profile";

export type PartnerType = "customer" | "integration" | "distribution";
export const PARTNER_TYPES: PartnerType[] = ["customer", "distribution", "integration"];

/**
 * Cala's industry codes (e.g. SOFTWARE_AND_SERVICES, FINTECH, INTERNET_AND_WEB_SERVICES,
 * MEDICAL_DEVICES, RENEWABLE_ENERGY, TRANSPORTATION_AND_LOGISTICS) grouped into sectors by the
 * code itself. Structured taxonomy, not description keywords.
 */
export type Sector = "tech" | "finance" | "health" | "energy" | "industrial" | "mobility" | "consumer" | "services" | "agri";

const SECTOR_OF: [RegExp, Sector][] = [
  [/FINTECH|BANK|FINANCIAL|INSURANCE|PAYMENT|CAPITAL_MARKETS|INVESTMENT|CRYPTO|BLOCKCHAIN/, "finance"],
  [/SOFTWARE|INTERNET|WEB|HARDWARE|SEMICONDUCTOR|TELECOM|ELECTRONIC|COMPUTER|^IT_|CYBER|DATA|CLOUD|ARTIFICIAL|QUANTUM/, "tech"],
  [/HEALTH|MEDICAL|PHARMA|BIOTECH|LIFE_SCIENCE|DIAGNOSTIC|WELLNESS/, "health"],
  [/ENERGY|UTILIT|RENEWABLE|OIL|GAS|POWER|CLEANTECH|CLIMATE/, "energy"],
  [/TRANSPORT|LOGISTIC|AUTOMOTIVE|AUTOMOBILE|AIRLINE|SHIPPING|MOBILITY|AVIATION/, "mobility"],
  [/CONSTRUCTION|ENGINEERING|MANUFACTUR|MACHINERY|INDUSTRIAL|AEROSPACE|DEFEN|CHEMICAL|MATERIAL|METAL|MINING|CAPITAL_GOODS|ROBOT/, "industrial"],
  [/AGRICULT|FARM|FOOD_PRODUCTION|FORESTRY|AQUACULTURE/, "agri"],
  [/RETAIL|CONSUMER|FOOD|BEVERAGE|APPAREL|FASHION|E_?COMMERCE|HOSPITALITY|TRAVEL|RESTAURANT|GAMING|GAMES|ENTERTAINMENT|MEDIA|SPORT|HOUSEHOLD|PERSONAL/, "consumer"],
  [/ADVERTIS|MARKETING|CONSULT|PROFESSIONAL|LEGAL|EDUCATION|STAFFING|HUMAN_RESOURCES|REAL_ESTATE|COMMERCIAL_SERVICES|BUSINESS_SERVICES/, "services"],
];

export function sectorOf(code: string): Sector | null {
  for (const [re, s] of SECTOR_OF) if (re.test(code)) return s;
  return null;
}

/** Who buys from whom, by sector. Read: KEY sells to companies in VALUES. */
const SELLS_TO: Record<Sector, Sector[]> = {
  tech: ["finance", "health", "energy", "industrial", "mobility", "consumer", "services", "agri"],
  finance: ["tech", "consumer", "services", "mobility", "industrial", "health", "energy", "agri"],
  services: ["tech", "finance", "health", "energy", "industrial", "mobility", "consumer", "agri"],
  energy: ["industrial", "mobility", "tech", "agri"],
  industrial: ["energy", "mobility", "industrial", "agri"],
  mobility: ["consumer", "industrial", "agri"],
  health: ["health"],
  agri: ["consumer"],
  consumer: [],
};

/** Pairs whose products connect: software with software, payments with software. */
const INTEGRATES: [Sector, Sector][] = [["tech", "tech"], ["tech", "finance"], ["finance", "tech"], ["tech", "health"], ["health", "tech"]];

const WORDS: Record<string, string> = {
  SOFTWARE_AND_SERVICES: "software",
  INTERNET_AND_WEB_SERVICES: "web services",
  HARDWARE_AND_EQUIPMENT: "hardware",
  FINTECH: "fintech",
  HEALTHCARE_PROVIDERS: "health care",
  MEDICAL_DEVICES: "medical devices",
  RENEWABLE_ENERGY: "renewable energy",
  TRANSPORTATION_AND_LOGISTICS: "transport and logistics",
  ADVERTISING_AND_MARKETING: "marketing",
  CONSTRUCTION_AND_ENGINEERING: "construction",
};

/** "enterpriseSoftware" -> "enterprise software", "ai" -> "AI", "SOFTWARE_AND_SERVICES" -> "software". */
export function industryWords(ind: Industry): string {
  const l = ind.label?.trim();
  if (l && l.length > 1 && !/^[A-Z_]+$/.test(l)) {
    const w = l
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .toLowerCase()
      .replace(/\b(ai|ml|saas|b2b|iot|hr|it|ar|vr|api|ev)\b/g, (m) => m.toUpperCase().replace("SAAS", "SaaS"));
    if (w.length <= 5 && /SOFTWARE|INTERNET|WEB/.test(ind.code)) return `${w} software`;
    return w;
  }
  return WORDS[ind.code] ?? ind.code.toLowerCase().replace(/_/g, " ");
}

const an = (w: string) => `${/^[aeiou]/i.test(w) && !/^(uni|use|eu)/i.test(w) ? "An" : "A"} ${w}`;

const sameLabel = (a: Industry, b: Industry) => !!a.label && !!b.label && a.label.toLowerCase() === b.label.toLowerCase();

export interface WhyYou {
  type: PartnerType;
  sentence: string;
}

export interface MatchInput {
  you: { name: string; industries: Industry[]; country: string | null };
  door: { name: string; industries: Industry[]; country: string | null };
  /** The door is entering your market (a new national company, or expansion news). */
  entering: boolean;
  market: string | null;
  /** Higher weight first; ties keep PARTNER_TYPES order. */
  weights?: Partial<Record<PartnerType, number>>;
}

/** Every partnership type the structured data supports for this pair. */
export function partnerTypes(m: MatchInput): WhyYou[] {
  const out: WhyYou[] = [];
  const where = m.market ?? m.you.country ?? "your market";
  const has = (t: PartnerType) => out.some((o) => o.type === t);
  for (const u of m.you.industries) {
    for (const d of m.door.industries) {
      // the same product is a competitor, not a partner
      if (u.code === d.code && (sameLabel(u, d) || (!u.label && !d.label))) continue;
      const us = sectorOf(u.code);
      const dsec = sectorOf(d.code);
      if (!us || !dsec) continue;
      const uw = industryWords(u);
      const dw = industryWords(d);
      if (!has("customer") && SELLS_TO[us].includes(dsec) && !(us === dsec && INTEGRATES.some(([x, y]) => x === us && y === dsec))) {
        out.push({
          type: "customer",
          sentence: m.entering
            ? `Customer. ${an(dw)} company setting up in ${where} will buy ${uw}, and you sell it there.`
            : `Customer. ${an(dw)} company with fresh money is a buyer of ${uw}.`,
        });
      }
      if (!has("integration") && INTEGRATES.some(([x, y]) => x === us && y === dsec)) {
        out.push({ type: "integration", sentence: `Integration. They build ${dw}, you build ${uw}: the two plug into the same stack.` });
      }
      if (!has("distribution") && m.entering && us === dsec && m.you.country && m.door.country && m.door.country !== m.you.country) {
        out.push({ type: "distribution", sentence: `Distribution. They're new to ${where} and sell ${dw} to the buyers you already reach.` });
      }
    }
  }
  return out;
}

/** The one partnership to lead with, honouring the user's taps. */
export function bestWhyYou(m: MatchInput): WhyYou | null {
  const all = partnerTypes(m);
  if (!all.length) return null;
  const w = m.weights ?? {};
  return [...all].sort((a, b) => (w[b.type] ?? 0) - (w[a.type] ?? 0) || PARTNER_TYPES.indexOf(a.type) - PARTNER_TYPES.indexOf(b.type))[0];
}
