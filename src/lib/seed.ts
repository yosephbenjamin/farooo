import { normalizeFund, slug } from "./normalize";

/**
 * Seed list of Nordic and Nordic-active funds.
 * `aliases` are matched against normalizeFund(candidate name). `countries` filter out
 * same-named entities elsewhere (e.g. the Belgian "INVENTURE"). `exclude` lists Cala ids
 * we checked by hand and rejected (see data/funds.json for the resolution report).
 */
export interface SeedFund {
  name: string;
  /** Extra search strings beyond the name. */
  searches?: string[];
  aliases: string[];
  countries: string[];
  exclude?: string[];
  /** normalizeFund() names rejected by hand (same-named, unrelated entities). */
  excludeNames?: string[];
}

export const SEED_FUNDS: SeedFund[] = [
  { name: "Inventure", searches: ["Inventure Fund"], aliases: ["inventure"], countries: ["Finland"], excludeNames: ["inventure partners"], exclude: ["3794cb88-1519-4ed6-b8dd-cbd641d85c62", "f5b15ae0-7851-45d0-89ee-97a85ef9a6cf"] },
  { name: "Lifeline Ventures", searches: ["Lifeline Ventures Fund"], aliases: ["lifeline ventures"], countries: ["Finland", "Sweden"] },
  { name: "Maki.vc", searches: ["Maki.vc", "Maki VC", "Maki Fund"], aliases: ["maki vc", "maki"], countries: ["Finland"] },
  { name: "Icebreaker.vc", searches: ["Icebreaker.vc", "Icebreaker VC", "Icebreaker Fund"], aliases: ["icebreaker vc", "icebreaker"], countries: ["Finland", "Sweden"], excludeNames: ["icebreaker ventures"] },
  { name: "Voima Ventures", searches: ["Voima Ventures Fund"], aliases: ["voima ventures"], countries: ["Finland"] },
  { name: "Superhero Capital", searches: ["Superhero Capital Fund"], aliases: ["superhero capital"], countries: ["Finland"] },
  { name: "byFounders", searches: ["byFounders", "By Founders"], aliases: ["byfounders", "by founders"], countries: ["Denmark"] },
  { name: "Creandum", searches: ["Creandum Fund"], aliases: ["creandum"], countries: ["Sweden"] },
  { name: "Northzone", searches: ["Northzone Ventures"], aliases: ["northzone", "northzone ventures"], countries: ["Sweden", "Norway", "United Kingdom", "British", "Swedish", "Norwegian"] },
  { name: "EQT Ventures", searches: ["EQT Ventures Fund"], aliases: ["eqt ventures"], countries: ["Sweden"] },
  { name: "Atomico", searches: ["Atomico Ventures"], aliases: ["atomico"], countries: ["United Kingdom"] },
  { name: "Balderton Capital", searches: ["Balderton"], aliases: ["balderton capital", "balderton"], countries: ["United Kingdom"] },
  { name: "Kinnevik", searches: ["Kinnevik AB"], aliases: ["kinnevik"], countries: ["Sweden"] },
  { name: "J12 Ventures", searches: ["J12"], aliases: ["j12 ventures", "j12"], countries: ["Sweden"] },
  { name: "Luminar Ventures", searches: ["Luminar Ventures Fund"], aliases: ["luminar ventures"], countries: ["Sweden"] },
  { name: "Nordic Makers", aliases: ["nordic makers"], countries: ["Denmark"] },
  { name: "Antler", searches: ["Antler Innovation"], aliases: ["antler"], countries: ["Singapore", "Norway", "Sweden", "Finland", "Denmark", "United Kingdom"] },
  { name: "Alliance Venture", searches: ["Alliance VC", "Alliance Venture Spring"], aliases: ["alliance venture", "alliance vc"], countries: ["Norway"] },
  { name: "Sisu Game Ventures", aliases: ["sisu game ventures"], countries: ["Finland"] },
  { name: "Seedcamp", searches: ["Seedcamp Fund"], aliases: ["seedcamp"], countries: ["United Kingdom"] },
  { name: "Vendep Capital", aliases: ["vendep capital", "vendep"], countries: ["Finland"] },
  { name: "Butterfly Ventures", aliases: ["butterfly ventures"], countries: ["Finland"] },
  { name: "Tesi", searches: ["Finnish Industry Investment", "Tesi Fund"], aliases: ["tesi", "finnish industry investment", "suomen teollisuussijoitus"], countries: ["Finland"] },
  { name: "Industrifonden", aliases: ["industrifonden"], countries: ["Sweden"] },
  { name: "NordicNinja", searches: ["NordicNinja VC", "Nordic Ninja"], aliases: ["nordicninja", "nordic ninja", "nordicninja vc"], countries: ["Finland", "Japan", "Denmark"] },
  { name: "Wave Ventures", aliases: ["wave ventures"], countries: ["Finland"] },
  { name: "Moonfire Ventures", searches: ["Moonfire"], aliases: ["moonfire ventures", "moonfire"], countries: ["United Kingdom", "Finland"] },
  { name: "Heartcore Capital", searches: ["Heartcore"], aliases: ["heartcore capital", "heartcore"], countries: ["Denmark"], excludeNames: ["heartcore"] },
  { name: "Contrarian Ventures", aliases: ["contrarian ventures"], countries: ["Lithuania"] },
  { name: "Spintop Ventures", aliases: ["spintop ventures", "spintop"], countries: ["Sweden"] },
];

