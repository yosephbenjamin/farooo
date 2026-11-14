/**
 * Keyword/sector heuristic for the "why you" line, used when no LLM key is set.
 * Sectors are detected from name + description + Cala industry tags. Complement pairs say
 * why two different sectors would partner; same-sector pairs share customers or a stack.
 */

export type Sector =
  | "payments" | "fintech" | "insurance" | "commerce" | "food" | "logistics" | "mobility" | "energy" | "climate"
  | "health" | "biotech" | "gaming" | "ai" | "data" | "security" | "hr" | "legal" | "devtools" | "saas"
  | "construction" | "realestate" | "manufacturing" | "hardware" | "space" | "education" | "travel" | "media"
  | "agriculture" | "marketing" | "telecom" | "consumer" | "defence";

const LEX: [Sector, RegExp][] = [
  ["payments", /\b(payments?|checkout|card issuing|acquiring|invoic|billing|bnpl|buy now|wallet)\b/],
  ["fintech", /\b(fintech|banking|neobank|lending|loans?|credit|wealth|investing app|trading|accounting|bookkeeping|financial (services|software)|finance teams?|treasury|crypto|banks)\b/],
  ["insurance", /\b(insur|insurtech|claims)\w*/],
  ["commerce", /\b(e-?commerce|marketplace|retail|shopping|merchants?|online store|d2c|direct-to-consumer|resale|second-?hand)\b/],
  ["food", /\b(food|restaurant|grocer|meal|delivery platform|beverage|dairy|plant-based|alt(ernative)? protein|coffee|kitchen)\w*/],
  ["logistics", /\b(logistic|delivery|shipping|freight|fleet|courier|last-mile|supply chain|warehous|parcel)\w*/],
  ["mobility", /\b(mobility|scooter|e-?bike|ride|vehicle|automotive|\bev\b|electric vehicle|car sharing|charging|transport)\w*/],
  ["energy", /\b(energy|batter(y|ies)|solar|wind (power|farms?|turbines?)|grid|hydrogen|electricity|nuclear|heat pumps?|power (conversion|electronics|grid|plants?|losses)|energy storage)\b/],
  ["climate", /\b(climate|carbon|emission|sustainab|circular|recycl|waste|biochar|net zero|cleantech|decarboni)\w*/],
  ["health", /\b(health|medical|clinic|patient|care|hospital|diagnos|therapy|mental|medtech|wellness|telemedicine|dental|pharmacy)\w*/],
  ["biotech", /\b(biotech|drug|genetic|genom|molecul|antibod|pharma|life science|cell|protein|enzyme|microb)\w*/],
  ["gaming", /\b(gam(e|es|ing)|esports|studio|player|mobile games?|metaverse)\b/],
  ["ai", /\b(ai|artificial intelligence|machine learning|ml|llm|computer vision|generative|agents?|nlp)\b/],
  ["data", /\b(data|analytics|insights?|business intelligence|database|knowledge management|market research)\b/],
  ["security", /\b(security|cyber|identity|fraud|authentication|privacy|compliance|kyc|aml)\b/],
  ["hr", /\b(hr|recruit|hiring|talent|payroll|workforce|employee|staffing|people ops)\w*/],
  ["legal", /\b(legal|law firms?|lawyers?|contract|regtech)\w*/],
  ["devtools", /\b(developer|devops|api|open source|cloud infrastructure|observability|testing|code|software development|low-code|no-code)\b/],
  ["saas", /\b(saas|software|platform|b2b|enterprise|workflow|productivity|crm|erp)\b/],
  ["construction", /\b(construction|building|architect|contractor|property development|bim)\w*/],
  ["realestate", /\b(real estate|proptech|property|housing|rental|landlord|tenant)\w*/],
  ["manufacturing", /\b(manufactur|industrial|factory|robot|automation|3d print|machinery|materials?)\w*/],
  ["hardware", /\b(hardware|semiconductor|chip|sensor|device|iot|electronics|photonic|quantum|radar|lidar|transistor|wearable|smart ring)\w*/],
  ["space", /\b(space|satellite|orbit|aerospace|launch)\w*/],
  ["education", /\b(education|edtech|learning|school|course|tutor|university|students?)\w*/],
  ["travel", /\b(travel|hotel|hospitality|booking|tourism|flights?|airline)\w*/],
  ["media", /\b(media|content|video|music|audio|podcast|news|publishing|streaming|creator)\w*/],
  ["agriculture", /\b(agri|farm|crop|forestry|forest|aquaculture|fish|vertical farming|soil)\w*/],
  ["marketing", /\b(marketing|advertis|adtech|brand|seo|customer engagement|loyalty|sales)\w*/],
  ["telecom", /\b(telecom|5g|network|connectivity|mobile operator|wireless)\w*/],
  ["consumer", /\b(consumer|app|lifestyle|fashion|beauty|dating|social|fitness|parent)\w*/],
  ["defence", /\b(defen[cs]e|military|dual-use|drone|uav|battlefield|autonomous systems)\w*/],
];

