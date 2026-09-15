import { describe, expect, it } from "vitest";
import * as engine from "@/engine";
import { acceptanceFixtures, completeInput } from "./fixtures/milestone-2/cases";

const evidence = engine.createEvidenceLoader();
const zero = engine.fromGbp("0");
const annual = (value: engine.Money) => engine.multiplyMoney(value, BigInt(12));
const monthly = (amountGbp: string) => ({ amountGbp, period: "MONTHLY" as const });
function pipeline(current: engine.ScenarioInput, destination: engine.ScenarioInput) {
  const c = engine.calculateScenario(evidence, current), d = engine.calculateScenario(evidence, destination);
  const comparison = engine.compareScenarios(c, d);
  return { c, d, comparison, ranking: engine.rankCostDrivers(comparison), eligibility: engine.evaluateSalaryPreservationEligibility(evidence, c, d), solver: engine.solveSalaryPreservation(evidence, c, d) };
}
function category(s: engine.ScenarioCalculationResult, name: engine.HouseholdCostCategory) {
  if (s.status !== "EVALUATED") throw new Error("Fixture did not validate");
  const r = s.householdCostResult.categoryResults.find((r) => r.category === name)!;
  if (r.status !== "RESOLVED") throw new Error(`Fixture category ${name} did not resolve`);
  return r;
}
function reconcileSolver(result: engine.SalaryPreservationResult, destination: engine.ScenarioInput) {
  if (result.status !== "ELIGIBLE_SOLVED") throw new Error("Expected solved fixture");
  const request = {
    grossAnnualSalaryGbp: result.requiredGrossAnnualSalaryGbp,
    jurisdiction: destination.location.income.taxJurisdiction, taxYear: destination.location.income.taxYear,
    niCategory: destination.location.income.niCategory, scope: destination.location.income.scope,
    basis: destination.location.income.calculationBasis, effectiveOn: destination.location.effectiveOn,
  };
  const f = engine.calculateNetEmploymentIncome(evidence, request);
  if (f.status !== "RESOLVED") throw new Error("Forward reconciliation failed");
  expect(result.achievedNetAnnual).toEqual(f.netAnnual);
  expect(result.achievedNetMonthly).toEqual(f.netMonthlyEquivalent);
  expect(result.target.requiredDestinationNetMonthly).toEqual(engine.addMoney(result.target.currentResidualMonthly, result.target.destinationCompleteMonthlyCost));
  expect(result.overshootMonthly).toEqual(engine.subtractMoney(result.achievedNetMonthly, result.target.requiredDestinationNetMonthly));
  expect(engine.compareMoney(result.overshootMonthly, zero)).toBeGreaterThanOrEqual(0);
  expect(result.achievedResidualMonthly).toEqual(engine.addMoney(result.target.currentResidualMonthly, result.overshootMonthly));
  expect(result.minimality.guarantee).toBe("GLOBAL_MINIMUM_WITHIN_BOUNDS");
  expect(result.search.iterations).toBeLessThanOrEqual(23);
  expect(result.search.localPenceChecked).toBeLessThanOrEqual(200);
  expect(result.search.forwardEvaluations).toBeLessThanOrEqual(227);
  expect(result.lineage.employmentReferenceReleases).toEqual(f.referenceRelease);
  expect(result.lineage.employmentRecordIds).toEqual(f.evidenceLineage.map((r) => r.recordId));
}

