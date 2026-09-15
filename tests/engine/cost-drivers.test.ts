import { describe, expect, it } from "vitest";
import {
  rankCostDrivers, compareScenarios, calculateScenario, createEvidenceLoader, requiredHouseholdCostCategories,
  fromGbp, absoluteMoney, subtractMoney, diagnosticSchema,
  type ScenarioInput, type HouseholdCostCategory, type ScenarioComparisonResult,
} from "@/engine";
const loader = createEvidenceLoader();
const monthly = (amountGbp: string) => ({ amountGbp, period: "MONTHLY" as const });
function input(): ScenarioInput {
  return { household: { adults: 1, children: 0 }, location: {
    cityId: "LOC-MAN", effectiveOn: "2026-09-14", income: { netMonthlyIncomeOverride: monthly("3000") },
    housing: { bedrooms: 2, rentSourceMonth: "2026-07", overrides: { rent: monthly("1000"), councilTax: monthly("1000"), energy: monthly("1000"), water: monthly("1000") } },
    spending: { groceries: monthly("1000"), essentials: monthly("1000"), lifestyle: monthly("1000") },
    transport: { status: "UNRESOLVED", override: monthly("1000") },
  } };
}
function set(q: ScenarioInput, category: HouseholdCostCategory, amount: string) {
  if (category === "transport") q.location.transport = { status: "UNRESOLVED", override: monthly(amount) };
  else if (category === "groceries" || category === "essentials" || category === "lifestyle") q.location.spending[category] = monthly(amount);
  else q.location.housing.overrides[category === "council_tax" ? "councilTax" : category] = monthly(amount);
}
const comparison = (a = input(), b = input()) => compareScenarios(calculateScenario(loader, a), calculateScenario(loader, b));
function noCosts() {
  const q = input(); q.location.cityId = "LOC-EDI"; q.location.housing.overrides = {}; q.location.spending = {}; q.location.transport = { status: "UNRESOLVED" }; return q;
}
// Contract fixtures for fractional-pence deltas. These are arithmetic test values, not new fare/source observations.
function fractional(c: ScenarioComparisonResult, category: HouseholdCostCategory, delta: string) {
  const supplied = c.categoryComparisons.find((r) => r.category === category)!;
  if (supplied.completeness !== "COMPLETE" || supplied.destination.status !== "AVAILABLE" || supplied.destination.result.status !== "RESOLVED") throw new Error("fixture");
  const amount = fromGbp(delta);
  const destination = supplied.destination;
  return { ...c, categoryComparisons: c.categoryComparisons.map((r) => r !== supplied ? r : {
    ...supplied, currentAmount: fromGbp("0"), destinationAmount: amount, delta: amount, direction: "INCREASE" as const,
    current: supplied.current.status === "AVAILABLE" ? { ...supplied.current, result: { ...supplied.current.result, monthlyAmount: fromGbp("0") } } : supplied.current,
    destination: { ...destination, result: { ...destination.result, monthlyAmount: amount } },
  }) } as ScenarioComparisonResult;
}

