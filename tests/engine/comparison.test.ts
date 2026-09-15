import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  calculateScenario, compareScenarios, createEvidenceLoader, fromGbp, addMoney, multiplyMoney, subtractMoney,
  requiredHouseholdCostCategories, diagnosticSchema,
  type ScenarioInput, type ScenarioCalculationResult,
} from "@/engine";
const loader = createEvidenceLoader();
const monthly = (amountGbp: string) => ({ amountGbp, period: "MONTHLY" as const });
function input(net = "3000", rent = "1105"): ScenarioInput {
  return {
    household: { adults: 1, children: 0 },
    location: {
      cityId: "LOC-MAN", effectiveOn: "2026-09-14",
      income: { netMonthlyIncomeOverride: monthly(net) },
      housing: { bedrooms: 2, rentSourceMonth: "2026-07", overrides: { rent: monthly(rent), councilTax: monthly("170"), energy: monthly("120"), water: monthly("55") } },
      spending: { groceries: monthly("300"), essentials: monthly("80"), lifestyle: monthly("100") },
      transport: { status: "UNRESOLVED", override: monthly("70") },
    },
  };
}
const scenario = (q: ScenarioInput) => calculateScenario(loader, q);
function employment(q: ScenarioInput, gross = "50000") {
  q.location.income = { grossAnnualSalaryGbp: gross, taxJurisdiction: "rUK", taxYear: "2026/27", niCategory: "A", scope: "ONE_EMPLOYEE_ONE_EMPLOYMENT", calculationBasis: "ANNUAL_COMPARISON" };
  return q;
}
function noCosts(net?: string) {
  const q = input();
  q.location.cityId = "LOC-EDI";
  q.location.housing.overrides = {};
  q.location.spending = {};
  q.location.transport = { status: "UNRESOLVED" };
  q.location.income = net === undefined ? {} : { netMonthlyIncomeOverride: monthly(net) };
  return q;
}
function category(current: ScenarioCalculationResult, destination: ScenarioCalculationResult, name: string) {
  return compareScenarios(current, destination).categoryComparisons.find((c) => c.category === name)!;
}

describe("effective take-home comparison", () => {
  it("compares both calculated incomes without repeating employment calculations", () => {
    const a = scenario(employment(input(), "30000")), b = scenario(employment(input(), "50000"));
    const r = compareScenarios(a, b).takeHomeComparison;
    expect(r.completeness).toBe("COMPLETE");
    expect(r).toHaveProperty("delta", fromGbp("1200"));
    expect(r.overrideStatus).toEqual({ current: "NONE", destination: "NONE" });
    expect(r.current).toHaveProperty("result.classification", "CALCULATED");
    expect(r.destination).toHaveProperty("result.classification", "CALCULATED");
  });
  it("preserves calculated versus overridden classifications and the baseline", () => {
    const a = scenario(employment(input()));
    const q = employment(input()); q.location.income.netMonthlyIncomeOverride = monthly("3400");
    const b = scenario(q), r = compareScenarios(a, b).takeHomeComparison;
    expect(r).toHaveProperty("delta", fromGbp("106.70"));
    expect(r).toHaveProperty("classification", "CALCULATED");
    expect(r.overrideStatus).toEqual({ current: "NONE", destination: "USER_OVERRIDE" });
    expect(r.current).toHaveProperty("result.classification", "CALCULATED");
    expect(r.destination).toHaveProperty("result.classification", "USER_ENTERED");
    expect(r.destination).toHaveProperty("result.baselineIncome.status", "AVAILABLE");
  });
  it.each([["3200", "200", "INCREASE"], ["2800", "-200", "DECREASE"], ["3000", "0", "NO_CHANGE"]])("two overrides to £%s retain exact sign and neutral direction", (net, amount, direction) => {
    const r = compareScenarios(scenario(input()), scenario(input(net))).takeHomeComparison;
    expect(r).toMatchObject({ completeness: "COMPLETE", delta: fromGbp(amount), direction, classification: "CALCULATED" });
    expect(r.overrideStatus).toEqual({ current: "USER_OVERRIDE", destination: "USER_OVERRIDE" });
  });
  it.each(["current", "destination"] as const)("emits no take-home delta for unresolved %s income", (role) => {
    const q = input(); q.location.income = {};
    const invalid = scenario(q), valid = scenario(input());
    const r = role === "current" ? compareScenarios(invalid, valid) : compareScenarios(valid, invalid);
    expect(r.takeHomeComparison.completeness).toBe("UNRESOLVED");
    expect(r.takeHomeComparison).not.toHaveProperty("delta");
    expect(r.takeHomeComparison).not.toHaveProperty("currentAmount");
    expect(r.householdCostComparison.completeness).toBe("COMPLETE");
    expect(r.completeness).toBe("PARTIAL");
  });
  it("allows explicit zero take-home without treating it as missing", () => {
    expect(compareScenarios(scenario(input("0")), scenario(input("10"))).takeHomeComparison).toHaveProperty("delta", fromGbp("10"));
  });
});

