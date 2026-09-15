import { describe, expect, it } from "vitest";
import {
  calculateScenario, calculateNetEmploymentIncome, calculateHouseholdMonthlyCosts, createEvidenceLoader,
  normalizeCalculatorInput, scenarioInputSchema, fromGbp, addMoney, multiplyMoney, subtractMoney,
  diagnosticSchema, type ScenarioInput, type EvaluatedScenario,
} from "@/engine";

const loader = createEvidenceLoader();
const monthly = (amountGbp: string) => ({ amountGbp, period: "MONTHLY" as const });
function input(cityId: ScenarioInput["location"]["cityId"] = "LOC-MAN"): ScenarioInput {
  return {
    household: { adults: 2, children: 0 },
    location: {
      cityId, effectiveOn: "2026-09-14",
      housing: { bedrooms: 2, rentSourceMonth: "2026-07", overrides: {} },
      income: { grossAnnualSalaryGbp: "50000", calculationBasis: "ANNUAL_COMPARISON", scope: "ONE_EMPLOYEE_ONE_EMPLOYMENT", taxYear: "2026/27", taxJurisdiction: "rUK", niCategory: "A", payPeriod: "monthly" },
      transport: { status: "UNRESOLVED" }, spending: {},
    },
  };
}
function complete(): ScenarioInput {
  const q = input();
  q.location.housing.overrides = { rent: monthly("1500"), councilTax: monthly("170"), energy: monthly("120"), water: monthly("55") };
  q.location.spending = { groceries: monthly("300"), essentials: monthly("80"), lifestyle: monthly("100") };
  q.location.transport = { status: "UNRESOLVED", override: monthly("70") };
  return q;
}
function evaluated(q: ScenarioInput): EvaluatedScenario {
  const r = calculateScenario(loader, q);
  if (r.status !== "EVALUATED") throw new Error(JSON.stringify(r));
  return r;
}
function resolvedIncome(q: ScenarioInput) {
  const r = evaluated(q).incomeResult;
  if (r.status !== "RESOLVED") throw new Error(JSON.stringify(r));
  return r;
}