describe("complete cost-driver ranking and views", () => {
  it("ranks signed +300/-120/+50/zero by absolute impact and retains ranks", () => {
    const b = input(); set(b, "rent", "1300"); set(b, "transport", "880"); set(b, "council_tax", "1050");
    const r = rankCostDrivers(comparison(input(), b));
    expect(r.completeness).toBe("COMPLETE");
    expect(r.scope).toBe("ALL_HOUSEHOLD_CATEGORIES");
    expect(r.rankedByAbsoluteImpact.slice(0, 3).map((d) => [d.category, d.rank, d.direction])).toEqual([["rent", 1, "INCREASE"], ["transport", 2, "DECREASE"], ["council_tax", 3, "INCREASE"]]);
    expect(r.rankedByAbsoluteImpact[1]).toMatchObject({ deltaMonthly: fromGbp("-120"), absoluteImpactMonthly: fromGbp("120"), classification: "CALCULATED" });
    expect(r.increases.map((d) => d.category)).toEqual(["rent", "council_tax"]);
    expect(r.decreases.map((d) => d.category)).toEqual(["transport"]);
    expect(r.unchanged.map((d) => d.category)).toEqual(["energy", "water", "groceries", "essentials", "lifestyle"]);
    expect(r.unchanged.every((d) => !d.meaningfulChange)).toBe(true);
    expect([r.totalRelevantCategories, r.rankedCategoryCount, r.excludedCategoryCount, r.unchangedCategoryCount, r.meaningfulDriverCount]).toEqual([8, 8, 0, 5, 3]);
  });
  it("preserves the four-category example when the other categories are unavailable", () => {
    const a = noCosts(), b = noCosts();
    for (const c of ["rent", "transport", "council_tax", "water"] as const) set(a, c, "1000");
    set(b, "rent", "1300"); set(b, "transport", "880"); set(b, "council_tax", "1050"); set(b, "water", "1000");
    const r = rankCostDrivers(comparison(a, b));
    expect(r.completeness).toBe("PARTIAL");
    expect(r.rankedByAbsoluteImpact.map((d) => [d.category, d.rank])).toEqual([["rent", 1], ["transport", 2], ["council_tax", 3], ["water", 4]]);
  });
  it("sorts increases descending and uses canonical ties", () => {
    const b = input(); set(b, "water", "1200"); set(b, "energy", "1100"); set(b, "rent", "1100"); set(b, "transport", "900");
    const r = rankCostDrivers(comparison(input(), b));
    expect(r.increases.map((d) => d.category)).toEqual(["water", "rent", "energy"]);
    expect(r.increases.every((d) => d.direction === "INCREASE")).toBe(true);
    expect(r.rankedByAbsoluteImpact.slice(1, 4).map((d) => d.category)).toEqual(["rent", "energy", "transport"]);
  });
  it("sorts savings by magnitude, not signed ascending/descending accident", () => {
    const b = input(); set(b, "transport", "800"); set(b, "water", "975"); set(b, "rent", "1100");
    const r = rankCostDrivers(comparison(input(), b));
    expect(r.decreases.map((d) => [d.category, d.deltaMonthly])).toEqual([["transport", fromGbp("-200")], ["water", fromGbp("-25")]]);
    expect(r.decreases[0]).toBe(r.rankedByAbsoluteImpact[0]);
  });
  it("canonical ties do not depend on the incoming comparison array order", () => {
    const b = input(); set(b, "rent", "1100"); set(b, "energy", "900");
    const c = comparison(input(), b);
    const shuffled = { ...c, categoryComparisons: [...c.categoryComparisons].reverse() };
    expect(rankCostDrivers(shuffled)).toEqual(rankCostDrivers(c));
    expect(rankCostDrivers(c).rankedByAbsoluteImpact.slice(0, 2).map((d) => d.category)).toEqual(["rent", "energy"]);
  });
  it("all zero deltas are complete coverage with no meaningful changes", () => {
    const r = rankCostDrivers(comparison());
    expect(r.completeness).toBe("COMPLETE");
    expect(r.rankedByAbsoluteImpact.map((d) => d.category)).toEqual(requiredHouseholdCostCategories);
    expect(r.unchangedCategoryCount).toBe(8); expect(r.meaningfulDriverCount).toBe(0);
    expect(r.increases).toEqual([]); expect(r.decreases).toEqual([]);
  });
});