describe("complete totals and residuals", () => {
  it("implements the complete £200 / £400 / -£200 example", () => {
    const a = scenario(input()), b = scenario(input("3200", "1505"));
    const r = compareScenarios(a, b);
    expect(r.completeness).toBe("COMPLETE");
    expect(r.deltaConvention).toBe("DESTINATION_MINUS_CURRENT");
    expect(r.householdCostComparison).toMatchObject({ currentAmount: fromGbp("2000"), destinationAmount: fromGbp("2400"), delta: fromGbp("400"), direction: "INCREASE", classification: "CALCULATED" });
    expect(r.takeHomeComparison).toHaveProperty("delta", fromGbp("200"));
    expect(r.residualComparison).toMatchObject({ currentAmount: fromGbp("1000"), destinationAmount: fromGbp("800"), delta: fromGbp("-200"), direction: "DECREASE" });
    expect(r.current).toBe(a); expect(r.destination).toBe(b);
    expect(r.unresolvedDifferences.metrics).toEqual([]);
  });
  it.each([["1205", "100", "INCREASE"], ["1005", "-100", "DECREASE"], ["1105", "0", "NO_CHANGE"]])("household rent £%s gives cost delta %s", (rent, delta, direction) => {
    const r = compareScenarios(scenario(input()), scenario(input("3000", rent)));
    expect(r.householdCostComparison).toMatchObject({ delta: fromGbp(delta), direction, classification: "CALCULATED" });
  });
  it.each([
    ["3000", "2750", "1000", "750", "-250"],
    ["1800", "1900", "-200", "-100", "100"],
    ["2100", "1800", "100", "-200", "-300"],
    ["1800", "2100", "-200", "100", "300"],
  ])("preserves residual transitions £%s → £%s", (a, b, current, destination, delta) => {
    const r = compareScenarios(scenario(input(a)), scenario(input(b))).residualComparison;
    expect(r).toMatchObject({ completeness: "COMPLETE", currentAmount: fromGbp(current), destinationAmount: fromGbp(destination), delta: fromGbp(delta) });
  });
});