describe("employment baseline and effective-income precedence", () => {
  it("uses existing calculated annual net / 12 for a gross-only scenario", () => {
    const q = input();
    const income = resolvedIncome(q);
    expect(income.classification).toBe("CALCULATED");
    expect(income.resolutionSource).toBe("CALCULATED_EMPLOYMENT_INCOME");
    expect(income.effectiveMonthlyNetIncome).toEqual(fromGbp("3293.30"));
    expect(income.baselineIncome.status).toBe("AVAILABLE");
    expect(income.baselineIncome.calculation).toEqual(calculateNetEmploymentIncome(loader, {
      grossAnnualSalaryGbp: "50000", jurisdiction: "rUK", taxYear: "2026/27", niCategory: "A",
      basis: "ANNUAL_COMPARISON", scope: "ONE_EMPLOYEE_ONE_EMPLOYMENT", effectiveOn: "2026-09-14",
    }));
  });
  it("resolves net-only input without inventing gross or requiring tax selectors", () => {
    const q = complete();
    q.location.income = { netMonthlyIncomeOverride: monthly("2800") };
    const r = evaluated(q);
    expect(r.completeness).toBe("COMPLETE");
    expect(r.incomeResult).toMatchObject({ status: "RESOLVED", classification: "USER_ENTERED", resolutionSource: "USER_OVERRIDE", effectiveMonthlyNetIncome: fromGbp("2800") });
    expect(r.incomeResult.baselineIncome).toMatchObject({ status: "UNAVAILABLE", reason: "GROSS_INCOME_NOT_SUPPLIED" });
    expect(r.incomeResult.baselineIncome).not.toHaveProperty("calculation");
    expect(r.inputUsed.location.income).not.toHaveProperty("grossAnnualSalaryGbp");
    expect(r.evidenceLineage.incomeBaseline).toEqual([]);
    expect(r.diagnostics.some((d) => d.code === "BASELINE_INCOME_UNAVAILABLE" && d.severity === "info")).toBe(true);
  });
  it("preserves the complete employment baseline when override wins", () => {
    const q = complete();
    const baseline = resolvedIncome(q).baselineIncome;
    q.location.income.netMonthlyIncomeOverride = { ...monthly("2800"), note: "Actual take-home" };
    const r = evaluated(q);
    expect(r.incomeResult.baselineIncome).toEqual(baseline);
    expect(r.incomeResult).toHaveProperty("effectiveMonthlyNetIncome", fromGbp("2800"));
    expect(r.residual).toHaveProperty("completeResidualMonthly", fromGbp("405"));
    expect(r.inputUsed.location.income.grossAnnualSalaryGbp).toBe("50000");
    expect(r.incomeResult.inputUsed.netMonthlyIncomeOverride?.note).toBe("Actual take-home");
    expect(r.evidenceLineage.incomeBaseline.length).toBeGreaterThan(0);
  });
  it.each(["0", "0.00"])("accepts explicit zero net override %s", (amount) => {
    const q = complete();
    q.location.income.netMonthlyIncomeOverride = monthly(amount);
    const r = evaluated(q);
    expect(r.incomeResult).toMatchObject({ status: "RESOLVED", classification: "USER_ENTERED", effectiveMonthlyNetIncome: fromGbp("0") });
    expect(r.residual).toHaveProperty("completeResidualMonthly", fromGbp("-2395"));
    expect(r.incomeResult.baselineIncome.status).toBe("AVAILABLE");
  });
  it("retains genuine gross zero as a calculated baseline", () => {
    const q = complete();
    q.location.income.grossAnnualSalaryGbp = "0";
    const r = resolvedIncome(q);
    expect(r.classification).toBe("CALCULATED");
    expect(r.effectiveMonthlyNetIncome).toEqual(fromGbp("0"));
    expect(r.baselineIncome.status).toBe("AVAILABLE");
  });
  it.each([
    ["taxJurisdiction", "unsupported", "TAX_JURISDICTION_UNSUPPORTED"],
    ["niCategory", "B", "NI_CATEGORY_UNSUPPORTED"],
    ["taxYear", "2027/28", "TAX_REFERENCE_MISSING"],
    ["calculationBasis", "MONTHLY_PAYROLL", "INCOME_OUT_OF_SCOPE"],
    ["scope", "MULTIPLE_EMPLOYMENTS", "INCOME_OUT_OF_SCOPE"],
  ] as const)("keeps unsupported %s unresolved unless an override is supplied", (key, value, code) => {
    const q = complete();
    q.location.income[key] = value;
    const missing = evaluated(q);
    expect(missing.completeness).toBe("UNRESOLVED");
    expect(missing.incomeResult.status).toBe("UNRESOLVED");
    expect(missing.incomeResult).not.toHaveProperty("effectiveMonthlyNetIncome");
    expect(missing.residual).not.toHaveProperty("completeResidualMonthly");
    expect(missing.diagnostics.some((d) => d.code === code && d.severity === "blocking")).toBe(true);
    const baseline = missing.incomeResult.baselineIncome;
    q.location.income.netMonthlyIncomeOverride = monthly("3000");
    const overridden = evaluated(q);
    expect(overridden.completeness).toBe("COMPLETE");
    expect(overridden.incomeResult.baselineIncome).toEqual(baseline);
    expect(overridden.incomeResult).toHaveProperty("effectiveMonthlyNetIncome", fromGbp("3000"));
    expect(overridden.incomeResult.diagnostics.some((d) => d.code === code && d.severity === "warning")).toBe(true);
    expect(overridden.diagnostics.some((d) => d.code === "SCENARIO_INCOME_UNRESOLVED")).toBe(false);
  });
  it("does not infer tax jurisdiction from a Scottish city or fill omitted selections", () => {
    const q = input("LOC-GLA");
    delete q.location.income.taxJurisdiction;
    expect(evaluated(q).incomeResult.diagnostics.some((d) => d.code === "TAX_JURISDICTION_REQUIRED")).toBe(true);
    q.location.income = { grossAnnualSalaryGbp: "50000" };
    const missing = evaluated(q).incomeResult;
    expect(missing.status).toBe("UNRESOLVED");
    expect(missing.diagnostics.some((d) => JSON.stringify(d.path) === JSON.stringify(["location", "income", "calculationBasis"]))).toBe(true);
    q.location.income.netMonthlyIncomeOverride = monthly("2500");
    expect(resolvedIncome(q).effectiveMonthlyNetIncome).toEqual(fromGbp("2500"));
  });
  it("calls the employment engine once when baseline exists and never for net-only", () => {
    let taxCalls = 0, niCalls = 0;
    const counting = { ...loader,
      getTaxReference: (q: Parameters<typeof loader.getTaxReference>[0]) => { taxCalls++; return loader.getTaxReference(q); },
      getNiReference: (q: Parameters<typeof loader.getNiReference>[0]) => { niCalls++; return loader.getNiReference(q); },
    };
    const q = complete();
    q.location.income.netMonthlyIncomeOverride = monthly("3000");
    calculateScenario(counting, q);
    expect([taxCalls, niCalls]).toEqual([1, 1]);
    q.location.income = { netMonthlyIncomeOverride: monthly("3000") };
    calculateScenario(counting, q);
    expect([taxCalls, niCalls]).toEqual([1, 1]);
  });
});

