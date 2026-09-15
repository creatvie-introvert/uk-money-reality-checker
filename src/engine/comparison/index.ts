import type { Diagnostic, DiagnosticCode } from "../diagnostics";
import { compareMoney, subtractMoney, type Money } from "../money";
import { requiredHouseholdCostCategories, type HouseholdMonthlyCosts, type MonthlyCostResult, type HouseholdCostCategory } from "../contracts/household";
import type { ScenarioCalculationResult, ScenarioIncomeResult, ScenarioResidual } from "../contracts/scenario";
import type { ComparisonSide, ComparisonMetric, ScenarioComparisonResult, TakeHomeComparison, CategoryComparison, CoreComparisonMetric } from "../contracts/comparison";
export type { ComparisonEngine, ComparisonResult } from "../contracts/comparison";

function delta(currentAmount: Money, destinationAmount: Money) {
  const order = compareMoney(destinationAmount, currentAmount);
  return {
    completeness: "COMPLETE" as const, currentAmount, destinationAmount,
    delta: subtractMoney(destinationAmount, currentAmount),
    direction: order > 0 ? "INCREASE" as const : order < 0 ? "DECREASE" as const : "NO_CHANGE" as const,
    classification: "CALCULATED" as const, formula: "destination - current" as const,
  };
}
function side<T>(scenario: ScenarioCalculationResult, get: (s: Extract<ScenarioCalculationResult, { status: "EVALUATED" }>) => T): ComparisonSide<T> {
  return scenario.status === "EVALUATED"
    ? { status: "AVAILABLE", result: get(scenario) }
    : { status: "UNAVAILABLE", reason: "SCENARIO_INVALID_INPUT", diagnostics: scenario.diagnostics };
}
function state<T extends { status: string } | { completeness: string }>(value: ComparisonSide<T>): string {
  if (value.status === "UNAVAILABLE") return value.reason;
  return "completeness" in value.result ? value.result.completeness : value.result.status;
}
function diagnostic(code: DiagnosticCode, metric: Diagnostic["metric"], currentState: string, destinationState: string, message: string, category?: HouseholdCostCategory): Diagnostic {
  return {
    code, metric, currentState, destinationState, ...(category ? { category } : {}),
    severity: code.endsWith("PARTIAL") ? "warning" : "blocking", kind: "evidence_gap", message,
    canResolveWithUserInput: true,
  };
}
function incomeOverrideStatus(value: ComparisonSide<ScenarioIncomeResult>): "USER_OVERRIDE" | "NONE" | "UNRESOLVED" {
  if (value.status !== "AVAILABLE" || value.result.status !== "RESOLVED") return "UNRESOLVED";
  return value.result.resolutionSource === "USER_OVERRIDE" ? "USER_OVERRIDE" : "NONE";
}
function takeHome(current: ComparisonSide<ScenarioIncomeResult>, destination: ComparisonSide<ScenarioIncomeResult>): TakeHomeComparison {
  const base = { current, destination, overrideStatus: { current: incomeOverrideStatus(current), destination: incomeOverrideStatus(destination) }, limitations: [] };
  if (current.status === "AVAILABLE" && destination.status === "AVAILABLE" && current.result.status === "RESOLVED" && destination.result.status === "RESOLVED") {
    return { ...base, ...delta(current.result.effectiveMonthlyNetIncome, destination.result.effectiveMonthlyNetIncome), diagnostics: [] };
  }
  const message = "Both effective monthly incomes must resolve; an unavailable income is never replaced with zero.";
  return { ...base, completeness: "UNRESOLVED", limitations: [message], diagnostics: [diagnostic("TAKE_HOME_COMPARISON_UNRESOLVED", "take_home", state(current), state(destination), message)] };
}
function costs(current: ComparisonSide<HouseholdMonthlyCosts>, destination: ComparisonSide<HouseholdMonthlyCosts>): ComparisonMetric<HouseholdMonthlyCosts> {
  if (current.status === "AVAILABLE" && destination.status === "AVAILABLE" && current.result.completeness === "COMPLETE" && destination.result.completeness === "COMPLETE") {
    return { current, destination, ...delta(current.result.totalMonthlyCost, destination.result.totalMonthlyCost), diagnostics: [], limitations: [] };
  }
  const partial = current.status === "AVAILABLE" && destination.status === "AVAILABLE" && current.result.completeness !== "UNRESOLVED" && destination.result.completeness !== "UNRESOLVED";
  const message = "Household-cost change requires two complete totals. Individual resolved subtotals are context only and are not subtracted, even when their category sets match.";
  return { current, destination, completeness: partial ? "PARTIAL" : "UNRESOLVED", limitations: [message], diagnostics: [diagnostic(partial ? "HOUSEHOLD_COST_COMPARISON_PARTIAL" : "HOUSEHOLD_COST_COMPARISON_UNRESOLVED", "household_cost", state(current), state(destination), message)] };
}
function residuals(current: ComparisonSide<ScenarioResidual>, destination: ComparisonSide<ScenarioResidual>): ComparisonMetric<ScenarioResidual> {
  if (current.status === "AVAILABLE" && destination.status === "AVAILABLE" && current.result.completeness === "COMPLETE" && destination.result.completeness === "COMPLETE") {
    return { current, destination, ...delta(current.result.completeResidualMonthly, destination.result.completeResidualMonthly), diagnostics: [], limitations: [] };
  }
  const partial = current.status === "AVAILABLE" && destination.status === "AVAILABLE" && current.result.completeness !== "UNRESOLVED" && destination.result.completeness !== "UNRESOLVED";
  const message = "Residual change requires two complete residuals. Partial residuals remain visible on their own sides without a comparison delta.";
  return { current, destination, completeness: partial ? "PARTIAL" : "UNRESOLVED", limitations: [message], diagnostics: [diagnostic(partial ? "RESIDUAL_COMPARISON_PARTIAL" : "RESIDUAL_COMPARISON_UNRESOLVED", "residual", state(current), state(destination), message)] };
}
function categorySide(scenario: ScenarioCalculationResult, category: HouseholdCostCategory): ComparisonSide<MonthlyCostResult> {
  if (scenario.status !== "EVALUATED") return { status: "UNAVAILABLE", reason: "SCENARIO_INVALID_INPUT", diagnostics: scenario.diagnostics };
  const matches = scenario.householdCostResult.categoryResults.filter((r) => r.category === category);
  if (matches.length === 1) return { status: "AVAILABLE", result: matches[0] };
  return {
    status: "UNAVAILABLE", reason: "CATEGORY_RESULT_MISSING_OR_AMBIGUOUS",
    diagnostics: [{ code: "CATEGORY_COMPARISON_UNRESOLVED", category, metric: "category", cityId: scenario.cityId, severity: "blocking", kind: "validation", message: "Expected exactly one evaluated result for this household category." }],
  };
}
function categoryComparison(current: ComparisonSide<MonthlyCostResult>, destination: ComparisonSide<MonthlyCostResult>, category: HouseholdCostCategory): CategoryComparison {
  if (current.status === "AVAILABLE" && destination.status === "AVAILABLE") {
    if (current.result.status === "RESOLVED" && destination.result.status === "RESOLVED") return {
      category, current, destination, ...delta(current.result.monthlyAmount, destination.result.monthlyAmount), diagnostics: [], limitations: [],
    };
    if (current.result.status === "NOT_APPLICABLE" && destination.result.status === "NOT_APPLICABLE") return {
      category, current, destination, completeness: "NOT_APPLICABLE", diagnostics: [], limitations: ["Both sides explicitly declare this category not applicable; no monetary zero or delta is created."],
    };
  }
  const message = "A category delta requires two resolved amounts. Unresolved and NOT_APPLICABLE states are not converted to monetary zero.";
  return { category, current, destination, completeness: "UNRESOLVED", limitations: [message], diagnostics: [diagnostic("CATEGORY_COMPARISON_UNRESOLVED", "category", state(current), state(destination), message, category)] };
}
/** Consumes typed scenario results only: no loader, input resolution or calculator calls. */
export function compareScenarios(current: ScenarioCalculationResult, destination: ScenarioCalculationResult): ScenarioComparisonResult {
  const takeHomeComparison = takeHome(side(current, (s) => s.incomeResult), side(destination, (s) => s.incomeResult));
  const householdCostComparison = costs(side(current, (s) => s.householdCostResult), side(destination, (s) => s.householdCostResult));
  const residualComparison = residuals(side(current, (s) => s.residual), side(destination, (s) => s.residual));
  const categoryComparisons = requiredHouseholdCostCategories.map((category) => categoryComparison(categorySide(current, category), categorySide(destination, category), category));
  const metrics = [
    ["household_cost", householdCostComparison], ["take_home", takeHomeComparison], ["residual", residualComparison],
  ] as const;
  const incompleteMetrics: CoreComparisonMetric[] = metrics.filter(([, metric]) => metric.completeness !== "COMPLETE").map(([name]) => name);
  const completeness = incompleteMetrics.length === 0 ? "COMPLETE" : incompleteMetrics.length < metrics.length ? "PARTIAL" : "UNRESOLVED";
  const diagnostics: Diagnostic[] = [
    ...current.diagnostics.map((d) => ({ ...d, scenarioRole: "current" as const })),
    ...destination.diagnostics.map((d) => ({ ...d, scenarioRole: "destination" as const })),
    ...metrics.flatMap(([, m]) => m.diagnostics), ...categoryComparisons.flatMap((c) => c.diagnostics),
  ];
  if (completeness !== "COMPLETE") diagnostics.push(diagnostic(completeness === "PARTIAL" ? "COMPARISON_PARTIAL" : "COMPARISON_UNRESOLVED", "comparison", current.completeness, destination.completeness,
    completeness === "PARTIAL" ? "Some core comparisons are complete; incomplete metrics have no delta." : "No core metric is comparable. Any available category deltas remain separate context."));
  return {
    current, destination, deltaConvention: "DESTINATION_MINUS_CURRENT", householdCostComparison, takeHomeComparison,
    residualComparison, categoryComparisons, completeness, diagnostics, calculationVersion: "scenario-comparison-v1",
    unresolvedDifferences: {
      metrics: incompleteMetrics, categories: categoryComparisons.filter((c) => c.completeness === "UNRESOLVED").map((c) => c.category),
      currentUnresolvedCategories: current.status === "EVALUATED" ? current.unresolvedCategories : [],
      destinationUnresolvedCategories: destination.status === "EVALUATED" ? destination.unresolvedCategories : [],
    },
    dataReleaseMetadata: {
      current: current.status === "EVALUATED" ? current.dataReleaseMetadata : null,
      destination: destination.status === "EVALUATED" ? destination.dataReleaseMetadata : null,
    },
  };
}
