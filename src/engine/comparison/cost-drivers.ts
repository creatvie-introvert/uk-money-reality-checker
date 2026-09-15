import type { CategoryComparison, ScenarioComparisonResult } from "../contracts/comparison";
import type { CostDriver, CostDriverRankingResult, ExcludedCostDriverCategory } from "../contracts/cost-drivers";
import { requiredHouseholdCostCategories, type HouseholdCostCategory } from "../contracts/household";
import type { Diagnostic } from "../diagnostics";
import { absoluteMoney, compareMoney, fromGbp, moneySchema, subtractMoney } from "../money";

const zero = fromGbp("0");
function sideState(comparison: CategoryComparison, role: "current" | "destination"): string {
  const side = comparison[role];
  return side.status === "AVAILABLE" ? side.result.status : side.reason;
}
function excluded(category: HouseholdCostCategory, comparisons: readonly CategoryComparison[], reason: ExcludedCostDriverCategory["reason"]): ExcludedCostDriverCategory {
  const single = comparisons.length === 1 ? comparisons[0] : undefined;
  const currentState = single ? sideState(single, "current") : "MISSING_OR_AMBIGUOUS";
  const destinationState = single ? sideState(single, "destination") : "MISSING_OR_AMBIGUOUS";
  const message = reason === "COMPARISON_NOT_COMPLETE"
    ? "Excluded from cost-driver ranking: both sides need a complete monetary category comparison. No missing or N/A amount is converted to zero."
    : reason === "COMPARISON_MISSING_OR_AMBIGUOUS"
      ? "Excluded from cost-driver ranking: exactly one category comparison is required."
      : "Excluded from cost-driver ranking: complete comparison amounts, direction or side metadata are inconsistent.";
  const diagnostic: Diagnostic = {
    code: "COST_DRIVER_CATEGORY_EXCLUDED", metric: "cost_driver_ranking", category, currentState, destinationState,
    severity: "warning", kind: reason === "COMPARISON_NOT_COMPLETE" ? "evidence_gap" : "validation", message,
    canResolveWithUserInput: reason === "COMPARISON_NOT_COMPLETE",
  };
  return {
    category, comparisonState: single?.completeness ?? "MISSING_OR_AMBIGUOUS", reason, currentState, destinationState, comparisons,
    diagnostics: [...comparisons.flatMap((c) => c.diagnostics), diagnostic],
    limitations: [...new Set([...comparisons.flatMap((c) => c.limitations), message])],
  };
}
/** Rankings consume only category comparisons; no scenario calculation or partial-total arithmetic. */
export function rankCostDrivers(comparison: ScenarioComparisonResult): CostDriverRankingResult {
  if (comparison.deltaConvention !== "DESTINATION_MINUS_CURRENT") throw new Error("Unsupported comparison delta convention");
  const eligible: Omit<CostDriver, "rank">[] = [];
  const excludedCategories: ExcludedCostDriverCategory[] = [];
  for (const category of requiredHouseholdCostCategories) {
    const matches = comparison.categoryComparisons.filter((c) => c.category === category);
    if (matches.length !== 1) {
      excludedCategories.push(excluded(category, matches, "COMPARISON_MISSING_OR_AMBIGUOUS"));
      continue;
    }
    const c = matches[0];
    if (c.completeness !== "COMPLETE") {
      excludedCategories.push(excluded(category, matches, "COMPARISON_NOT_COMPLETE"));
      continue;
    }
    if (c.current.status !== "AVAILABLE" || c.destination.status !== "AVAILABLE" || c.current.result.status !== "RESOLVED" || c.destination.result.status !== "RESOLVED" ||
        ![c.delta, c.currentAmount, c.destinationAmount, c.current.result.monthlyAmount, c.destination.result.monthlyAmount].every((m) => moneySchema.safeParse(m).success)) {
      excludedCategories.push(excluded(category, matches, "INVALID_COMPLETE_COMPARISON"));
      continue;
    }
    const current = c.current.result, destination = c.destination.result;
    const sign = compareMoney(c.delta, zero);
    const direction = sign > 0 ? "INCREASE" : sign < 0 ? "DECREASE" : "NO_CHANGE";
    // Integrity checks only: the supplied signed delta remains the authoritative ranked value.
    if (c.classification !== "CALCULATED" || c.formula !== "destination - current" || c.direction !== direction ||
        current.category !== category || destination.category !== category ||
        compareMoney(c.currentAmount, current.monthlyAmount) !== 0 || compareMoney(c.destinationAmount, destination.monthlyAmount) !== 0 ||
        compareMoney(c.delta, subtractMoney(c.destinationAmount, c.currentAmount)) !== 0) {
      excludedCategories.push(excluded(category, matches, "INVALID_COMPLETE_COMPARISON"));
      continue;
    }
    eligible.push({
      category, currentMonthlyAmount: c.currentAmount, destinationMonthlyAmount: c.destinationAmount,
      deltaMonthly: c.delta, absoluteImpactMonthly: absoluteMoney(c.delta), direction, meaningfulChange: sign !== 0,
      classification: "CALCULATED", currentClassification: current.classification, destinationClassification: destination.classification,
      currentResolutionSource: current.resolutionSource, destinationResolutionSource: destination.resolutionSource, comparison: c,
    });
  }
  eligible.sort((a, b) => compareMoney(b.absoluteImpactMonthly, a.absoluteImpactMonthly) ||
    requiredHouseholdCostCategories.indexOf(a.category) - requiredHouseholdCostCategories.indexOf(b.category));
  const rankedByAbsoluteImpact = eligible.map((driver, index) => ({ ...driver, rank: index + 1 }));
  const increases = rankedByAbsoluteImpact.filter((d) => d.direction === "INCREASE");
  const decreases = rankedByAbsoluteImpact.filter((d) => d.direction === "DECREASE");
  const unchanged = rankedByAbsoluteImpact.filter((d) => d.direction === "NO_CHANGE");
  const completeness = rankedByAbsoluteImpact.length === 0 ? "UNRESOLVED" : excludedCategories.length ? "PARTIAL" : "COMPLETE";
  const scope = completeness === "COMPLETE" ? "ALL_HOUSEHOLD_CATEGORIES" : completeness === "PARTIAL" ? "COMPARABLE_CATEGORIES_ONLY" : "NO_COMPARABLE_CATEGORIES";
  const limitations = completeness === "COMPLETE" ? [] : ["Biggest cost changes among the categories we can compare; excluded categories may contain larger changes. This is not an overall household-cost ranking."];
  const diagnostics: Diagnostic[] = excludedCategories.flatMap((c) => c.diagnostics);
  if (completeness !== "COMPLETE") diagnostics.push({
    code: completeness === "PARTIAL" ? "COST_DRIVER_RANKING_PARTIAL" : "COST_DRIVER_RANKING_UNRESOLVED", metric: "cost_driver_ranking",
    severity: completeness === "PARTIAL" ? "warning" : "blocking", kind: "evidence_gap",
    message: completeness === "PARTIAL" ? limitations[0] : "No complete monetary category deltas are available to rank; every category exclusion is retained.",
    canResolveWithUserInput: true,
  });
  return {
    completeness, scope, classification: "CALCULATED", deltaConvention: "DESTINATION_MINUS_CURRENT", rankedByAbsoluteImpact, increases, decreases, unchanged,
    excludedCategories, totalRelevantCategories: requiredHouseholdCostCategories.length, rankedCategoryCount: rankedByAbsoluteImpact.length,
    excludedCategoryCount: excludedCategories.length, unchangedCategoryCount: unchanged.length, meaningfulDriverCount: increases.length + decreases.length,
    comparisonCompleteness: comparison.completeness, dataReleaseMetadata: comparison.dataReleaseMetadata,
    diagnostics, limitations, calculationVersion: "cost-driver-ranking-v1",
  };
}
