/**
 * Why you: the partnership a door will need from you. Decided only from structured fields:
 * industry (OPERATES_IN_INDUSTRY code + the source's label) and headquarters country,
 * plus whether the door is entering your market. No keyword guesses on descriptions.
 */
import type { Industry } from "./profile";

export type PartnerType = "customer" | "integration" | "distribution";
export const PARTNER_TYPES: PartnerType[] = ["customer", "distribution", "integration"];

/** Industry codes that make software, hardware or connectivity (products other products plug into). */
const TECH = new Set([
  "SOFTWARE_AND_SERVICES",
  "TECHNOLOGY_HARDWARE_AND_EQUIPMENT",
  "SEMICONDUCTORS_AND_SEMICONDUCTOR_EQUIPMENT",
  "TELECOMMUNICATION_SERVICES",
]);

/**
 * Who buys from whom, by industry code. Read: a company in KEY sells to companies in VALUES.
 * Tech sells to everyone; the rest is a short, explicit supply map.
 */
const SELLS_TO: Record<string, string[] | "ALL_NON_TECH" | "ALL"> = {
  SOFTWARE_AND_SERVICES: "ALL",
  TECHNOLOGY_HARDWARE_AND_EQUIPMENT: "ALL",
  SEMICONDUCTORS_AND_SEMICONDUCTOR_EQUIPMENT: ["TECHNOLOGY_HARDWARE_AND_EQUIPMENT", "AUTOMOBILES_AND_COMPONENTS", "CAPITAL_GOODS", "TELECOMMUNICATION_SERVICES"],
  TELECOMMUNICATION_SERVICES: "ALL",
  COMMERCIAL_AND_PROFESSIONAL_SERVICES: "ALL",
  FINANCIAL_SERVICES: "ALL",
  BANKS: "ALL",
  INSURANCE: "ALL",
  MEDIA_AND_ENTERTAINMENT: ["CONSUMER_DISCRETIONARY_DISTRIBUTION_AND_RETAIL", "CONSUMER_SERVICES", "CONSUMER_DURABLES_AND_APPAREL", "FOOD_BEVERAGE_AND_TOBACCO", "HOUSEHOLD_AND_PERSONAL_PRODUCTS"],
  ENERGY: ["CAPITAL_GOODS", "MATERIALS", "TRANSPORTATION", "UTILITIES", "REAL_ESTATE_MANAGEMENT_AND_DEVELOPMENT", "SOFTWARE_AND_SERVICES"],
  UTILITIES: ["CAPITAL_GOODS", "MATERIALS", "REAL_ESTATE_MANAGEMENT_AND_DEVELOPMENT", "SOFTWARE_AND_SERVICES"],
  MATERIALS: ["CAPITAL_GOODS", "AUTOMOBILES_AND_COMPONENTS", "CONSUMER_DURABLES_AND_APPAREL", "FOOD_BEVERAGE_AND_TOBACCO", "HOUSEHOLD_AND_PERSONAL_PRODUCTS"],
  CAPITAL_GOODS: ["ENERGY", "UTILITIES", "TRANSPORTATION", "MATERIALS", "AUTOMOBILES_AND_COMPONENTS", "REAL_ESTATE_MANAGEMENT_AND_DEVELOPMENT"],
  TRANSPORTATION: ["CONSUMER_DISCRETIONARY_DISTRIBUTION_AND_RETAIL", "CONSUMER_STAPLES_DISTRIBUTION_AND_RETAIL", "FOOD_BEVERAGE_AND_TOBACCO", "CAPITAL_GOODS", "MATERIALS"],
  FOOD_BEVERAGE_AND_TOBACCO: ["CONSUMER_STAPLES_DISTRIBUTION_AND_RETAIL", "CONSUMER_SERVICES"],
  HEALTH_CARE_EQUIPMENT_AND_SERVICES: ["HEALTH_CARE_EQUIPMENT_AND_SERVICES", "PHARMACEUTICALS_BIOTECHNOLOGY_AND_LIFE_SCIENCES", "INSURANCE"],
  PHARMACEUTICALS_BIOTECHNOLOGY_AND_LIFE_SCIENCES: ["HEALTH_CARE_EQUIPMENT_AND_SERVICES"],
};