describe("schema validation without fallback", () => {
  it.each(["-1", "1e3", "0.001", "NaN", "9".repeat(129)])("rejects malformed net override %s even with a calculable baseline", (amount) => {
    const q = complete();
    q.location.income.netMonthlyIncomeOverride = monthly(amount);
    const r = calculateScenario(loader, q);
    expect(r.status).toBe("INVALID_INPUT");
    expect(r).not.toHaveProperty("incomeResult");
    expect(r).not.toHaveProperty("residual");
    expect(r.diagnostics[0]).toMatchObject({ code: "INVALID_INPUT", severity: "blocking", path: ["location", "income", "netMonthlyIncomeOverride", "amountGbp"] });
  });
  it("rejects numeric money, unsupported override period and unknown model fields", () => {
    const q = complete();
    for (const income of [
      { netMonthlyIncomeOverride: { amountGbp: 3000, period: "MONTHLY" } },
      { netMonthlyIncomeOverride: { amountGbp: "3000", period: "ANNUAL" } },
      { netMonthlyIncomeOverride: monthly("3000"), pensionGbp: "200" },
      { grossAnnualSalaryGbp: "-1", netMonthlyIncomeOverride: monthly("3000") },
    ]) expect(calculateScenario(loader, { ...q, location: { ...q.location, income } }).status).toBe("INVALID_INPUT");
  });
  it("reuses household validation and rejects comparison-shaped requests", () => {
    const q = input();
    expect(calculateScenario(loader, { ...q, destinationLocation: q.location }).status).toBe("INVALID_INPUT");
    q.location.housing.overrides.rent = monthly("0");
    expect(calculateScenario(loader, q).status).toBe("INVALID_INPUT");
    expect(calculateScenario(loader, null).status).toBe("INVALID_INPUT");
  });
  it("allows explicit zero net in the existing full-input validator too", () => {
    const q = input();
    q.location.income.netMonthlyIncomeOverride = monthly("0");
    expect(normalizeCalculatorInput({ household: q.household, currentLocation: q.location, destinationLocation: q.location }, loader).status).toBe("VALID");
  });
});

describe("complete and partial residuals", () => {
  it("returns exact complete costs and residual for the declared eight categories", () => {
    const r = evaluated(complete());
    expect(r.completeness).toBe("COMPLETE");
    if (r.completeness !== "COMPLETE") throw new Error("expected complete");
    expect(r.householdCostResult.totalMonthlyCost).toEqual(fromGbp("2395"));
    expect(r.residual.completeResidualMonthly).toEqual(fromGbp("898.30"));
    expect(addMoney(r.residual.completeResidualMonthly, r.householdCostResult.totalMonthlyCost)).toEqual(r.incomeResult.effectiveMonthlyNetIncome);
    expect(r.residual).not.toHaveProperty("partialResidualAfterResolvedCosts");
    expect(r.unresolvedCategories).toEqual([]);
  });
  it("does not clamp a negative complete residual", () => {
    const q = complete();
    q.location.income = { netMonthlyIncomeOverride: monthly("2000") };
    expect(evaluated(q).residual).toHaveProperty("completeResidualMonthly", fromGbp("-395"));
  });
  it("labels the Manchester mixed-source example unmistakably partial", () => {
    const q = input();
    q.location.income = { netMonthlyIncomeOverride: monthly("3000") };
    q.location.housing.councilTax = { authorityName: "Manchester", band: "D" };
    q.location.spending.groceries = monthly("300");
    const r = evaluated(q);
    expect(r.completeness).toBe("PARTIAL");
    if (r.completeness !== "PARTIAL") throw new Error("expected partial");
    expect(r.householdCostResult.resolvedSubtotalMonthly).toEqual(fromGbp("1719.67"));
    expect(r.residual.partialResidualAfterResolvedCosts).toEqual(fromGbp("1280.33"));
    expect(r.residual).not.toHaveProperty("completeResidualMonthly");
    expect(r.householdCostResult).not.toHaveProperty("totalMonthlyCost");
    expect(r.unresolvedCategories).toEqual(["energy", "water", "essentials", "lifestyle", "transport"]);
    expect(r.diagnostics.some((d) => d.code === "SCENARIO_RESIDUAL_PARTIAL")).toBe(true);
  });
  it("preserves a negative partial amount before unresolved costs", () => {
    const q = input("LOC-EDI");
    q.location.income = { netMonthlyIncomeOverride: monthly("1500") };
    q.location.housing.overrides = { rent: monthly("1400"), councilTax: monthly("300") };
    const r = evaluated(q);
    expect(r.completeness).toBe("PARTIAL");
    expect(r.residual).toHaveProperty("partialResidualAfterResolvedCosts", fromGbp("-200"));
    expect(r.residual).not.toHaveProperty("completeResidualMonthly");
  });
  it("retains fractional pennies from both tax and transport through subtraction", () => {
    const q = input("LOC-LON");
    q.location.income.grossAnnualSalaryGbp = "12570.01";
    q.location.housing.overrides.rent = monthly("0.01");
    q.location.transport = { status: "SELECTED", productId: "SRC-TFL:tfl:seven-day:2026-09" };
    const r = evaluated(q);
    if (r.completeness !== "PARTIAL") throw new Error("expected partial");
    // Annual net £12570.0072; annualized known costs £1284.52; remainder / 12.
    expect(multiplyMoney(r.residual.partialResidualAfterResolvedCosts, BigInt(12))).toEqual(fromGbp("11285.4872"));
    expect(addMoney(r.residual.partialResidualAfterResolvedCosts, r.householdCostResult.resolvedSubtotalMonthly)).toEqual(r.incomeResult.effectiveMonthlyNetIncome);
  });
  it("accepts explicitly N/A transport within complete costs", () => {
    const q = complete();
    q.location.transport = { status: "NOT_APPLICABLE", reason: "NO_TRANSPORT_COST" };
    const r = evaluated(q);
    expect(r.completeness).toBe("COMPLETE");
    expect(r.householdCostResult.notApplicableCategories).toEqual(["transport"]);
    expect(r.residual).toHaveProperty("completeResidualMonthly", fromGbp("968.30"));
  });
});

