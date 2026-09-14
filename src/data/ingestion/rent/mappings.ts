import type { MvpCityId } from "../../schemas/enums";

/** Exact published names; consumer applicability is not geographic equality. */
export const rentGeographies = [
  { cityId: "LOC-LON", consumerLabel: "London", code: "E12000007", name: "London", type: "region", region: "[z]" },
  { cityId: "LOC-BIR", consumerLabel: "Birmingham", code: "E08000025", name: "Birmingham", type: "local_authority", region: "West Midlands" },
  { cityId: "LOC-MAN", consumerLabel: "Manchester", code: "E08000003", name: "Manchester", type: "local_authority", region: "North West" },
  { cityId: "LOC-LEE", consumerLabel: "Leeds", code: "E08000035", name: "Leeds", type: "local_authority", region: "Yorkshire and The Humber" },
  { cityId: "LOC-LIV", consumerLabel: "Liverpool", code: "E08000012", name: "Liverpool", type: "local_authority", region: "North West" },
  { cityId: "LOC-BRS", consumerLabel: "Bristol", code: "E06000023", name: "Bristol, City of", type: "local_authority", region: "South West" },
  { cityId: "LOC-GLA", consumerLabel: "Glasgow", code: "S33000009", name: "Greater Glasgow", type: "broad_rental_market_area", region: "Scotland" },
] as const satisfies readonly { cityId: MvpCityId; consumerLabel: string; code: string; name: string; type: string; region: string }[];
export const rentMeasures = [
  { source: "Rental price", column: "H", bedroomBand: undefined },
  { source: "Rental price one bed", column: "L", bedroomBand: "one bed" },
  { source: "Rental price two bed", column: "P", bedroomBand: "two bed" },
  { source: "Rental price three bed", column: "T", bedroomBand: "three bed" },
  { source: "Rental price four or more bed", column: "X", bedroomBand: "four or more bed" },
] as const;
export const rentSourcePeriod = "2026-07";
