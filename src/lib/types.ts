export interface Source {
  name: string;
  url: string;
  /** Date Cala attaches to the source (often a crawl date, not a publication date). */
  date: string | null;
}

export interface RawRound {
  id: string;
  kind: "PCFR" | "FR";
  date: string | null;
  roundType: string | null;
  amount: number | null;
  currency: string | null;
  description: string | null;
  issuers: { id: string; name: string; entity_type: string; isLead?: boolean }[];
  investors: { id: string; name: string; entity_type: string; isLead?: boolean }[];
  roles: string[];
  sources: Source[];
}

export interface RawCompany {
  id: string;
  name: string;
  entity_type: string;
  aliases: string[];
  description: string | null;
  foundingDate: string | null;
  country: string | null;
  industries: string[];
  investors: { id: string; name: string; entity_type: string; sources: Source[] }[];
  rounds: { id: string; kind: "PCFR" | "FR"; role: string; date: string | null }[];
}

/** One investor after merging fund vehicles. */
export interface Investor {
  id: string; // slug
  name: string;
  vehicles: { id: string; name: string; entity_type: string; description: string | null }[];
}

export type LinkVia = "fund→company" | "company→fund" | "round";

export interface InvestorLink {
  investorId: string;
  via: LinkVia[];
  sources: Source[];
}

/** One company after merging duplicates. */
export interface Company {
  id: string; // canonical Cala id
  ids: string[];
  name: string;
  aliases: string[];
  description: string | null;
  industries: string[];
  country: string | null;
  foundingDate: string | null;
  investors: InvestorLink[];
  /** Investors outside the seed list (name + Cala id), kept for context. */
  otherInvestors: { id: string; name: string }[];
  roundIds: string[];
}

export interface Round {
  id: string;
  kind: "PCFR" | "FR";
  companyId: string | null;
  date: string | null;
  roundType: string | null;
  amount: number | null;
  currency: string | null;
  investorIds: string[]; // seed investor slugs
  investorNames: string[]; // all participants by name
  sources: Source[];
}

export interface Dataset {
  generatedAt: string;
  investors: Investor[];
  companies: Record<string, Company>;
  rounds: Record<string, Round>;
  /** investor slug -> company ids */
  keyrings: Record<string, string[]>;
  /** Cala id (any vehicle or company id) -> canonical id / investor slug */
  idIndex: Record<string, { kind: "investor" | "company"; id: string }>;
}
