# Data notes for Cala

Problems and surprises hit while building Faro on the Cala API (Nov 2026). Written as feedback, not complaints: Faro works because the graph is good enough to work around these.

## Entity search

- **Fund names are ambiguous.** `GET /v1/entities?name=Inventure` returns a Belgian VC (`INVENTURE`, Company), a Swedish 1972 company, a US food company, UK retailers, and the Finnish fund (`Inventure`, Organization) fifth. There is no "is an investor" filter, so we disambiguate with a country hint plus "does it have `INVESTED_IN` relationships".
- **Search for a vehicle doesn't find the brand, and vice versa.** "Inventure Oy" doesn't surface "Inventure Fund Ky"; you have to search several spellings.

## Graph shape

- **Portfolios are split across three relationship types.** `INVESTED_IN` (company links), `PARTICIPATES_IN_CORPORATE_EVENT` → `PrivateCompanyFundingRound` (with `event_date`) and `PARTICIPATES_IN_FUNDING_ROUND` → `FundingRound` (with `announcement_date`). Inventure has 23 `INVESTED_IN` links but 30 corporate events, many pointing to companies not in the 23. A full portfolio needs all three plus a hop through each round to find the `ISSUER`.
- **Two parallel round models.** `PrivateCompanyFundingRound` (`event_date`, `round_type`) and `FundingRound` (`announcement_date`, `round_label`, `name` like "Seed") look like two pipelines describing the same kind of thing.
- **Generic round names.** Round entities are named `FINANCING_RAISED_OR_FACILITY_ENTERED` or `Seed`; the company is only in the description text or via the `ISSUER` hop.