describe("unresolved scenario states and no-fallback regressions", () => {
  it("keeps complete costs visible with missing income but emits no residual", () => {
    const q = complete();
    q.location.income = {};
    const r = evaluated(q);
    expect(r.completeness).toBe("UNRESOLVED");
    expect(r.householdCostResult.completeness).toBe("COMPLETE");
    expect(r.incomeResult.status).toBe("UNRESOLVED");
    expect(r.residual).toEqual({ completeness: "UNRESOLVED", reason: "INCOME_UNRESOLVED" });
    expect(r.diagnostics.some((d) => d.code === "SCENARIO_INCOME_UNRESOLVED")).toBe(true);
  });
  it("keeps resolved income visible when no cost subtotal exists", () => {
    const q = input("LOC-EDI");
    const r = evaluated(q);
    expect(r.completeness).toBe("UNRESOLVED");
    expect(r.incomeResult.status).toBe("RESOLVED");
    expect(r.householdCostResult.completeness).toBe("UNRESOLVED");
    expect(r.householdCostResult).not.toHaveProperty("resolvedSubtotalMonthly");
    expect(r.residual).toEqual({ completeness: "UNRESOLVED", reason: "COST_SUBTOTAL_UNAVAILABLE" });
    expect(r.diagnostics.some((d) => d.code === "SCENARIO_COSTS_UNRESOLVED")).toBe(true);
  });
  it.each([
    ["LOC-EDI", "EDINBURGH_RENT_SOURCE_UNRESOLVED"],
    ["LOC-LON", "LONDON_CITY_DEFAULT_UNRESOLVED"],
    ["LOC-BIR", "BIRMINGHAM_WATER_APPLICABILITY_UNRESOLVED"],
  ] as const)("preserves the %s evidence gap and model-required diagnostics", (city, code) => {
    const r = evaluated(input(city));
    expect(r.diagnostics.some((d) => d.code === code && d.severity === "blocking")).toBe(true);
    expect(r.diagnostics.some((d) => d.code === "ENERGY_MODEL_REQUIRED")).toBe(true);
    expect(r.diagnostics.some((d) => d.code === "TRANSPORT_CITY_DEFAULT_PRODUCT_UNRESOLVED")).toBe(true);
    for (const category of r.householdCostResult.categoryResults.filter((c) => c.status === "UNRESOLVED")) expect(category).not.toHaveProperty("monthlyAmount");
    expect(r.residual).not.toHaveProperty("completeResidualMonthly");
  });
  it("does not turn stale selected transport into a fare or a zero", () => {
    const q = input("LOC-LON");
    q.location.effectiveOn = "2026-09-15";
    q.location.transport = { status: "SELECTED", productId: "SRC-TFL:tfl:seven-day:2026-09" };
    const r = evaluated(q);
    expect(r.unresolvedCategories).toContain("transport");
    expect(r.diagnostics.some((d) => d.code === "INVALID_PRODUCT_SELECTION")).toBe(true);
    q.location.transport.override = monthly("100");
    expect(evaluated(q).unresolvedCategories).not.toContain("transport");
  });
  it("treats an explicitly resolved zero subtotal as partial rather than missing", () => {
    const q = input("LOC-EDI");
    q.location.income = { netMonthlyIncomeOverride: monthly("0") };
    q.location.transport = { status: "UNRESOLVED", override: monthly("0") };
    const r = evaluated(q);
    expect(r.completeness).toBe("PARTIAL");
    expect(r.residual).toHaveProperty("partialResidualAfterResolvedCosts", fromGbp("0"));
  });
});