describe("exclusions and independent ranking completeness", () => {
  it("keeps unresolved destination energy explicitly excluded", () => {
    const b = input(); delete b.location.housing.overrides.energy;
    const c = comparison(input(), b), r = rankCostDrivers(c);
    expect(r.completeness).toBe("PARTIAL"); expect(r.scope).toBe("COMPARABLE_CATEGORIES_ONLY");
    expect(r.rankedCategoryCount).toBe(7); expect(r.excludedCategoryCount).toBe(1);
    const gap = r.excludedCategories[0];
    expect(gap).toMatchObject({ category: "energy", comparisonState: "UNRESOLVED", currentState: "RESOLVED", destinationState: "UNRESOLVED", reason: "COMPARISON_NOT_COMPLETE" });
    expect(gap.comparisons[0].destination).toHaveProperty("result.diagnostics.0.code", "ENERGY_MODEL_REQUIRED");
    expect(r.rankedByAbsoluteImpact.some((d) => d.category === "energy")).toBe(false);
    expect(r.diagnostics.some((d) => d.code === "COST_DRIVER_RANKING_PARTIAL")).toBe(true);
    expect(c.completeness).toBe("PARTIAL");
  });
  it("all unavailable categories yield empty rankings and eight exclusions", () => {
    const r = rankCostDrivers(comparison(noCosts(), noCosts()));
    expect(r.completeness).toBe("UNRESOLVED"); expect(r.scope).toBe("NO_COMPARABLE_CATEGORIES");
    expect(r.rankedByAbsoluteImpact).toEqual([]); expect(r.increases).toEqual([]); expect(r.decreases).toEqual([]); expect(r.unchanged).toEqual([]);
    expect(r.excludedCategories.map((d) => d.category)).toEqual(requiredHouseholdCostCategories);
    expect(r.excludedCategoryCount).toBe(8);
  });
  it("N/A is an explicit coverage exclusion, never an unchanged driver", () => {
    const q = input(); q.location.transport = { status: "NOT_APPLICABLE", reason: "NO_TRANSPORT_COST" };
    const c = comparison(q, q), r = rankCostDrivers(c);
    expect(c.completeness).toBe("COMPLETE"); expect(r.completeness).toBe("PARTIAL");
    expect(r.excludedCategories[0]).toMatchObject({ category: "transport", comparisonState: "NOT_APPLICABLE", currentState: "NOT_APPLICABLE", destinationState: "NOT_APPLICABLE" });
    expect(r.unchangedCategoryCount).toBe(7);
  });
  it("ranking can be complete while core comparison is partial due to missing income", () => {
    const a = input(); a.location.income = {};
    const c = comparison(a, input()), r = rankCostDrivers(c);
    expect(c.completeness).toBe("PARTIAL"); expect(r.comparisonCompleteness).toBe("PARTIAL");
    expect(r.completeness).toBe("COMPLETE"); expect(c.completeness).toBe("PARTIAL");
  });
  it("does not depend on household total or residual completeness", () => {
    const a = noCosts(), b = noCosts(); a.location.income = {}; b.location.income = {};
    set(a, "rent", "1000"); set(b, "rent", "1300");
    const c = comparison(a, b), r = rankCostDrivers(c);
    expect(c.completeness).toBe("UNRESOLVED"); expect(r.completeness).toBe("PARTIAL");
    expect(r.rankedByAbsoluteImpact[0].deltaMonthly).toEqual(fromGbp("300"));
    expect(c.householdCostComparison).not.toHaveProperty("delta");
  });
  it("preserves Edinburgh rent and London council/energy/transport exclusions", () => {
    const a = noCosts(), b = noCosts(); b.location.cityId = "LOC-LON";
    const r = rankCostDrivers(comparison(a, b));
    for (const category of ["rent", "council_tax", "energy", "transport"]) expect(r.excludedCategories.some((c) => c.category === category)).toBe(true);
    expect(r.rankedByAbsoluteImpact).toEqual([]);
    expect(r.excludedCategories.find((c) => c.category === "rent")?.comparisons[0].current).toHaveProperty("result.diagnostics.0.code", "EDINBURGH_RENT_SOURCE_UNRESOLVED");
  });
  it("missing or duplicate category comparisons are excluded without silently choosing one", () => {
    const c = comparison();
    for (const categoryComparisons of [c.categoryComparisons.slice(1), [...c.categoryComparisons, c.categoryComparisons[0]]]) {
      const r = rankCostDrivers({ ...c, categoryComparisons });
      expect(r.excludedCategories[0]).toMatchObject({ category: "rent", reason: "COMPARISON_MISSING_OR_AMBIGUOUS" });
      expect(r.rankedCategoryCount).toBe(7);
    }
  });
  it("rejects inconsistent complete deltas as excluded rather than ranking them", () => {
    const c = comparison();
    const malformed = { ...c, categoryComparisons: c.categoryComparisons.map((d) => d.category === "rent" ? { ...d, delta: fromGbp("999") } : d) } as ScenarioComparisonResult;
    const r = rankCostDrivers(malformed);
    expect(r.excludedCategories[0].reason).toBe("INVALID_COMPLETE_COMPARISON");
    expect(r.rankedByAbsoluteImpact.some((d) => d.category === "rent")).toBe(false);
  });
});

