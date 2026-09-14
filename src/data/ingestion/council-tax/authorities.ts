import type { MvpCityId } from "../../schemas/enums";

export const councilTaxAuthorities: readonly {
  name: string; code?: string; nation: "England" | "Scotland"; cityId: MvpCityId; sourceId: string;
}[] = [
  { name: "Birmingham", code: "E08000025", nation: "England", cityId: "LOC-BIR", sourceId: "SRC-002" },
  { name: "Manchester", code: "E08000003", nation: "England", cityId: "LOC-MAN", sourceId: "SRC-002" },
  { name: "Leeds", code: "E08000035", nation: "England", cityId: "LOC-LEE", sourceId: "SRC-002" },
  { name: "Liverpool", code: "E08000012", nation: "England", cityId: "LOC-LIV", sourceId: "SRC-002" },
  { name: "Bristol", code: "E06000023", nation: "England", cityId: "LOC-BRS", sourceId: "SRC-002" },
  // Source is name-keyed; no unverified Scottish authority codes are invented.
  { name: "City of Edinburgh", nation: "Scotland", cityId: "LOC-EDI", sourceId: "SRC-020" },
  { name: "Glasgow City", nation: "Scotland", cityId: "LOC-GLA", sourceId: "SRC-020" },
];