const INDUSTRY_MAP: Record<string, Sector[]> = {
  SOFTWARE_AND_SERVICES: ["saas"],
  BANKS: ["fintech"],
  DIVERSIFIED_FINANCIALS: ["fintech"],
  FINANCIAL_SERVICES: ["fintech"],
  INSURANCE: ["insurance"],
  HEALTH_CARE_EQUIPMENT_AND_SERVICES: ["health"],
  PHARMACEUTICALS_BIOTECHNOLOGY_AND_LIFE_SCIENCES: ["biotech"],
  ENERGY: ["energy"],
  UTILITIES: ["energy"],
  RETAILING: ["commerce"],
  CONSUMER_DISCRETIONARY_DISTRIBUTION_AND_RETAIL: ["commerce"],
  FOOD_BEVERAGE_AND_TOBACCO: ["food"],
  CONSUMER_STAPLES_DISTRIBUTION_AND_RETAIL: ["food", "commerce"],
  TRANSPORTATION: ["logistics", "mobility"],
  AUTOMOBILES_AND_COMPONENTS: ["mobility"],
  CAPITAL_GOODS: ["manufacturing"],
  MATERIALS: ["manufacturing"],
  SEMICONDUCTORS_AND_SEMICONDUCTOR_EQUIPMENT: ["hardware"],
  TECHNOLOGY_HARDWARE_AND_EQUIPMENT: ["hardware"],
  MEDIA_AND_ENTERTAINMENT: ["media"],
  TELECOMMUNICATION_SERVICES: ["telecom"],
  CONSUMER_SERVICES: ["consumer"],
  REAL_ESTATE_MANAGEMENT_AND_DEVELOPMENT: ["realestate"],
  EQUITY_REAL_ESTATE_INVESTMENT_TRUSTS: ["realestate"],
  COMMERCIAL_AND_PROFESSIONAL_SERVICES: ["saas"],
  HOUSEHOLD_AND_PERSONAL_PRODUCTS: ["consumer"],
  CONSUMER_DURABLES_AND_APPAREL: ["consumer"],
};

/** Generic sectors are weak evidence: everyone is "saas" or "data". */
const GENERIC = new Set<Sector>(["saas", "data", "consumer", "ai", "marketing"]);

export function sectorsOf(text: string, industries: string[] = []): Sector[] {
  const t = ` ${text.toLowerCase()} `;
  const out = new Set<Sector>();
  for (const [s, re] of LEX) if (re.test(t)) out.add(s);
  for (const i of industries) for (const s of INDUSTRY_MAP[i] ?? []) out.add(s);
  return [...out];
}

/** Human words for each sector, used in sentences. */
export const SECTOR_WORDS: Record<Sector, string> = {
  payments: "payments", fintech: "finance", insurance: "insurance", commerce: "commerce", food: "food",
  logistics: "logistics", mobility: "mobility", energy: "energy", climate: "climate", health: "health",
  biotech: "life science", gaming: "games", ai: "AI", data: "data", security: "security", hr: "people and hiring",
  legal: "legal", devtools: "developer tools", saas: "B2B software", construction: "construction",
  realestate: "property", manufacturing: "industry", hardware: "hardware", space: "space", education: "education",
  travel: "travel", media: "media", agriculture: "food systems", marketing: "marketing", telecom: "connectivity",
  consumer: "consumer", defence: "defence",
};

/**
 * Complement pairs: [a, b, sentence]. {door} and {you} are filled in.
 * Read as "a startup in sector a would partner with a door in sector b because ...".
 */