describe("partial comparisons never subtract arbitrary subsets", () => {
  it.each(["current", "destination"] as const)("complete versus partial %s has no cost or residual delta", (role) => {
    const q = input(); delete q.location.housing.overrides.energy;
    const partial = scenario(q), complete = scenario(input());
    const r = role === "current" ? compareScenarios(partial, complete) : compareScenarios(complete, partial);
    expect(r.completeness).toBe("PARTIAL");
    expect(r.takeHomeComparison.completeness).toBe("COMPLETE");
    for (const metric of [r.householdCostComparison, r.residualComparison]) {
      expect(metric.completeness).toBe("PARTIAL"); expect(metric).not.toHaveProperty("delta"); expect(metric).not.toHaveProperty("direction");
    }
    expect(r.residualComparison[role]).toHaveProperty("result.partialResidualAfterResolvedCosts");
    expect(r.unresolvedDifferences.metrics).toEqual(["household_cost", "residual"]);
  });
  it("keeps different resolved sets separate rather than subtracting their subtotals", () => {
    const a = noCosts("3000"), b = noCosts("3000");
    a.location.housing.overrides = { rent: monthly("1500"), councilTax: monthly("170"), water: monthly("55") };
    b.location.housing.overrides = { rent: monthly("1500"), councilTax: monthly("170") };
    b.location.spending.groceries = monthly("300");
    const r = compareScenarios(scenario(a), scenario(b));
    expect(r.householdCostComparison.current).toHaveProperty("result.resolvedSubtotalMonthly", fromGbp("1725"));
    expect(r.householdCostComparison.destination).toHaveProperty("result.resolvedSubtotalMonthly", fromGbp("1970"));
    expect(r.householdCostComparison).not.toHaveProperty("delta");
    expect(r.residualComparison).not.toHaveProperty("delta");
    expect(r.categoryComparisons.find((c) => c.category === "rent")).toHaveProperty("delta", fromGbp("0"));
    expect(r.unresolvedDifferences.currentUnresolvedCategories).toContain("groceries");
    expect(r.unresolvedDifferences.destinationUnresolvedCategories).toContain("water");
  });
  it("also withholds partial-total and partial-residual deltas for matching sets", () => {
    const a = noCosts("3000"), b = noCosts("3200");
    a.location.housing.overrides.rent = monthly("1500"); b.location.housing.overrides.rent = monthly("1800");
    const r = compareScenarios(scenario(a), scenario(b));
    expect(r.householdCostComparison.completeness).toBe("PARTIAL");
    expect(r.householdCostComparison).not.toHaveProperty("delta");
    expect(r.residualComparison).not.toHaveProperty("delta");
    expect(r.categoryComparisons.find((c) => c.category === "rent")).toHaveProperty("delta", fromGbp("300"));
  });
  it("no subtotal on either side makes that metric unresolved", () => {
    const r = compareScenarios(scenario(noCosts("3000")), scenario(input()));
    expect(r.takeHomeComparison.completeness).toBe("COMPLETE");
    expect(r.householdCostComparison.completeness).toBe("UNRESOLVED");
    expect(r.residualComparison.completeness).toBe("UNRESOLVED");
  });
});

