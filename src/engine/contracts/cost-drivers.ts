import type { CategoryComparison, ComparisonDirection, ScenarioComparisonResult } from "./comparison";
import type { HouseholdCostCategory, MonthlyCostResult, ProductionCostClassification } from "./household";
import type { Diagnostic } from "../diagnostics";
import type { Money } from "../money";

export interface CostDriver {
  category: HouseholdCostCategory;
  /** Global rank, including unchanged categories after nonzero impacts. */
  rank: number;
  currentMonthlyAmount: Money;
  destinationMonthlyAmount: Money;
  deltaMonthly: Money;
  absoluteImpactMonthly: Money;
  direction: ComparisonDirection;
  meaningfulChange: boolean;
  classification: "CALCULATED";
  currentClassification: ProductionCostClassification;
  destinationClassification: ProductionCostClassification;
  currentResolutionSource: Extract<MonthlyCostResult, { status: "RESOLVED" }>["resolutionSource"];
  destinationResolutionSource: Extract<MonthlyCostResult, { status: "RESOLVED" }>["resolutionSource"];
  /** Original comparison retains separate side results, baselines, formulas and evidence. */
  comparison: Extract<CategoryComparison, { completeness: "COMPLETE" }>;
}
export interface ExcludedCostDriverCategory {
  category: HouseholdCostCategory;
  comparisonState: string;
  reason: "COMPARISON_NOT_COMPLETE" | "COMPARISON_MISSING_OR_AMBIGUOUS" | "INVALID_COMPLETE_COMPARISON";
  currentState: string;
  destinationState: string;
  comparisons: readonly CategoryComparison[];
  diagnostics: readonly Diagnostic[];
  limitations: readonly string[];
}
export interface CostDriverRankingResult {
  completeness: "COMPLETE" | "PARTIAL" | "UNRESOLVED";
  scope: "ALL_HOUSEHOLD_CATEGORIES" | "COMPARABLE_CATEGORIES_ONLY" | "NO_COMPARABLE_CATEGORIES";
  classification: "CALCULATED";
  deltaConvention: "DESTINATION_MINUS_CURRENT";
  rankedByAbsoluteImpact: readonly CostDriver[];
  increases: readonly CostDriver[];
  decreases: readonly CostDriver[];
  unchanged: readonly CostDriver[];
  excludedCategories: readonly ExcludedCostDriverCategory[];
  totalRelevantCategories: number;
  rankedCategoryCount: number;
  excludedCategoryCount: number;
  unchangedCategoryCount: number;
  meaningfulDriverCount: number;
  comparisonCompleteness: ScenarioComparisonResult["completeness"];
  dataReleaseMetadata: ScenarioComparisonResult["dataReleaseMetadata"];
  diagnostics: readonly Diagnostic[];
  limitations: readonly string[];
  calculationVersion: "cost-driver-ranking-v1";
}