describe("exact money and mixed evidence lineage", () => {
  it.each(["10.005", "-10.005", "0"])("absoluteMoney retains exact magnitude of %s", (value) => {
    expect(absoluteMoney(fromGbp(value))).toEqual(fromGbp(value.replace("-", "")));
  });
  it("orders £10.005 above £10.004 without float conversion", () => {
    const c = fractional(fractional(comparison(), "rent", "10.004"), "transport", "10.005");
    const r = rankCostDrivers(c);
    expect(r.rankedByAbsoluteImpact.slice(0, 2).map((d) => d.category)).toEqual(["transport", "rent"]);
    expect(r.rankedByAbsoluteImpact[0].absoluteImpactMonthly).toEqual(fromGbp("10.005"));
  });
  it("distinguishes subpenny impacts above JavaScript's safe integer range", () => {
    const c = fractional(fractional(comparison(), "rent", "10000000000000000.001"), "transport", "10000000000000000.002");
    expect(rankCostDrivers(c).rankedByAbsoluteImpact[0].category).toBe("transport");
  });
  it("retains USER_ENTERED energy sides with a calculated +£60 driver", () => {
    const a = input(), b = input(); set(a, "energy", "120"); set(b, "energy", "180");
    const d = rankCostDrivers(comparison(a, b)).increases[0];
    expect(d).toMatchObject({ category: "energy", deltaMonthly: fromGbp("60"), classification: "CALCULATED", currentClassification: "USER_ENTERED", destinationClassification: "USER_ENTERED", currentResolutionSource: "USER_OVERRIDE", destinationResolutionSource: "USER_OVERRIDE" });
  });
  it("retains observed rent and calculated council tax versus overrides", () => {
    const a = input(), b = input(); delete a.location.housing.overrides.rent; delete a.location.housing.overrides.councilTax;
    a.location.housing.councilTax = { authorityName: "Manchester", band: "D" };
    const r = rankCostDrivers(comparison(a, b));
    const rent = r.rankedByAbsoluteImpact.find((d) => d.category === "rent")!;
    const council = r.rankedByAbsoluteImpact.find((d) => d.category === "council_tax")!;
    expect(rent.currentClassification).toBe("OBSERVED_DATA"); expect(rent.destinationClassification).toBe("USER_ENTERED");
    expect(rent.comparison.current).toHaveProperty("result.evidenceLineage.0.geography.official.code", "E08000003");
    expect(council.currentClassification).toBe("CALCULATED"); expect(council.destinationClassification).toBe("USER_ENTERED");
    expect(council.comparison.current).toHaveProperty("result.formula.expression", "annualGbp / 12");
    expect(council.deltaMonthly).toEqual(subtractMoney(council.destinationMonthlyAmount, council.currentMonthlyAmount));
  });
  it("is deterministic, preserves input order and metadata, and emits valid diagnostics", () => {
    const b = input(); delete b.location.housing.overrides.energy;
    const c = comparison(input(), b), before = structuredClone(c);
    const r = rankCostDrivers(c);
    expect(c).toEqual(before); expect(rankCostDrivers(c)).toEqual(r);
    expect(r.dataReleaseMetadata).toBe(c.dataReleaseMetadata);
    expect(c.categoryComparisons.map((d) => d.category)).toEqual(requiredHouseholdCostCategories);
    for (const d of r.diagnostics) expect(diagnosticSchema.safeParse(d).success).toBe(true);
    expect(() => JSON.stringify(r)).not.toThrow();
    expect(r.rankedByAbsoluteImpact.every((d) => requiredHouseholdCostCategories.includes(d.category))).toBe(true);
  });
});