describe("composition, classifications and lineage", () => {
  it("uses the household result unchanged, including override baselines", () => {
    const q = complete();
    const r = evaluated(q);
    expect(r.householdCostResult).toEqual(calculateHouseholdMonthlyCosts({ location: q.location, evidence: loader }));
    expect(r.householdCostResult.categoryResults.every((c) => c.status === "RESOLVED" && c.classification === "USER_ENTERED")).toBe(true);
  });
  it("keeps calculated income, observed rent and derived council-tax classifications distinct", () => {
    const q = input("LOC-GLA");
    q.location.income.taxJurisdiction = "Scotland";
    q.location.housing.councilTax = { authorityName: "Glasgow City", band: "D" };
    const r = evaluated(q);
    expect(r.incomeResult).toHaveProperty("classification", "CALCULATED");
    expect(r.householdCostResult.categoryResults.find((c) => c.category === "rent")).toHaveProperty("classification", "OBSERVED_DATA");
    expect(r.householdCostResult.categoryResults.find((c) => c.category === "council_tax")).toHaveProperty("classification", "CALCULATED");
    expect(r.householdCostResult.categoryResults.find((c) => c.category === "rent")?.evidenceLineage[0]).toHaveProperty("geography.official.code", "S33000009");
  });
  it("exposes compact IDs and mixed source periods without a universal data date", () => {
    const q = input("LOC-GLA");
    q.location.housing.councilTax = { authorityName: "Glasgow City", band: "D" };
    const r = evaluated(q);
    expect(r.dataReleaseMetadata).toBe(loader.metadata);
    expect(r.evidenceLineage.incomeBaseline.every((ref) => ref.sourcePeriod === "2026/27" && ref.snapshotId && ref.sourceId)).toBe(true);
    const rent = r.evidenceLineage.householdCosts.find((c) => c.category === "rent")!.references;
    expect(rent[0].sourcePeriod).toBe("2026-07");
    expect(rent[0]).not.toHaveProperty("qa");
    expect(rent[0]).not.toHaveProperty("provenance");
    expect(r).not.toHaveProperty("scenarioDataDate");
    for (const c of r.evidenceLineage.householdCosts) expect(new Set(c.references.map((ref) => ref.recordId)).size).toBe(c.references.length);
  });
  it("does not mutate inputs or baseline records and is deterministic", () => {
    const q = complete();
    q.location.income.netMonthlyIncomeOverride = monthly("2800");
    const before = structuredClone(q);
    const sourceBefore = JSON.stringify(loader.getTaxReference({ jurisdiction: "rUK", taxYear: "2026/27" }));
    const r = evaluated(q);
    expect(evaluated(q)).toEqual(r);
    expect(q).toEqual(before);
    expect(JSON.stringify(loader.getTaxReference({ jurisdiction: "rUK", taxYear: "2026/27" }))).toBe(sourceBefore);
    expect(() => JSON.stringify(r)).not.toThrow();
    for (const d of r.diagnostics) expect(diagnosticSchema.safeParse(d).success).toBe(true);
    expect(scenarioInputSchema.parse(q)).toEqual(q);
  });
  it("changing net override affects residual only, not baseline or costs", () => {
    const q = complete();
    q.location.income.netMonthlyIncomeOverride = monthly("2800");
    const before = evaluated(q);
    q.location.income.netMonthlyIncomeOverride = monthly("2800.01");
    const after = evaluated(q);
    expect(after.incomeResult.baselineIncome).toEqual(before.incomeResult.baselineIncome);
    expect(after.householdCostResult).toEqual(before.householdCostResult);
    if (before.completeness !== "COMPLETE" || after.completeness !== "COMPLETE") throw new Error("expected complete");
    expect(subtractMoney(after.residual.completeResidualMonthly, before.residual.completeResidualMonthly)).toEqual(fromGbp("0.01"));
  });
});
