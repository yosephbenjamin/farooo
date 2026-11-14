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
  AEROSPACE_AND_DEFENSE: "defence",
};

/** Cala's short source labels that don't read as words. */
const LABELS: Record<string, string> = {
  robo: "robotics",
  medtechPharma: "medtech",
  marketingAds: "marketing",
  propConstruction: "construction tech",
  manufacturingMaterials: "manufacturing materials",
  musicEntertainment: "music",
  clothingFashion: "fashion",
  onlineMarkets: "online marketplaces",
  informationNetworks: "networks",
  comms: "communications",
  edu: "education",
  dualUseTech: "dual-use tech",
  somethingElse: "",
};

/** "enterpriseSoftware" -> "enterprise software", "ai" -> "AI", "SOFTWARE_AND_SERVICES" -> "software". */
export function industryWords(ind: Industry): string {
  const mapped = ind.label ? LABELS[ind.label.trim()] : undefined;
  if (mapped === "") return industryWords({ code: ind.code, label: null });
  if (mapped) return mapped;
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
  /** For doors that aren't entering: why now, so the customer line reads right. */
  reason?: "round" | "hire" | "acquisition";
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
            : `Customer. ${an(dw)} company ${m.reason === "hire" ? "that's growing its team" : m.reason === "acquisition" ? "that just made an acquisition" : "with fresh money"} is a buyer of ${uw}.`,
        });
      }
      if (!has("integration") && INTEGRATES.some(([x, y]) => x === us && y === dsec)) {
        out.push({ type: "integration", sentence: dw === uw ? `Integration. You both build ${uw}: the products plug into the same stack.` : `Integration. They build ${dw}, you build ${uw}: the two plug into the same stack.` });
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

// ---------- industry codes that contradict the description ----------
/**
 * What a company does, read from its Cala description (or, when that is boilerplate generated
 * from the code itself, the sourced Cala claim the door came from). Only names of businesses,
 * never activities like "investment" or "partnership", so a sentence about money or a deal
 * doesn't read as a sector. Used only to check the industry code, never to invent a door.
 */
const DESCRIBES: [RegExp, Industry][] = [
  [/\bdata[- ]?cent(?:er|re)s?\b|\bcolocation\b|\bhyperscale\b|\bgpu cloud\b|\bcloud (?:infrastructure|provider|computing)\b/i, { code: "INTERNET_AND_WEB_SERVICES", label: "dataCentres" }],
  [/\b(?:neo)?bank(?:s|ing)?\b|\bpayments?\b|\blending\b|\binsurers?\b|\binsurance\b|\bfintech\b/i, { code: "FINTECH", label: null }],
  [/\bdrones?\b|\bunmanned\b|\bdefen[cs]e\b|\bmilitary\b|\bsatellites?\b/i, { code: "AEROSPACE_AND_DEFENSE", label: null }],
  [/\bsoftware\b|\bsaas\b/i, { code: "SOFTWARE_AND_SERVICES", label: null }],
  [/\bsemiconductors?\b|\bchips?\b|\bprocessors?\b|\bhardware\b/i, { code: "HARDWARE_AND_EQUIPMENT", label: null }],
  [/\bmedical\b|\bhealth ?care\b|\bclinics?\b|\bhospitals?\b|\bpatients?\b/i, { code: "HEALTHCARE_PROVIDERS", label: null }],
  [/\bsolar\b|\bwind (?:farm|power|turbine)s?\b|\bbatter(?:y|ies)\b|\brenewable\b/i, { code: "RENEWABLE_ENERGY", label: null }],
  [/\blogistics\b|\bfreight\b|\bshipping\b/i, { code: "TRANSPORTATION_AND_LOGISTICS", label: null }],
];

/** "Swedish fintech company founded in 2018, headquartered in Kista." Generated from the code; no evidence of its own. */
export function isBoilerplate(desc: string | null | undefined): boolean {
  if (!desc) return true;
  const d = desc.trim();
  return d.length < 160 && /^(?:an? )?[A-Z][\w-]*(?: [\w&/-]+){0,5}? (?:company|firm|business|organi[sz]ation)\b[,]? (?:founded|headquartered|based|registered|established|incorporated)\b/i.test(d) && !/\b(?:builds?|develops?|provides?|offers?|operates?|makes?|sells?)\b/i.test(d);
}

export interface IndustryCheck {
  /** The industries to match on: the codes, or what the description says when they contradict it. */
  industries: Industry[];
  /** Set when the codes contradicted the description and the description won. */
  uncertain: null | { coded: string; read: string };
  /** The codes contradict a description that is itself unclear: no real reason, drop. */
  drop: boolean;
}

/**
 * Check a door's industry codes against what Cala says it does.
 *  - description silent, or consistent with a code: keep the codes;
 *  - description points to one sector the codes don't: use the description, mark uncertain;
 *  - description points to several sectors, none the codes': unclear, drop.
 */
export function checkIndustries(industries: Industry[], description: string | null, claim?: string | null): IndustryCheck {
  const text = [isBoilerplate(description) ? "" : description ?? "", claim ?? ""].join(" ").trim();
  const read = DESCRIBES.filter(([re]) => re.test(text)).map(([, ind]) => ind);
  const keep: IndustryCheck = { industries, uncertain: null, drop: false };
  if (!read.length || !industries.length) return keep; // no codes stays "no real reason": the description never invents a door
  const coded = new Set(industries.map((i) => sectorOf(i.code)));
  if (read.some((i) => coded.has(sectorOf(i.code)))) return keep;
  const sectors = new Set(read.map((i) => sectorOf(i.code)));
  if (sectors.size > 1) return { industries, uncertain: null, drop: true };
  return {
    industries: read,
    uncertain: { coded: industries.map(industryWords).join(" and "), read: read.map(industryWords).join(" and ") },
    drop: false,
  };
}