describe("raw category comparisons and N/A policy", () => {
  it.each(requiredHouseholdCostCategories)("retains both %s sides and calculated zero delta", (name) => {
    const a = scenario(input()), b = scenario(input());
    const r = category(a, b, name);
    expect(r).toMatchObject({ completeness: "COMPLETE", delta: fromGbp("0"), direction: "NO_CHANGE", classification: "CALCULATED" });
    expect(r.current).toHaveProperty("result.classification", "USER_ENTERED");
    expect(r.current).toHaveProperty("result.baselineEvidence");
    expect(r.destination).toHaveProperty("result.evidenceLineage");
  });
  it("compares observed Manchester rent to a London override retaining geography", () => {
    const a = input(); delete a.location.housing.overrides.rent;
    const b = input("3000", "1800"); b.location.cityId = "LOC-LON";
    const r = category(scenario(a), scenario(b), "rent");
    expect(r).toHaveProperty("delta", fromGbp("573"));
    expect(r.current).toHaveProperty("result.classification", "OBSERVED_DATA");
    expect(r.destination).toHaveProperty("result.classification", "USER_ENTERED");
    expect(r.current).toHaveProperty("result.evidenceLineage.0.geography.official.code", "E08000003");
    expect(r.destination).toHaveProperty("result.evidenceLineage.0.geography.official.code", "E12000007");
  });
  it("compares derived council-tax amounts and explicit energy overrides", () => {
    const a = input(), b = input();
    delete a.location.housing.overrides.councilTax; delete b.location.housing.overrides.councilTax;
    a.location.housing.councilTax = { authorityName: "Manchester", band: "D" };
    b.location.cityId = "LOC-GLA"; b.location.housing.councilTax = { authorityName: "Glasgow City", band: "D" };
    b.location.housing.overrides.energy = monthly("130");
    const r = compareScenarios(scenario(a), scenario(b));
    const council = r.categoryComparisons.find((c) => c.category === "council_tax")!;
    expect(council.completeness).toBe("COMPLETE");
    if (council.completeness !== "COMPLETE") throw new Error("expected complete");
    expect(multiplyMoney(council.delta, BigInt(12))).toEqual(fromGbp("-606.04"));
    expect(council.current).toHaveProperty("result.classification", "CALCULATED");
    expect(r.categoryComparisons.find((c) => c.category === "energy")).toHaveProperty("delta", fromGbp("10"));
  });
  it("does not treat an unresolved category as zero", () => {
    const a = input(); delete a.location.housing.overrides.energy;
    const r = category(scenario(a), scenario(input()), "energy");
    expect(r.completeness).toBe("UNRESOLVED"); expect(r).not.toHaveProperty("delta");
    expect(r.diagnostics[0]).toMatchObject({ currentState: "UNRESOLVED", destinationState: "RESOLVED", category: "energy" });
  });
  it("both N/A is neutral without a monetary delta", () => {
    const a = input(); a.location.transport = { status: "NOT_APPLICABLE", reason: "NO_TRANSPORT_COST" };
    const r = compareScenarios(scenario(a), scenario(a));
    const transport = r.categoryComparisons.find((c) => c.category === "transport")!;
    expect(transport.completeness).toBe("NOT_APPLICABLE"); expect(transport).not.toHaveProperty("delta");
    expect(r.completeness).toBe("COMPLETE");
  });
  it.each(["current", "destination"] as const)("one %s N/A stays distinct from a resolved amount", (role) => {
    const q = input(); q.location.transport = { status: "NOT_APPLICABLE", reason: "NO_TRANSPORT_COST" };
    const na = scenario(q), resolved = scenario(input());
    const r = role === "current" ? compareScenarios(na, resolved) : compareScenarios(resolved, na);
    expect(r.categoryComparisons.find((c) => c.category === "transport")?.completeness).toBe("UNRESOLVED");
    expect(r.categoryComparisons.find((c) => c.category === "transport")).not.toHaveProperty("delta");
    // The independently COMPLETE household totals are still comparable.
    expect(r.householdCostComparison.completeness).toBe("COMPLETE");
    expect(r.unresolvedDifferences.categories).toContain("transport");
  });
});

describe("top-level completeness, invalid input and no fallback", () => {
  it("category deltas alone do not make a core comparison complete or partial", () => {
    const a = noCosts(), b = noCosts();
    a.location.housing.overrides.rent = monthly("1500"); b.location.housing.overrides.rent = monthly("1800");
    const r = compareScenarios(scenario(a), scenario(b));
    expect(r.completeness).toBe("UNRESOLVED");
    expect(r.categoryComparisons.find((c) => c.category === "rent")).toHaveProperty("delta", fromGbp("300"));
    expect(r.unresolvedDifferences.metrics).toHaveLength(3);
  });
  it.each(["current", "destination"] as const)("invalid %s scenario retains validation errors and no deltas", (role) => {
    const invalid = calculateScenario(loader, null), valid = scenario(input());
    const r = role === "current" ? compareScenarios(invalid, valid) : compareScenarios(valid, invalid);
    expect(r.completeness).toBe("UNRESOLVED");
    expect(r.takeHomeComparison).not.toHaveProperty("delta");
    expect(r.householdCostComparison).not.toHaveProperty("delta");
    expect(r.residualComparison).not.toHaveProperty("delta");
    expect(r.dataReleaseMetadata[role]).toBeNull();
    expect(r.diagnostics.some((d) => d.code === "INVALID_INPUT" && d.scenarioRole === role)).toBe(true);
  });
  it("preserves Edinburgh rent, London council and energy/transport gaps", () => {
    const a = noCosts("3000"), b = noCosts("3000"); b.location.cityId = "LOC-LON";
    const r = compareScenarios(scenario(a), scenario(b));
    for (const name of ["rent", "council_tax", "energy", "transport"]) {
      const c = r.categoryComparisons.find((c) => c.category === name)!;
      expect(c.completeness).toBe("UNRESOLVED"); expect(c).not.toHaveProperty("delta");
    }
    expect(r.diagnostics.some((d) => d.code === "EDINBURGH_RENT_SOURCE_UNRESOLVED" && d.scenarioRole === "current")).toBe(true);
    expect(r.diagnostics.some((d) => d.code === "LONDON_CITY_DEFAULT_UNRESOLVED" && d.scenarioRole === "destination")).toBe(true);
  });
});

