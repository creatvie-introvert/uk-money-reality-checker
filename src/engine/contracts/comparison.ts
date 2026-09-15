import type { Diagnostic } from "../diagnostics";
import type { DataReleaseMetadata } from "../loaders";
import type { Money } from "../money";
import type { ScenarioCalculationResult, ScenarioIncomeResult, ScenarioResidual } from "./scenario";
import type { HouseholdCostCategory, HouseholdMonthlyCosts, MonthlyCostResult } from "./household";

export type ComparisonDirection = "INCREASE" | "DECREASE" | "NO_CHANGE";
export type CoreComparisonMetric = "household_cost" | "take_home" | "residual";
export type ComparisonSide<T> =
  | { status: "AVAILABLE"; result: T }
  | { status: "UNAVAILABLE"; reason: "SCENARIO_INVALID_INPUT" | "CATEGORY_RESULT_MISSING_OR_AMBIGUOUS"; diagnostics: readonly Diagnostic[] };
interface MetricContext<T> {
  current: ComparisonSide<T>;
  destination: ComparisonSide<T>;
  diagnostics: readonly Diagnostic[];
  limitations: readonly string[];
}
interface CompleteDelta {
  completeness: "COMPLETE";
  currentAmount: Money;
  destinationAmount: Money;
  delta: Money;
  direction: ComparisonDirection;
  classification: "CALCULATED";
  formula: "destination - current";
}
interface NoDelta {
  delta?: never;
  currentAmount?: never;
  destinationAmount?: never;
  direction?: never;
  classification?: never;
  formula?: never;
}
/** Incomplete metrics retain side results, but expose no monetary comparison fields. */
export type ComparisonMetric<T> = MetricContext<T> & (
  | CompleteDelta
  | (NoDelta & { completeness: "PARTIAL" | "UNRESOLVED" })
);
export type TakeHomeComparison = ComparisonMetric<ScenarioIncomeResult> & {
  overrideStatus: { current: "USER_OVERRIDE" | "NONE" | "UNRESOLVED"; destination: "USER_OVERRIDE" | "NONE" | "UNRESOLVED" };
};
export type CategoryComparison = { category: HouseholdCostCategory } & MetricContext<MonthlyCostResult> & (
  | CompleteDelta
  | (NoDelta & { completeness: "UNRESOLVED" | "NOT_APPLICABLE" })
);
export interface ScenarioComparisonResult {
  current: ScenarioCalculationResult;
  destination: ScenarioCalculationResult;
  deltaConvention: "DESTINATION_MINUS_CURRENT";
  householdCostComparison: ComparisonMetric<HouseholdMonthlyCosts>;
  takeHomeComparison: TakeHomeComparison;
  residualComparison: ComparisonMetric<ScenarioResidual>;
  categoryComparisons: readonly CategoryComparison[];
  completeness: "COMPLETE" | "PARTIAL" | "UNRESOLVED";
  unresolvedDifferences: {
    metrics: readonly CoreComparisonMetric[];
    categories: readonly HouseholdCostCategory[];
    currentUnresolvedCategories: readonly HouseholdCostCategory[];
    destinationUnresolvedCategories: readonly HouseholdCostCategory[];
  };
  /** Null only means an invalid scenario has no evaluated release metadata, never zero money. */
  dataReleaseMetadata: { current: DataReleaseMetadata | null; destination: DataReleaseMetadata | null };
  diagnostics: readonly Diagnostic[];
  calculationVersion: "scenario-comparison-v1";
}
/** Replaces the kickoff's unimplemented one-argument comparison placeholder. */
export type ComparisonEngine = (current: ScenarioCalculationResult, destination: ScenarioCalculationResult) => ScenarioComparisonResult;
export type ComparisonResult = ScenarioComparisonResult;