/** Domiciles commonly used for fund vehicles; allowed for any fund. */
export const VEHICLE_DOMICILES = ["Luxembourg", "Cayman", "Delaware", "Jersey", "Guernsey", "Netherlands", "Dutch", "Luxembourg-based"];

/** Country -> words that appear in Cala's generated descriptions. */
export const COUNTRY_WORDS: Record<string, string[]> = {
  Finland: ["Finland", "Finnish", "Helsinki", "Espoo"],
  Sweden: ["Sweden", "Swedish", "Stockholm", "Gothenburg"],
  Norway: ["Norway", "Norwegian", "Oslo"],
  Denmark: ["Denmark", "Danish", "Copenhagen"],
  "United Kingdom": ["United Kingdom", "British", "London", "England", "UK"],
  Singapore: ["Singapore"],
  Japan: ["Japan", "Japanese", "Tokyo"],
  Lithuania: ["Lithuania", "Lithuanian", "Vilnius"],
  Belgium: ["Belgium", "Belgian"],
  "United States": ["United States", "American", "U.S.", "US-based"],
  Germany: ["Germany", "German", "Berlin"],
  France: ["France", "French", "Paris"],
  Italy: ["Italy", "Italian"],
  Spain: ["Spain", "Spanish"],
  Israel: ["Israel", "Israeli"],
  India: ["India", "Indian"],
  Australia: ["Australia", "Australian"],
  Canada: ["Canada", "Canadian"],
  "New Zealand": ["New Zealand"],
  Switzerland: ["Switzerland", "Swiss"],
  Ireland: ["Ireland", "Irish"],
};

const BRAND_TAIL = new Set(["ventures", "venture", "capital", "partners", "vc", "management", "growth", "seed", "opportunities", "opportunity", "investments", "invest", "fund", "spring", "innovation", "collective"]);

/** Does a Cala entity name refer to this seed fund (brand, vehicle or management company)? */
export function aliasMatch(seed: SeedFund, name: string): boolean {
  const nf = normalizeFund(name);
  if (seed.excludeNames?.includes(nf)) return false;
  for (const a of seed.aliases) {
    if (nf === a) return true;
    if (nf.startsWith(a + " ")) {
      const rest = nf.slice(a.length + 1).split(" ");
      if (rest.every((t) => BRAND_TAIL.has(t))) return true;
    }
  }
  return false;
}

/** Seed fund slug for a name, if any. */
export function seedSlugForName(name: string): string | undefined {
  const s = SEED_FUNDS.find((f) => aliasMatch(f, name));
  return s ? slug(s.name) : undefined;
}