const WORDS: Record<string, string> = {
  SOFTWARE_AND_SERVICES: "software",
  TECHNOLOGY_HARDWARE_AND_EQUIPMENT: "hardware",
  SEMICONDUCTORS_AND_SEMICONDUCTOR_EQUIPMENT: "semiconductors",
  TELECOMMUNICATION_SERVICES: "connectivity",
  COMMERCIAL_AND_PROFESSIONAL_SERVICES: "professional services",
  FINANCIAL_SERVICES: "financial services",
  BANKS: "banking",
  INSURANCE: "insurance",
  MEDIA_AND_ENTERTAINMENT: "media",
  ENERGY: "energy",
  UTILITIES: "utilities",
  MATERIALS: "materials",
  CAPITAL_GOODS: "industrial equipment",
  TRANSPORTATION: "transport and logistics",
  AUTOMOBILES_AND_COMPONENTS: "automotive",
  CONSUMER_DURABLES_AND_APPAREL: "consumer goods",
  CONSUMER_SERVICES: "consumer services",
  CONSUMER_DISCRETIONARY_DISTRIBUTION_AND_RETAIL: "retail",
  CONSUMER_STAPLES_DISTRIBUTION_AND_RETAIL: "grocery and retail",
  FOOD_BEVERAGE_AND_TOBACCO: "food and drink",
  HOUSEHOLD_AND_PERSONAL_PRODUCTS: "household products",
  HEALTH_CARE_EQUIPMENT_AND_SERVICES: "health care",
  PHARMACEUTICALS_BIOTECHNOLOGY_AND_LIFE_SCIENCES: "life sciences",
  REAL_ESTATE_MANAGEMENT_AND_DEVELOPMENT: "real estate",
  EQUITY_REAL_ESTATE_INVESTMENT_TRUSTS: "real estate",
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
    return w;
  }
  return WORDS[ind.code] ?? ind.code.toLowerCase().replace(/_/g, " ");
}

function sellsTo(seller: string, buyer: string): boolean {
  const s = SELLS_TO[seller];
  if (!s) return false;
  if (s === "ALL") return seller !== buyer || !TECH.has(seller); // tech-to-tech is integration, not customer
  if (s === "ALL_NON_TECH") return !TECH.has(buyer);
  return s.includes(buyer);
}

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
  for (const u of m.you.industries) {
    for (const d of m.door.industries) {
      // the same product in the same market is a competitor, not a partner
      if (u.code === d.code && sameLabel(u, d)) continue;
      const uw = industryWords(u);
      const dw = industryWords(d);
      if (!out.some((o) => o.type === "customer") && sellsTo(u.code, d.code)) {
        out.push({
          type: "customer",
          sentence: m.entering
            ? `Customer. A ${dw} company setting up in ${where} needs ${uw}; you sell it there.`
            : `Customer. A ${dw} company with fresh money is a buyer of ${uw}.`,
        });
      }
      if (!out.some((o) => o.type === "integration") && TECH.has(u.code) && TECH.has(d.code) && !sameLabel(u, d)) {
        out.push({
          type: "integration",
          sentence: `Integration. They build ${dw}, you build ${uw}: the two sit in the same stack.`,
        });
      }
      if (
        !out.some((o) => o.type === "distribution") &&
        m.entering &&
        u.code === d.code &&
        m.you.country &&
        m.door.country !== m.you.country
      ) {
        out.push({
          type: "distribution",
          sentence: `Distribution. They're new to ${where} and sell ${dw} to buyers you already reach.`,
        });
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