const COMPLEMENTS: [Sector, Sector, string][] = [
  ["payments", "commerce", "{door} moves money for merchants every day; your payments could sit in that flow."],
  ["commerce", "payments", "{door} handles payments; your merchants need exactly that."],
  ["fintech", "commerce", "{door} serves merchants who need financing and finance tools."],
  ["commerce", "fintech", "{door} can finance the merchants you already serve."],
  ["fintech", "saas", "{door} sells software to businesses whose finance teams you serve."],
  ["saas", "fintech", "{door} works with finance teams; your software could plug into their stack."],
  ["logistics", "commerce", "{door} ships goods; you move them."],
  ["commerce", "logistics", "{door} moves parcels; your orders need moving."],
  ["logistics", "food", "{door} delivers food at scale and needs every edge in logistics."],
  ["food", "logistics", "{door} could carry what you make to the door."],
  ["energy", "mobility", "{door} runs on electricity; you make or manage it."],
  ["mobility", "energy", "{door} supplies the power your vehicles need."],
  ["energy", "manufacturing", "{door} serves industry, and industry is hungry for cleaner power."],
  ["manufacturing", "energy", "{door} sells energy to industry like yours."],
  ["climate", "manufacturing", "{door} has emissions to cut; that's your work."],
  ["climate", "energy", "{door} and you push the same transition from two ends."],
  ["climate", "food", "{door} has a footprint your climate work can shrink."],
  ["climate", "construction", "{door} builds; you can make it lower-carbon."],
  ["ai", "health", "{door} sits on clinical workflows that AI can lighten."],
  ["health", "ai", "{door} builds AI that could sharpen your care."],
  ["health", "insurance", "{door} pays for care; you deliver it."],
  ["insurance", "health", "{door} delivers care your policies cover."],
  ["insurance", "mobility", "{door} puts vehicles on the road that need cover."],
  ["insurance", "realestate", "{door} manages property that needs insuring."],
  ["security", "fintech", "{door} handles money and must prove who's who."],
  ["fintech", "security", "{door} secures the identity checks your product depends on."],
  ["security", "saas", "{door} ships software with a security review to pass."],
  ["devtools", "saas", "{door} is a software team that could run on your tools."],
  ["devtools", "payments", "{door} handles billing; the apps your users build will need it."],
  ["payments", "devtools", "{door} is where new apps get built; each one needs payments."],
  ["climate", "hardware", "{door} builds hardware whose footprint you can measure and cut."],
  ["hardware", "energy", "{door} works on power; your devices draw it."],
  ["energy", "hardware", "{door} builds hardware that lives on efficient power."],
  ["health", "hardware", "{door} builds the kind of hardware that ends up in health devices."],
  ["saas", "devtools", "{door} builds the tools your engineers use."],
  ["data", "commerce", "{door} sits on commerce data you could put to work."],
  ["ai", "legal", "{door} lives in documents; your AI reads them."],
  ["legal", "ai", "{door} builds AI that could speed up your legal work."],
  ["hr", "saas", "{door} is growing a team; you help companies hire and run one."],
  ["hr", "logistics", "{door} runs a large workforce; you help manage it."],
  ["hr", "food", "{door} staffs shifts at scale; you make that easier."],
  ["marketing", "commerce", "{door} sells online and needs customers; you bring them."],
  ["commerce", "marketing", "{door} helps sellers like you find customers."],
  ["gaming", "media", "{door} reaches the players your games want."],
  ["media", "gaming", "{door} makes games your audience plays."],
  ["travel", "payments", "{door} handles the payments travellers make."],
  ["payments", "travel", "{door} takes bookings that need paying for."],
  ["education", "hr", "{door} hires people your courses could train."],
  ["hr", "education", "{door} trains the people your customers want to hire."],
  ["agriculture", "food", "{door} buys what farms grow."],
  ["food", "agriculture", "{door} grows what you cook or sell."],
  ["hardware", "manufacturing", "{door} works in industry, where hardware like yours earns its keep."],
  ["manufacturing", "hardware", "{door} makes components your production lines need."],
  ["space", "defence", "{door} needs eyes and links in orbit."],
  ["defence", "space", "{door} puts sensors in orbit you could use."],
  ["construction", "realestate", "{door} owns buildings that need building and fixing."],
  ["realestate", "construction", "{door} builds what your properties need."],
  ["realestate", "energy", "{door} can cut energy in buildings you manage."],
  ["energy", "realestate", "{door} manages buildings that burn energy."],
  ["telecom", "hardware", "{door} makes devices that need connecting."],
  ["hardware", "telecom", "{door} connects devices like yours."],
  ["biotech", "ai", "{door} builds models that could speed up discovery."],
  ["ai", "biotech", "{door} runs labs full of data your models could learn from."],
];

export interface Fit {
  score: number;
  sentence: string;
  kind: "complement" | "same" | "adjacent" | "none";
}

export function fitBetween(
  you: { name: string; sectors: Sector[]; country?: string | null },
  door: { name: string; sectors: Sector[]; country?: string | null; blurb?: string | null },
): Fit {
  for (const [a, b, s] of COMPLEMENTS) {
    // a door's generic tags (AI, SaaS, data...) are weak evidence: never enough for a complement
    if (you.sectors.includes(a) && door.sectors.includes(b) && !GENERIC.has(b)) {
      return { score: 3, sentence: s.replace("{door}", door.name).replace("{you}", you.name), kind: "complement" };
    }
  }
  const shared = you.sectors.filter((s) => door.sectors.includes(s) && !GENERIC.has(s));
  if (shared.length) {
    const w = SECTOR_WORDS[shared[0]];
    return {
      score: 2 + (you.country && door.country === you.country ? 0.5 : 0),
      sentence: `${door.name} also builds in ${w}: shared customers, shared lessons.`,
      kind: "same",
    };
  }
  const sharedGeneric = you.sectors.filter((s) => door.sectors.includes(s));
  if (sharedGeneric.length && door.blurb) {
    return { score: 1, sentence: `${door.name}: ${door.blurb}`, kind: "adjacent" };
  }
  return { score: 0, sentence: door.blurb ? `${door.name}: ${door.blurb}` : `${door.name}, same investor.`, kind: "none" };
}

/** Is a description Cala's boilerplate ("Swedish company founded in 2017 and headquartered in Stockholm.")? */
export function isBoilerplate(d: string | null | undefined): boolean {
  if (!d) return true;
  return /^(an? )?([A-Z][\w-]+ ){0,3}(company|firm|business|startup|corporation|entity)( (founded|incorporated|registered|based|headquartered|established)\b.*)?\.?$/i.test(
    d.trim(),
  );
}