describe("exactness, roles and evidence preservation", () => {
  it("reconciles every complete metric, reverses signs and does not rank categories", () => {
    const a = scenario(input()), b = scenario(input("3200", "1505"));
    const r = compareScenarios(a, b), reversed = compareScenarios(b, a);
    for (const name of ["takeHomeComparison", "householdCostComparison", "residualComparison"] as const) {
      const m = r[name], n = reversed[name];
      if (m.completeness !== "COMPLETE" || n.completeness !== "COMPLETE") throw new Error("expected complete");
      expect(addMoney(m.delta, m.currentAmount)).toEqual(m.destinationAmount);
      expect(addMoney(m.delta, n.delta)).toEqual(fromGbp("0"));
    }
    expect(r.categoryComparisons.map((c) => c.category)).toEqual(requiredHouseholdCostCategories);
  });
  it("preserves fractional pennies from income and weekly transport", () => {
    const a = employment(input(), "12570"), b = employment(input(), "12570.01");
    a.location.cityId = b.location.cityId = "LOC-LON";
    b.location.transport = { status: "SELECTED", productId: "SRC-TFL:tfl:seven-day:2026-09" };
    const r = compareScenarios(scenario(a), scenario(b));
    if (r.takeHomeComparison.completeness !== "COMPLETE" || r.householdCostComparison.completeness !== "COMPLETE" || r.residualComparison.completeness !== "COMPLETE") throw new Error("expected complete");
    expect(multiplyMoney(r.takeHomeComparison.delta, BigInt(12))).toEqual(fromGbp("0.0072"));
    expect(multiplyMoney(r.householdCostComparison.delta, BigInt(12))).toEqual(fromGbp("444.40"));
    expect(r.residualComparison.delta).toEqual(subtractMoney(r.takeHomeComparison.delta, r.householdCostComparison.delta));
    expect(multiplyMoney(r.residualComparison.delta, BigInt(12))).toEqual(fromGbp("-444.3928"));
  });
  it("retains each release/lineage and never mutates either scenario", () => {
    const a = scenario(input()), b = scenario(employment(input()));
    const beforeA = structuredClone(a), beforeB = structuredClone(b);
    const r = compareScenarios(a, b);
    expect(a).toEqual(beforeA); expect(b).toEqual(beforeB);
    expect(compareScenarios(a, b)).toEqual(r);
    if (a.status !== "EVALUATED" || b.status !== "EVALUATED") throw new Error("expected evaluated");
    expect(r.dataReleaseMetadata.current).toBe(a.dataReleaseMetadata);
    expect(r.dataReleaseMetadata.destination).toBe(b.dataReleaseMetadata);
    expect(r.current).toHaveProperty("evidenceLineage", a.evidenceLineage);
    expect(r).not.toHaveProperty("comparisonDataDate");
    expect(() => JSON.stringify(r)).not.toThrow();
    for (const d of r.diagnostics) expect(diagnosticSchema.safeParse(d).success).toBe(true);
  });
  it("comparison implementation has no calculator calls, loader or artifact imports", () => {
    const code = readFileSync("src/engine/comparison/index.ts", "utf8");
    expect(code).not.toMatch(/from ["'][^"']*(?:calculators|loaders|generated)[^"']*["']/);
    expect(code).not.toMatch(/calculate(?:Scenario|IncomeTax|EmployeeNi|HouseholdMonthlyCosts)\s*\(/);
  });
});
