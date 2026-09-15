import type { CategoryComparison, ComparisonMetric, CostDriverRankingResult, EngineEvidence, MonthlyCostResult, ScenarioCalculationResult, ScenarioComparisonResult, SalaryPreservationResult, Money } from "@/engine";
import type { Explanation, LocationSummary, ProductAmount, ProductCalculatorResult, ProductDriver, ProductIssue, ProductMetric, ProductSalary, ScenarioRole, SourceSummary } from "./contracts";
import { categoryLabels, cityLabels, classificationLabels, copy, presentDiagnostic, uniqueIssues } from "./copy";
import { formatChange, formatMoney } from "./formatting";

function sources(records: readonly EngineEvidence[]): SourceSummary[] {
  return [...new Map(records.map((r) => {
    const p = r.provenance;
    const geography = "geography" in r ? r.geography.official.name : "publishedGeography" in r ? r.publishedGeography.official.name : undefined;
    const id = `${p.sourceId}:${p.snapshotId}:${geography}`;
    return [id, { id, organisation: p.organisation, title: p.publicationTitle, url: /^https?:\/\//.test(p.sourceUrl ?? "") ? p.sourceUrl : undefined, period: p.sourcePeriod, effectiveFrom: p.effectiveFrom, effectiveTo: p.effectiveTo, geography }];
  })).values()];
}
const calculated = (summary: string, records: readonly EngineEvidence[] = [], limitations: readonly string[] = []): Explanation => ({ classification: "CALCULATED", label: classificationLabels.CALCULATED, summary, sources: sources(records), limitations });
function amount(exact: Money, explanation: Explanation, state: "AVAILABLE" | "PARTIAL" = "AVAILABLE"): ProductAmount {
  return { state, exact, display: formatMoney(exact), explanation };
}
const unavailable = (summary: string, explanation?: Explanation): ProductAmount => ({ state: "UNAVAILABLE", display: copy.unavailable, explanation: explanation ?? { summary, sources: [], limitations: [] } });
function categoryAmount(r: MonthlyCostResult | undefined): ProductAmount {
  if (!r) return unavailable("This category could not be evaluated.");
  const explanation: Explanation = {
    summary: r.status === "RESOLVED" ? r.classification === "USER_ENTERED" ? "Using your entered monthly amount; source details below describe the retained baseline." : r.amountBasis === "SOURCE_MONTH" ? "Published monthly source amount for the selected geography and period." : "Selected source charge converted to a mathematical monthly equivalent."
      : r.status === "NOT_APPLICABLE" ? "You explicitly declared no transport cost." : r.diagnostics.map((d) => presentDiagnostic(d).message).join(" "),
    sources: sources(r.evidenceLineage), limitations: r.limitations, baselineStatus: r.baselineEvidence.status,
    ...(r.status === "RESOLVED" ? { classification: r.classification, label: classificationLabels[r.classification] } : {}),
  };
  if (r.status === "RESOLVED") return amount(r.monthlyAmount, explanation);
  if (r.status === "NOT_APPLICABLE") return { state: "NOT_APPLICABLE", display: copy.notApplicable, explanation };
  return unavailable(explanation.summary, explanation);
}
function incomeAmount(s: ScenarioCalculationResult): ProductAmount {
  if (s.status !== "EVALUATED") return unavailable("Review the scenario inputs.");
  const r = s.incomeResult;
  if (r.status !== "RESOLVED") return unavailable("Enter supported employment details or your actual monthly take-home.");
  const baseline = r.baselineIncome;
  return amount(r.effectiveMonthlyNetIncome, {
    classification: r.classification, label: classificationLabels[r.classification],
    summary: r.resolutionSource === "USER_OVERRIDE" ? "Using your entered monthly take-home; employment references describe the baseline only." : "Calculated annual employment take-home divided by 12.",
    sources: baseline.status === "AVAILABLE" ? sources(baseline.calculation.evidenceLineage) : [],
    baselineStatus: baseline.status, limitations: r.limitations,
  });
}
function location(s: ScenarioCalculationResult): LocationSummary {
  if (s.status !== "EVALUATED") return { cityId: "", name: "Location needs input", income: unavailable("Review inputs."), costs: unavailable("Review inputs."), residual: unavailable("Review inputs.") };
  const c = s.householdCostResult;
  const costs = c.completeness === "UNRESOLVED" ? unavailable("No household cost subtotal is available.")
    : amount(c.completeness === "COMPLETE" ? c.totalMonthlyCost : c.resolvedSubtotalMonthly, calculated(c.completeness === "COMPLETE" ? "Complete total for the eight declared cost categories." : "Known costs only; unresolved costs are excluded."), c.completeness === "COMPLETE" ? "AVAILABLE" : "PARTIAL");
  const residual = s.residual.completeness === "UNRESOLVED" ? unavailable("Income and costs must resolve before a residual is available.")
    : amount(s.residual.completeness === "COMPLETE" ? s.residual.completeResidualMonthly : s.residual.partialResidualAfterResolvedCosts, calculated(s.residual.completeness === "COMPLETE" ? "Monthly take-home less complete declared household costs." : copy.partialResidual), s.residual.completeness === "COMPLETE" ? "AVAILABLE" : "PARTIAL");
  return { cityId: s.cityId, name: cityLabels[s.cityId] ?? s.cityId, effectiveOn: s.inputUsed.location.effectiveOn, income: incomeAmount(s), costs, residual,
    coverage: { required: c.requiredCategoryCount, resolved: c.resolvedCategoryCount, unresolved: c.unresolvedCategoryCount, notApplicable: c.notApplicableCategoryCount } };
}
function metric<T>(m: ComparisonMetric<T> | CategoryComparison, label: string, current: ProductAmount, destination: ProductAmount, dependencies: readonly ProductIssue[]): ProductMetric {
  if (m.completeness === "COMPLETE") return { state: "AVAILABLE", label, exact: m.delta, display: formatChange(m.delta), direction: m.direction, current, destination, classification: "CALCULATED", dependencies: [] };
  return { state: m.completeness === "PARTIAL" ? "PARTIAL" : "UNAVAILABLE", label,
    reason: m.completeness === "NOT_APPLICABLE" ? "Both sides explicitly declare this cost not applicable." : "Both sides need complete amounts before this change can be shown.", dependencies };
}
function unresolvedItems(s: ScenarioCalculationResult, role: ScenarioRole): ProductIssue[] {
  if (s.status !== "EVALUATED") return s.diagnostics.map((d) => presentDiagnostic(d, role));
  return uniqueIssues([
    ...s.householdCostResult.categoryResults.filter((c) => c.status === "UNRESOLVED").flatMap((c) => c.diagnostics.map((d) => presentDiagnostic(d, role))),
    ...(s.incomeResult.status === "UNRESOLVED" ? s.incomeResult.diagnostics.filter((d) => d.severity === "blocking").map((d) => presentDiagnostic(d, role)) : []),
  ]);
}
function salary(result: SalaryPreservationResult, destination: ScenarioCalculationResult, unresolved: readonly ProductIssue[]): ProductSalary {
  if (result.status === "INELIGIBLE") {
    const dependencies = uniqueIssues([...unresolved, ...result.diagnostics.map((d) => presentDiagnostic(d))]);
    return { state: "UNAVAILABLE", engineStatus: result.status, label: copy.salary,
      reason: result.reasons.map((code) => presentDiagnostic({ code, message: "Review the required inputs.", severity: "blocking", kind: "calculation_policy" }).message).join(" "), dependencies, userActionPossible: dependencies.some((d) => d.userActionPossible) };
  }
  if (result.status === "NO_SOLUTION_WITHIN_BOUNDS") return { state: "UNAVAILABLE", engineStatus: result.status, label: copy.salary, reason: "No salary within the operational search limit meets this buffer target. This is not a statutory salary maximum.", dependencies: result.diagnostics.map((d) => presentDiagnostic(d)), userActionPossible: false, operationalMaximum: amount(result.search.operationalMaximum, calculated("Operational annual gross search maximum.")) };
  const baseline = destination.incomeResult?.baselineIncome;
  return {
    state: "AVAILABLE", label: copy.salary, grossAnnual: amount(result.requiredGrossAnnualSalary, calculated("Minimum annual gross salary preserving the current complete monthly buffer.")),
    requiredNetMonthly: amount(result.target.requiredDestinationNetMonthly, calculated("Current complete residual plus destination complete monthly cost.")),
    targetResidual: amount(result.target.currentResidualMonthly, calculated("Current complete monthly residual, including a negative buffer where applicable.")),
    destinationCosts: amount(result.target.destinationCompleteMonthlyCost, calculated("Destination complete monthly cost basis.")),
    achievedResidual: amount(result.achievedResidualMonthly, calculated("Monthly residual achieved at the required salary.")),
    overshoot: amount(result.overshootMonthly, calculated("Exact excess above the target; zero only when the exact target is met.")),
    ...(baseline?.status === "AVAILABLE" ? { proposedGross: amount(baseline.calculation.grossAnnual, { ...calculated("Your proposed destination gross salary."), classification: "USER_ENTERED", label: "Your amount" }) } : {}),
    jurisdiction: result.taxJurisdiction, limitation: copy.annual, search: result.search,
  };
}
/** Maps domain results; all monetary deltas, ranking and salary arithmetic remain in M2. */
export function composeProductResult(comparison: ScenarioComparisonResult, ranking: CostDriverRankingResult, preservation: SalaryPreservationResult, adapterIssues: readonly ProductIssue[] = []): ProductCalculatorResult {
  const current = location(comparison.current), destination = location(comparison.destination);
  const unresolved = uniqueIssues([...unresolvedItems(comparison.current, "current"), ...unresolvedItems(comparison.destination, "destination")]);
  const costDependencies = unresolved.filter((d) => d.category && d.category in categoryLabels);
  const inputDependencies = unresolved.filter((d) => !d.category || !(d.category in categoryLabels));
  const convert = (d: CostDriverRankingResult["rankedByAbsoluteImpact"][number]): ProductDriver => ({ category: d.category, label: categoryLabels[d.category], rank: d.rank, exact: d.deltaMonthly, magnitude: d.absoluteImpactMonthly, display: formatChange(d.deltaMonthly), direction: d.direction, currentLabel: classificationLabels[d.currentClassification], destinationLabel: classificationLabels[d.destinationClassification] });
  const ranked = ranking.rankedByAbsoluteImpact.map(convert);
  const mappedView = (rows: readonly CostDriverRankingResult["rankedByAbsoluteImpact"][number][]) => rows.map((r) => ranked.find((d) => d.category === r.category)!);
  return {
    version: "product-calculator-v1", completeness: comparison.completeness === "COMPLETE" ? "COMPLETE" : comparison.completeness === "PARTIAL" || ranked.length > 0 ? "PARTIAL" : "LIMITED",
    current, destination,
    headlines: {
      costs: metric(comparison.householdCostComparison, "Monthly cost change", current.costs, destination.costs, costDependencies),
      takeHome: metric(comparison.takeHomeComparison, "Take-home change", current.income, destination.income, inputDependencies),
      residual: metric(comparison.residualComparison, "Monthly buffer change", current.residual, destination.residual, unresolved),
    },
    breakdown: comparison.categoryComparisons.map((c) => {
      const a = categoryAmount(c.current.status === "AVAILABLE" ? c.current.result : undefined), b = categoryAmount(c.destination.status === "AVAILABLE" ? c.destination.result : undefined);
      return { category: c.category, label: categoryLabels[c.category], current: a, destination: b, change: metric(c, `${categoryLabels[c.category]} change`, a, b, unresolved.filter((d) => d.category === c.category)) };
    }),
    drivers: { completeness: ranking.completeness, title: ranking.completeness === "COMPLETE" ? "What’s changing most?" : "Largest changes among the costs we can compare", ranked, increases: mappedView(ranking.increases), savings: mappedView(ranking.decreases), unchanged: mappedView(ranking.unchanged), excluded: ranking.excludedCategories.map((c) => ({ category: c.category, label: categoryLabels[c.category], reason: "Two resolved amounts are needed to compare this cost; missing and not-applicable values are not zero." })) },
    salary: salary(preservation, comparison.destination, unresolved), unresolved,
    diagnostics: uniqueIssues([...adapterIssues, ...comparison.diagnostics.map((d) => presentDiagnostic(d)), ...ranking.diagnostics.map((d) => presentDiagnostic(d)), ...preservation.diagnostics.map((d) => presentDiagnostic(d))]),
    periods: (["current", "destination"] as const).flatMap((role) => comparison.dataReleaseMetadata[role]?.datasets.map((d) => ({ dataset: d.dataset, releaseId: d.releaseId, period: d.sourcePeriod, role })) ?? []),
    periodDisclosure: copy.periods,
  };
}
