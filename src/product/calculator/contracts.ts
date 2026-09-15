import type { ComparisonDirection, Diagnostic, HouseholdCostCategory, Money, ScenarioInput, SalarySearchMetadata } from "@/engine";

export type ScenarioRole = "current" | "destination";
export type Classification = "OBSERVED_DATA" | "CALCULATED" | "USER_ENTERED" | "MODELLED_ESTIMATE";
export type ActionType = "ENTER_AMOUNT" | "SELECT_AUTHORITY" | "SELECT_BAND" | "SELECT_TRANSPORT_PRODUCT" | "SELECT_WATER_OPTION" | "REVIEW_INPUT";
export interface ProductIssue {
  code: string; message: string; role?: ScenarioRole; category?: string;
  severity: Diagnostic["severity"]; userActionPossible: boolean; action: ActionType;
  path?: readonly (string | number)[];
}
export interface SourceSummary {
  id: string; organisation: string; title: string; url?: string; period?: string;
  effectiveFrom?: string; effectiveTo?: string; geography?: string;
}
export interface Explanation {
  classification?: Classification; label?: string; summary: string;
  sources: readonly SourceSummary[]; limitations: readonly string[];
  baselineStatus?: "AVAILABLE" | "UNAVAILABLE";
}
export type ProductAmount = {
  state: "AVAILABLE" | "PARTIAL"; exact: Money; display: string; explanation: Explanation;
} | { state: "UNAVAILABLE" | "NOT_APPLICABLE"; display: string; explanation: Explanation; exact?: never };
export type ProductMetric = {
  state: "AVAILABLE"; label: string; exact: Money; display: string; direction: ComparisonDirection;
  current: ProductAmount; destination: ProductAmount; classification: "CALCULATED"; dependencies: readonly ProductIssue[];
} | {
  state: "PARTIAL" | "UNAVAILABLE"; label: string; reason: string; dependencies: readonly ProductIssue[];
  exact?: never; display?: never; direction?: never; current?: never; destination?: never;
};
export interface BreakdownRow {
  category: HouseholdCostCategory; label: string; current: ProductAmount; destination: ProductAmount; change: ProductMetric;
}
export interface ProductDriver {
  category: HouseholdCostCategory; label: string; rank: number; exact: Money; magnitude: Money;
  display: string; direction: ComparisonDirection; currentLabel: string; destinationLabel: string;
}
export interface ProductDrivers {
  completeness: "COMPLETE" | "PARTIAL" | "UNRESOLVED"; title: string;
  ranked: readonly ProductDriver[]; increases: readonly ProductDriver[]; savings: readonly ProductDriver[]; unchanged: readonly ProductDriver[];
  excluded: readonly { category: HouseholdCostCategory; label: string; reason: string }[];
}
export type ProductSalary = {
  state: "AVAILABLE"; label: string; grossAnnual: ProductAmount; requiredNetMonthly: ProductAmount;
  targetResidual: ProductAmount; destinationCosts: ProductAmount; achievedResidual: ProductAmount; overshoot: ProductAmount;
  proposedGross?: ProductAmount; jurisdiction: string; limitation: string; search: SalarySearchMetadata;
} | {
  state: "UNAVAILABLE"; engineStatus: "INELIGIBLE" | "NO_SOLUTION_WITHIN_BOUNDS";
  label: string; reason: string; dependencies: readonly ProductIssue[]; userActionPossible: boolean; operationalMaximum?: ProductAmount;
};
export interface LocationSummary {
  name: string; cityId: string; effectiveOn?: string;
  income: ProductAmount; costs: ProductAmount; residual: ProductAmount;
  coverage?: { required: number; resolved: number; unresolved: number; notApplicable: number };
}
export interface ProductCalculatorResult {
  version: "product-calculator-v1";
  completeness: "COMPLETE" | "PARTIAL" | "LIMITED";
  current: LocationSummary; destination: LocationSummary;
  headlines: { costs: ProductMetric; takeHome: ProductMetric; residual: ProductMetric };
  breakdown: readonly BreakdownRow[]; drivers: ProductDrivers; salary: ProductSalary;
  unresolved: readonly ProductIssue[]; diagnostics: readonly ProductIssue[];
  periods: readonly { dataset: string; releaseId: string; period: string; role: ScenarioRole }[];
  periodDisclosure: string;
}
export type MonthlyChoice = { mode: "UNKNOWN" } | { mode: "AMOUNT"; amountGbp: string; note?: string };
export type SourceChoice = MonthlyChoice | { mode: "SOURCE" };
export interface FormLocation {
  cityId: string; effectiveOn: string; bedrooms: string; rentSourceMonth: string;
  rent: SourceChoice;
  council: (MonthlyChoice & { selection?: { authorityName: string; authorityCode?: string; band: string } }) | { mode: "SOURCE"; authorityName: string; authorityCode?: string; band: string };
  water: (MonthlyChoice & { selection?: { band: string; connectedServices: "combined" | "clean_water" | "wastewater" } }) | { mode: "SOURCE"; band: string; connectedServices: "" | "combined" | "clean_water" | "wastewater" };
  energy: MonthlyChoice;
  spending: { groceries: MonthlyChoice; essentials: MonthlyChoice; lifestyle: MonthlyChoice };
  transport: MonthlyChoice | { mode: "PRODUCT"; productId: string; override?: { amountGbp: string; note?: string } } | { mode: "NONE" };
  income: {
    grossAnnualSalaryGbp: string; taxJurisdiction: string; taxYear: string; niCategory: string; scope: string; calculationBasis: string;
    netOverride?: { amountGbp: string; note?: string };
  };
}
export interface CalculatorFormState {
  household: { adults: string; children: string };
  current: FormLocation; destination: FormLocation;
}
export type AdaptedSide = { state: "READY"; input: ScenarioInput; issues: readonly ProductIssue[] }
  | { state: "INCOMPLETE" | "INVALID"; issues: readonly ProductIssue[]; input?: never };
export interface AdapterResult { current: AdaptedSide; destination: AdaptedSide }