describe("Milestone 2 release acceptance: public engine pipeline", () => {
  it.each(acceptanceFixtures())("$id — $purpose", (fixture) => {
    const before = JSON.stringify(fixture);
    const { c, d, comparison, ranking, eligibility, solver } = pipeline(fixture.current, fixture.destination);
    for (const [index, s] of [c, d].entries()) {
      expect(s.status).toBe("EVALUATED");
      if (s.status !== "EVALUATED") throw new Error("Invalid acceptance input");
      expect(s.completeness).toBe(fixture.expected.scenarioStates[index]);
      expect(s.unresolvedCategories).toEqual(fixture.expected.unresolved[index]);
      expect(s.dataReleaseMetadata).toBe(evidence.metadata);
      const net = fixture.expected.netAnnual[index], costs = fixture.expected.completeCostsAnnual[index];
      if (net === null) {
        expect(s.incomeResult.status).toBe("UNRESOLVED");
        expect(s.incomeResult).not.toHaveProperty("effectiveMonthlyNetIncome");
      } else {
        expect(s.incomeResult.status).toBe("RESOLVED");
        expect(annual(s.incomeResult.effectiveMonthlyNetIncome!)).toEqual(engine.fromGbp(net));
      }
      if (costs === null) {
        expect(s.householdCostResult).not.toHaveProperty("totalMonthlyCost");
        expect(s.residual).not.toHaveProperty("completeResidualMonthly");
      } else {
        expect(s.householdCostResult.completeness).toBe("COMPLETE");
        expect(annual(s.householdCostResult.totalMonthlyCost!)).toEqual(engine.fromGbp(costs));
      }
      if (s.completeness === "COMPLETE") {
        expect(annual(s.residual.completeResidualMonthly)).toEqual(engine.subtractMoney(engine.fromGbp(net!), engine.fromGbp(costs!)));
        expect(s.residual.classification).toBe("CALCULATED");
      } else expect(s.residual).not.toHaveProperty("completeResidualMonthly");
      for (const cost of s.householdCostResult.categoryResults) {
        if (cost.status === "RESOLVED") {
          expect(["OBSERVED_DATA", "CALCULATED", "USER_ENTERED"]).toContain(cost.classification);
          expect(cost.lineageClassifications).not.toContain("MODELLED_ESTIMATE");
        } else expect(cost).not.toHaveProperty("monthlyAmount");
        cost.evidenceLineage.forEach((r) => expect(r.valueType).toBe("OBSERVED_DATA"));
        expect(s.evidenceLineage.householdCosts.find((r) => r.category === cost.category)!.references.map((r) => r.recordId)).toEqual(cost.evidenceLineage.map((r) => r.recordId));
      }
    }
    expect(comparison.completeness).toBe(fixture.expected.comparison);
    const metrics = [comparison.takeHomeComparison, comparison.householdCostComparison, comparison.residualComparison];
    metrics.forEach((m, index) => {
      const value = fixture.expected.annualDeltas[index];
      if (value === null) expect(m).not.toHaveProperty("delta");
      else {
        expect(m.completeness).toBe("COMPLETE");
        expect(annual(m.delta!)).toEqual(engine.fromGbp(value));
        expect(m.classification).toBe("CALCULATED");
        expect(m.direction).toBe(engine.compareMoney(engine.fromGbp(value), zero) > 0 ? "INCREASE" : engine.compareMoney(engine.fromGbp(value), zero) < 0 ? "DECREASE" : "NO_CHANGE");
      }
    });
    expect(ranking.completeness).toBe(fixture.expected.ranking);
    expect(ranking.excludedCategories.map((r) => r.category)).toEqual(fixture.expected.excluded);
    expect(ranking.rankedByAbsoluteImpact[0].category).toBe(fixture.expected.firstDriver);
    expect(ranking.rankedCategoryCount + ranking.excludedCategoryCount).toBe(8);
    for (const driver of ranking.rankedByAbsoluteImpact) {
      expect(driver.classification).toBe("CALCULATED");
      expect(driver.deltaMonthly).toEqual(engine.subtractMoney(category(d, driver.category).monthlyAmount, category(c, driver.category).monthlyAmount));
      expect(driver.currentClassification).toBe(category(c, driver.category).classification);
      expect(driver.destinationClassification).toBe(category(d, driver.category).classification);
      expect(driver.comparison).toBe(comparison.categoryComparisons.find((r) => r.category === driver.category));
    }
    expect(solver.status).toBe(fixture.expected.solver);
    expect(eligibility.status).toBe(fixture.expected.solver === "ELIGIBLE_SOLVED" ? "ELIGIBLE" : "INELIGIBLE");
    if (solver.status === "ELIGIBLE_SOLVED") {
      expect(solver.requiredGrossAnnualSalaryGbp).toBe(fixture.expected.solvedGross);
      reconcileSolver(solver, fixture.destination);
    } else expect(solver).not.toHaveProperty("requiredGrossAnnualSalary");
    const diagnostics = [...comparison.diagnostics, ...ranking.diagnostics, ...solver.diagnostics];
    for (const code of fixture.expected.diagnostics) expect(diagnostics.some((d) => d.code === code)).toBe(true);
    diagnostics.forEach((d) => expect(engine.diagnosticSchema.safeParse(d).success).toBe(true));
    expect(JSON.stringify(fixture)).toBe(before);
  });

  it("retains Scottish charge bases and distinct Glasgow source geographies through ranking and solver", () => {
    const fixture = acceptanceFixtures().find((f) => f.id === "B-scotland")!;
    const { c, d, ranking, solver } = pipeline(fixture.current, fixture.destination);
    expect(annual(category(c, "council_tax").monthlyAmount)).toEqual(engine.fromGbp("1706.00"));
    expect(annual(category(d, "council_tax").monthlyAmount)).toEqual(engine.fromGbp("2241.49"));
    expect(annual(category(c, "water").monthlyAmount)).toEqual(engine.fromGbp("652.32"));
    expect(annual(category(d, "water").monthlyAmount)).toEqual(engine.fromGbp("797.28"));
    expect(category(d, "water").evidenceLineage.map((r) => r.recordId)).toEqual(["SRC-010:E-combined:2026-27"]);
    expect(category(c, "rent").evidenceLineage[0]).toHaveProperty("geography.official.code", "S33000009");
    expect(ranking.rankedByAbsoluteImpact.map((r) => r.category)).toEqual(["council_tax", "energy", "groceries", "water", "rent", "essentials", "lifestyle", "transport"]);
    if (c.incomeResult?.baselineIncome.status !== "AVAILABLE") throw new Error("Missing baseline");
    expect(c.incomeResult.baselineIncome.calculation.jurisdiction).toBe("Scotland");
    expect(solver).toHaveProperty("taxJurisdiction", "Scotland");
  });

  it("retains override notes, observed baselines and classifications across downstream results", () => {
    const fixture = acceptanceFixtures().find((f) => f.id === "D-overrides")!;
    const { c, d, comparison, ranking, solver } = pipeline(fixture.current, fixture.destination);
    const driver = ranking.rankedByAbsoluteImpact.find((r) => r.category === "rent")!;
    expect(driver.currentClassification).toBe("OBSERVED_DATA");
    expect(driver.destinationClassification).toBe("USER_ENTERED");
    expect(category(d, "rent").baselineEvidence.records).toEqual(category(c, "rent").evidenceLineage);
    expect(category(d, "rent").inputUsed).toHaveProperty("override.note", "Signed tenancy");
    expect(category(d, "council_tax").baselineEvidence.records).toEqual(category(c, "council_tax").evidenceLineage);
    expect(c.incomeResult?.baselineIncome).toHaveProperty("calculation.netAnnual", engine.fromGbp("39519.60"));
    expect(comparison.takeHomeComparison.overrideStatus).toEqual({ current: "USER_OVERRIDE", destination: "USER_OVERRIDE" });
    expect(solver).toHaveProperty("reasons", ["DESTINATION_NET_OVERRIDE_CONFLICT"]);
  });

  it("retains all zero deltas with deterministic ranking and zero solver overshoot", () => {
    const q = completeInput(), first = pipeline(q, q), second = pipeline(q, q);
    expect(second).toEqual(first);
    expect(first.ranking.unchanged.map((r) => r.category)).toEqual(engine.requiredHouseholdCostCategories);
    expect(first.ranking.meaningfulDriverCount).toBe(0);
    expect(first.solver).toHaveProperty("overshootMonthly", zero);
  });

  it("carries a weekly ticket fraction through complete costs, residual change, ranking and solver", () => {
    const current = completeInput(); current.location.cityId = "LOC-LON";
    const destination = structuredClone(current);
    destination.location.transport = { status: "SELECTED", productId: "SRC-TFL:tfl:seven-day:2026-09" };
    const { d, comparison, ranking, solver } = pipeline(current, destination);
    // £24.70 × 52 = £1284.40; old monthly £70 × 12 = £840.
    expect(annual(category(d, "transport").monthlyAmount)).toEqual(engine.fromGbp("1284.40"));
    expect(annual(comparison.householdCostComparison.delta!)).toEqual(engine.fromGbp("444.40"));
    expect(annual(comparison.residualComparison.delta!)).toEqual(engine.fromGbp("-444.40"));
    expect(ranking.rankedByAbsoluteImpact[0].category).toBe("transport");
    expect(annual(ranking.rankedByAbsoluteImpact[0].deltaMonthly)).toEqual(engine.fromGbp("444.40"));
    reconcileSolver(solver, destination);
    expect(solver).toHaveProperty("target.requiredDestinationNetMonthly", engine.multiplyMoney(engine.fromGbp("39964"), BigInt(1), BigInt(12)));
  });

  it("keeps N/A distinct from explicit zero while complete totals remain comparable", () => {
    const c = completeInput(), d = completeInput();
    c.location.transport = { status: "NOT_APPLICABLE", reason: "NO_TRANSPORT_COST" };
    d.location.transport = { status: "UNRESOLVED", override: monthly("0") };
    const r = pipeline(c, d);
    expect(r.comparison.completeness).toBe("COMPLETE");
    expect(r.comparison.householdCostComparison.delta).toEqual(zero);
    expect(r.ranking.completeness).toBe("PARTIAL");
    expect(r.ranking.excludedCategories.map((r) => r.category)).toEqual(["transport"]);
    expect(r.comparison.categoryComparisons.find((r) => r.category === "transport")).not.toHaveProperty("delta");
    reconcileSolver(r.solver, d);
  });

  it("carries invalid input through every downstream layer without business-rule exceptions", () => {
    const invalid = engine.calculateScenario(evidence, { location: { income: { grossAnnualSalaryGbp: -1 } } });
    const comparison = engine.compareScenarios(invalid, invalid), ranking = engine.rankCostDrivers(comparison);
    expect(invalid.status).toBe("INVALID_INPUT");
    expect(comparison.completeness).toBe("UNRESOLVED");
    expect(ranking.rankedCategoryCount).toBe(0);
    expect(ranking.excludedCategoryCount).toBe(8);
    expect(engine.solveSalaryPreservation(evidence, invalid, invalid).status).toBe("INELIGIBLE");
    expect(comparison.diagnostics.filter((d) => d.code === "INVALID_INPUT").map((d) => d.scenarioRole)).toEqual(expect.arrayContaining(["current", "destination"]));
  });

  it("keeps pinned release identity and category-specific periods through the full pipeline", () => {
    const fixture = acceptanceFixtures()[0];
    const { c, d, comparison, ranking, solver } = pipeline(fixture.current, fixture.destination);
    expect(comparison.dataReleaseMetadata).toEqual({ current: evidence.metadata, destination: evidence.metadata });
    expect(ranking.dataReleaseMetadata).toBe(comparison.dataReleaseMetadata);
    expect(solver).toHaveProperty("lineage.current.releases", evidence.metadata);
    expect(solver).toHaveProperty("lineage.destination.releases", evidence.metadata);
    expect(evidence.metadata.datasets.map((r) => [r.dataset, r.sourcePeriod])).toEqual(expect.arrayContaining([
      ["rent", "2026-07"], ["incomeTax", "2026/27"], ["groceries", "FYE 2024"], ["householdSpending", "FYE 2025"], ["transport", "Current fare verified 2026-09-14"],
    ]));
    for (const s of [c, d]) {
      expect(s).not.toHaveProperty("scenarioDataDate");
      expect(s).not.toHaveProperty("dataDate");
    }
  });

  it("exposes intended entry points without leaking calculator stubs or salary-search internals", () => {
    for (const name of ["calculateScenario", "calculateNetEmploymentIncome", "calculateHouseholdMonthlyCosts", "compareScenarios", "rankCostDrivers", "evaluateSalaryPreservationEligibility", "solveSalaryPreservation"] as const) expect(typeof engine[name]).toBe("function");
    for (const name of ["unsupportedCategory", "supportsBlockSearch", "salaryText", "moneyAt", "activeDatasets"]) expect(engine).not.toHaveProperty(name);
    expect(engine.scenarioInputSchema.safeParse(completeInput()).success).toBe(true);
  });
});
