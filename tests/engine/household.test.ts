import { describe, expect, it } from "vitest";
import {
  createEvidenceLoader, normalizeCalculatorInput, calculateMonthlyCostCategory, calculateHouseholdMonthlyCosts,
  aggregateHouseholdMonthlyCosts, categoryCalculators, requiredHouseholdCostCategories,
  addMoney, fromGbp, monthlyEquivalent, multiplyMoney, diagnosticSchema,
  type CalculatorInput, type CategoryCalculatorContext, type HouseholdCostCategory, type MonthlyCostResult,
} from "@/engine";

const evidence = createEvidenceLoader();
const monthly = (amountGbp: string) => ({ amountGbp, period: "MONTHLY" as const });
function context(cityId: CalculatorInput["currentLocation"]["cityId"] = "LOC-GLA"): CategoryCalculatorContext {
  const location: CalculatorInput["currentLocation"] = {
    cityId, effectiveOn: "2026-09-14",
    housing: { bedrooms: 2, rentSourceMonth: "2026-07", overrides: {} },
    income: { grossAnnualSalaryGbp: "50000", calculationBasis: "ANNUAL_COMPARISON", scope: "ONE_EMPLOYEE_ONE_EMPLOYMENT", taxYear: "2026/27", taxJurisdiction: "Scotland", niCategory: "A", payPeriod: "monthly" },
    transport: { status: "UNRESOLVED" }, spending: {},
  };
  const input = normalizeCalculatorInput({ household: { adults: 2, children: 1 }, currentLocation: location, destinationLocation: location }, evidence);
  if (input.status !== "VALID") throw new Error("invalid fixture");
  return { household: input.input.household, location: input.input.currentLocation, evidence };
}
function resolved(c: CategoryCalculatorContext, category: HouseholdCostCategory) {
  const result = calculateMonthlyCostCategory(c, category);
  expect(result.status).toBe("RESOLVED");
  if (result.status !== "RESOLVED") throw new Error(JSON.stringify(result));
  return result;
}
function expectGap(c: CategoryCalculatorContext, category: HouseholdCostCategory, code?: string) {
  const result = calculateMonthlyCostCategory(c, category);
  expect(result.status).toBe("UNRESOLVED");
  expect(result).not.toHaveProperty("monthlyAmount");
  expect(result.baselineEvidence.status).toBe("UNAVAILABLE");
  expect(result.canResolveWithUserInput).toBe(true);
  if (code) expect(result.diagnostics[0].code).toBe(code);
  return result;
}
function allOverrides() {
  const c = context();
  c.location.housing.overrides = { rent: monthly("1500"), councilTax: monthly("170"), energy: monthly("120"), water: monthly("55") };
  c.location.spending = { groceries: monthly("300"), essentials: monthly("80"), lifestyle: monthly("100") };
  c.location.transport = { status: "UNRESOLVED", override: monthly("70") };
  return c;
}
const weeklyId = "SRC-TFL:tfl:seven-day:2026-09";
const annualId = "SRC-TFL:tfl:annual:2026-09";

describe("monthly housing source and override paths", () => {
  it.each([
    ["LOC-LON", "2218", "E12000007"],
    ["LOC-GLA", "1088", "S33000009"],
    ["LOC-MAN", "1227", "E08000003"],
  ] as const)("preserves %s rent amount and source geography", (city, amount, code) => {
    const r = resolved(context(city), "rent");
    expect(r.monthlyAmount).toEqual(fromGbp(amount));
    expect(r.classification).toBe("OBSERVED_DATA");
    expect(r.resolutionSource).toBe("EVIDENCE");
    expect(r.evidenceLineage[0]).toHaveProperty("geography.official.code", code);
    expect(r.sourcePeriods).toContain("2026-07");
    expect(r.sourceIds).toContain("SRC-001");
    expect(r.formula).toBeUndefined();
  });
  it("keeps Edinburgh missing until an explicit override, with unavailable baseline", () => {
    const c = context("LOC-EDI");
    expectGap(c, "rent", "EDINBURGH_RENT_SOURCE_UNRESOLVED");
    c.location.housing.overrides.rent = monthly("1400");
    const r = resolved(c, "rent");
    expect(r.monthlyAmount).toEqual(fromGbp("1400"));
    expect(r.resolutionSource).toBe("USER_OVERRIDE");
    expect(r.baselineEvidence.status).toBe("UNAVAILABLE");
    expect(r.evidenceLineage).toEqual([]);
    expect(r.diagnostics.find((d) => d.code === "EDINBURGH_RENT_SOURCE_UNRESOLVED")?.severity).toBe("warning");
  });
  it("retains an available observed baseline when rent is overridden", () => {
    const c = context();
    const baseline = resolved(c, "rent");
    c.location.housing.overrides.rent = monthly("1111.11");
    const r = resolved(c, "rent");
    expect(r.monthlyAmount).toEqual(fromGbp("1111.11"));
    expect(r.baselineEvidence.records).toEqual(baseline.evidenceLineage);
    expect(r.classification).toBe("USER_ENTERED");
  });
  it.each([
    ["LOC-GLA", "Glasgow City", "1706.00"],
    ["LOC-EDI", "City of Edinburgh", "1626.05"],
    ["LOC-MAN", "Manchester", "2312.04"],
  ] as const)("calculates exact %s council annual / 12", (city, authorityName, annual) => {
    const c = context(city);
    c.location.housing.councilTax = { authorityName, band: "D" };
    const r = resolved(c, "council_tax");
    expect(multiplyMoney(r.monthlyAmount, BigInt(12))).toEqual(fromGbp(annual));
    expect(r.classification).toBe("CALCULATED");
    expect(r.resolutionSource).toBe("CALCULATED_FROM_EVIDENCE");
    expect(r.formula?.expression).toBe("annualGbp / 12");
    expect(r.evidenceLineage[0]).toHaveProperty("band", "D");
    expect(r.evidenceLineage[0]).toHaveProperty("geography.official.name", authorityName);
  });
  it("does not average London boroughs; an explicit monthly override resolves", () => {
    const c = context("LOC-LON");
    expectGap(c, "council_tax", "LONDON_CITY_DEFAULT_UNRESOLVED");
    c.location.housing.overrides.councilTax = monthly("180");
    const r = resolved(c, "council_tax");
    expect(r.monthlyAmount).toEqual(fromGbp("180"));
    expect(r.baselineEvidence.status).toBe("UNAVAILABLE");
  });
});

describe("Scottish water conditional deterministic path", () => {
  it.each(["LOC-EDI", "LOC-GLA"] as const)("uses %s Band D combined annual charge exactly once", (city) => {
    const c = context(city);
    c.location.housing.water = { billingRegime: "council_tax_band", band: "D", connectedServices: "combined" };
    const r = resolved(c, "water");
    expect(r.monthlyAmount).toEqual(fromGbp("54.36"));
    expect(r.evidenceLineage).toHaveLength(1);
    expect(r.evidenceLineage[0].recordId).toBe("SRC-010:D-combined:2026-27");
    expect(r.resolutionSource).toBe("CALCULATED_FROM_EVIDENCE");
    expect(r.formula?.expression).toBe("annualGbp / 12");
    expect(r.sourceIds).toEqual(["SRC-010"]);
  });
  it.each(["A", "B", "C", "D", "E", "F", "G", "H"] as const)("preserves Band %s components versus alternative total", (band) => {
    const c = context();
    c.location.housing.water = { billingRegime: "council_tax_band", band, connectedServices: "clean_water" };
    const clean = resolved(c, "water");
    c.location.housing.water.connectedServices = "wastewater";
    const waste = resolved(c, "water");
    c.location.housing.water.connectedServices = "combined";
    const combined = resolved(c, "water");
    expect(addMoney(clean.monthlyAmount, waste.monthlyAmount)).toEqual(combined.monthlyAmount);
    expect(combined.evidenceLineage).toHaveLength(1);
  });
  it("requires regime and connected services even with a council-tax band", () => {
    const c = context();
    c.location.housing.councilTax = { authorityName: "Glasgow City", band: "D" };
    expectGap(c, "water", "WATER_APPLICABILITY_UNRESOLVED");
  });
  it("rejects conflicting bands, stale periods, missing and ambiguous records", () => {
    const c = context();
    c.location.housing.water = { billingRegime: "council_tax_band", band: "D", connectedServices: "combined" };
    c.location.housing.councilTax = { authorityName: "Glasgow City", band: "C" };
    expectGap(c, "water", "WATER_SELECTION_CONFLICT");
    delete c.location.housing.councilTax;
    c.location.effectiveOn = "2027-04-01";
    expectGap(c, "water", "NO_EXACT_EVIDENCE");
    c.location.effectiveOn = "2026-09-14";
    c.evidence = { ...evidence, getWaterEvidence: () => [] };
    expectGap(c, "water", "NO_EXACT_EVIDENCE");
    c.evidence = { ...evidence, getWaterEvidence: (provider) => [...evidence.getWaterEvidence(provider), ...evidence.getWaterEvidence(provider)] };
    expectGap(c, "water", "NO_EXACT_EVIDENCE");
  });
  it.each(["LOC-LON", "LOC-MAN", "LOC-LEE", "LOC-LIV", "LOC-BRS"] as const)("does not invent a %s bill from tariffs", (city) => {
    const c = context(city);
    expectGap(c, "water", "WATER_USAGE_REQUIRED");
    c.location.housing.overrides.water = monthly("55.55");
    expect(resolved(c, "water").monthlyAmount).toEqual(fromGbp("55.55"));
  });
  it("never chooses a Birmingham tariff zone", () => {
    const c = context("LOC-BIR");
    expectGap(c, "water", "BIRMINGHAM_WATER_APPLICABILITY_UNRESOLVED");
    c.location.housing.overrides.water = monthly("60");
    const r = resolved(c, "water");
    expect(r.baselineEvidence.status).toBe("UNAVAILABLE");
    expect(r.diagnostics[0].severity).toBe("warning");
  });
  it("keeps Scottish source baseline under a monthly override", () => {
    const c = context();
    c.location.housing.water = { billingRegime: "council_tax_band", band: "D", connectedServices: "combined" };
    c.location.housing.overrides.water = monthly("50");
    const r = resolved(c, "water");
    expect(r.monthlyAmount).toEqual(fromGbp("50"));
    expect(r.baselineEvidence.status).toBe("AVAILABLE");
    expect(r.evidenceLineage[0]).toHaveProperty("amount", 652.32);
    expect(r.formula).toBeUndefined();
  });
});

describe("unapproved household models remain unresolved", () => {
  it("never selects an energy region or consumption profile", () => {
    const c = context();
    c.evidence = { ...evidence, getEnergyPriceEvidence: () => { throw new Error("unexpected region lookup"); }, getEnergyConsumptionInputs: () => { throw new Error("unexpected consumption lookup"); } };
    expectGap(c, "energy", "ENERGY_MODEL_REQUIRED");
    c.location.housing.overrides.energy = monthly("123.45");
    const r = resolved(c, "energy");
    expect(r.classification).toBe("USER_ENTERED");
    expect(r.monthlyAmount).toEqual(fromGbp("123.45"));
  });
  it.each(["groceries", "essentials", "lifestyle"] as const)("requires %s input without headcount or COICOP arithmetic", (category) => {
    const c = context();
    const r = expectGap(c, category, category === "groceries" ? "GROCERIES_MODEL_REQUIRED" : "SPENDING_MODEL_REQUIRED");
    expect(r.evidenceLineage.length).toBeGreaterThan(0);
    c.household = { adults: 20, children: 8 };
    expect(calculateMonthlyCostCategory(c, category)).toEqual(r);
    c.location.spending[category] = monthly("123.45");
    const override = resolved(c, category);
    expect(override.monthlyAmount).toEqual(fromGbp("123.45"));
    expect(override.baselineEvidence.status).toBe("UNAVAILABLE");
    expect(override.lineageClassifications).toContain("USER_ENTERED");
    expect(override.evidenceLineage).toEqual(r.evidenceLineage);
  });
});

describe("explicit transport resolution", () => {
  it.each(["LOC-LON", "LOC-BIR", "LOC-MAN", "LOC-LEE", "LOC-LIV", "LOC-BRS", "LOC-EDI", "LOC-GLA"] as const)("does not choose a default fare in %s", (city) => {
    expectGap(context(city), "transport", "TRANSPORT_CITY_DEFAULT_PRODUCT_UNRESOLVED");
  });
  it("normalizes the selected weekly ticket exactly, with scope retained", () => {
    const c = context("LOC-LON");
    c.location.transport = { status: "SELECTED", productId: weeklyId };
    const r = resolved(c, "transport");
    expect(r.monthlyAmount).toEqual(monthlyEquivalent(fromGbp("24.70"), "WEEKLY"));
    expect(multiplyMoney(r.monthlyAmount, BigInt(12))).toEqual(fromGbp("1284.40"));
    expect(r.formula?.expression).toBe("weeklyGbp * 52 / 12");
    expect(r.evidenceLineage[0].recordId).toBe(weeklyId);
    expect(r.classification).toBe("CALCULATED");
    expect(r.evidenceLineage[0].valueType).toBe("OBSERVED_DATA");
    expect(r.limitations.some((s) => s.includes("No Tube"))).toBe(true);
  });
  it("normalizes an annual ticket without daily/weekly assumptions", () => {
    const c = context("LOC-LON");
    c.location.transport = { status: "SELECTED", productId: annualId };
    expect(multiplyMoney(resolved(c, "transport").monthlyAmount, BigInt(12))).toEqual(fromGbp("988"));
  });
  it.each(["SRC-TFL:tfl:weekly-cap:2026-09", "SRC-TFL:tfl:daily:2026-09", "SRC-TFL:tfl:hopper:2026-09"])("does not annualize cap/day/journey product %s", (productId) => {
    const c = context("LOC-LON");
    c.location.transport = { status: "SELECTED", productId };
    const r = expectGap(c, "transport", "TRANSPORT_PERIOD_UNSUPPORTED");
    expect(r.evidenceLineage[0].recordId).toBe(productId);
  });
  it("rejects stale, wrong-city and duplicate selected records", () => {
    const c = context("LOC-LON");
    c.location.transport = { status: "SELECTED", productId: weeklyId };
    c.location.effectiveOn = "2026-09-15";
    expectGap(c, "transport", "INVALID_PRODUCT_SELECTION");
    c.location.effectiveOn = "2026-09-14";
    c.location.cityId = "LOC-BRS";
    expectGap(c, "transport", "INVALID_PRODUCT_SELECTION");
    c.location.cityId = "LOC-LON";
    c.evidence = { ...evidence, getTransportProducts: (q) => [...evidence.getTransportProducts(q), ...evidence.getTransportProducts(q)] };
    expectGap(c, "transport", "INVALID_PRODUCT_SELECTION");
  });
  it("excludes a DEV_ONLY frequency profile even for a supported ticket", () => {
    const c = context("LOC-LON");
    c.location.transport = { status: "SELECTED", productId: weeklyId, frequency: { daysPerWeek: 5, valueType: "MODELLED_ESTIMATE", releaseStatus: "DEV_ONLY" } };
    expectGap(c, "transport", "TRANSPORT_FREQUENCY_MODEL_UNSUPPORTED");
    c.location.transport.override = monthly("99");
    expect(resolved(c, "transport").monthlyAmount).toEqual(fromGbp("99"));
  });
  it("allows a valid override despite an unavailable selected baseline", () => {
    const c = context("LOC-LON");
    c.location.transport = { status: "SELECTED", productId: "unavailable", override: monthly("75.01") };
    const { grossAnnualSalary, ...location } = c.location; void grossAnnualSalary;
    expect(normalizeCalculatorInput({ household: c.household, currentLocation: location, destinationLocation: location }, evidence).status).toBe("VALID");
    const r = resolved(c, "transport");
    expect(r.monthlyAmount).toEqual(fromGbp("75.01"));
    expect(r.baselineEvidence.status).toBe("UNAVAILABLE");
    expect(r.diagnostics[0].severity).toBe("warning");
  });
});

describe("zero and applicability are explicit category policies", () => {
  it.each(["transport", "essentials", "lifestyle"] as const)("accepts an explicit zero for %s", (category) => {
    const c = context();
    if (category === "transport") c.location.transport = { status: "UNRESOLVED", override: monthly("0") };
    else c.location.spending[category] = monthly("0.00");
    const r = resolved(c, category);
    expect(r.monthlyAmount).toEqual(fromGbp("0"));
    expect(r.classification).toBe("USER_ENTERED");
    expect(r.status).toBe("RESOLVED");
  });
  it.each(["rent", "council_tax", "energy", "water", "groceries"] as const)("does not accept zero %s without supported exemption/bundling semantics", (category) => {
    const c = context();
    if (category === "groceries") c.location.spending.groceries = monthly("0");
    else c.location.housing.overrides[category === "council_tax" ? "councilTax" : category] = monthly("0");
    expect(() => calculateMonthlyCostCategory(c, category)).toThrow();
  });
  it("requires no-cost declaration for transport NOT_APPLICABLE", () => {
    const c = context();
    expectGap(c, "transport");
    c.location.transport = { status: "NOT_APPLICABLE", reason: "NO_TRANSPORT_COST" };
    const r = calculateMonthlyCostCategory(c, "transport");
    expect(r.status).toBe("NOT_APPLICABLE");
    expect(r).not.toHaveProperty("monthlyAmount");
    expect(r.resolutionSource).toBe("NOT_APPLICABLE");
    Object.assign(c.location.transport, { override: monthly("10") });
    expect(() => calculateMonthlyCostCategory(c, "transport")).toThrow();
  });
  it("rejects negative money even when a source amount would otherwise resolve", () => {
    const c = context();
    c.location.housing.overrides.rent = monthly("-1");
    expect(() => calculateHouseholdMonthlyCosts(c)).toThrow();
  });
});

describe("household aggregation completeness and exact sums", () => {
  it("returns COMPLETE for eight resolved categories", () => {
    const r = calculateHouseholdMonthlyCosts(allOverrides());
    expect(r.completeness).toBe("COMPLETE");
    expect(r).toHaveProperty("totalMonthlyCost", fromGbp("2395"));
    expect(r.resolvedSubtotalMonthly).toEqual(fromGbp("2395"));
    expect(r.requiredCategoryCount).toBe(8);
    expect(r.resolvedCategoryCount).toBe(8);
    expect(r.unresolvedCategories).toEqual([]);
    expect(r.categoryResults.every((r) => r.status === "RESOLVED" && r.classification === "USER_ENTERED")).toBe(true);
  });
  it("only exposes a PARTIAL resolved subtotal when costs are missing", () => {
    const c = context("LOC-MAN");
    c.location.housing.councilTax = { authorityName: "Manchester", band: "D" };
    c.location.spending.groceries = monthly("300");
    const r = calculateHouseholdMonthlyCosts(c);
    expect(r.completeness).toBe("PARTIAL");
    expect(r.resolvedSubtotalMonthly).toEqual(fromGbp("1719.67")); // 1227 + 2312.04/12 + 300
    expect(r).not.toHaveProperty("totalMonthlyCost");
    expect(r.unresolvedCategories).toEqual(["energy", "water", "essentials", "lifestyle", "transport"]);
    expect(r.includedCategories).toEqual(["rent", "council_tax", "groceries"]);
    expect(r.diagnostics.at(-1)?.code).toBe("HOUSEHOLD_COST_PARTIAL");
  });
  it("preserves the brief's partial £1,725 example", () => {
    const c = context();
    c.location.housing.overrides = { rent: monthly("1500"), councilTax: monthly("170"), water: monthly("55") };
    const r = calculateHouseholdMonthlyCosts(c);
    expect(r.completeness).toBe("PARTIAL");
    expect(r.resolvedSubtotalMonthly).toEqual(fromGbp("1725"));
    expect(r.unresolvedCategories).toEqual(["energy", "groceries", "essentials", "lifestyle", "transport"]);
  });
  it("emits no subtotal when all categories are unresolved", () => {
    const r = calculateHouseholdMonthlyCosts(context("LOC-EDI"));
    expect(r.completeness).toBe("UNRESOLVED");
    expect(r.resolvedCategoryCount).toBe(0);
    expect(r.unresolvedCategoryCount).toBe(8);
    expect(r).not.toHaveProperty("resolvedSubtotalMonthly");
    expect(r).not.toHaveProperty("totalMonthlyCost");
    expect(r.categoryResults.every((c) => !("monthlyAmount" in c))).toBe(true);
  });
  it("excludes explicit N/A from both subtotal and unresolved count", () => {
    const c = allOverrides();
    c.location.transport = { status: "NOT_APPLICABLE", reason: "NO_TRANSPORT_COST" };
    const r = calculateHouseholdMonthlyCosts(c);
    expect(r.completeness).toBe("COMPLETE");
    expect(r.resolvedSubtotalMonthly).toEqual(fromGbp("2325"));
    expect(r.notApplicableCategories).toEqual(["transport"]);
    expect([r.requiredCategoryCount, r.resolvedCategoryCount, r.unresolvedCategoryCount, r.notApplicableCategoryCount]).toEqual([8, 7, 0, 1]);
    delete c.location.housing.overrides.energy;
    const partial = calculateHouseholdMonthlyCosts(c);
    expect(partial.completeness).toBe("PARTIAL");
    expect(partial.unresolvedCategories).toEqual(["energy"]);
  });
  it("a zero resolved category counts; N/A alone does not fabricate a subtotal", () => {
    const c = context("LOC-EDI");
    c.location.transport = { status: "NOT_APPLICABLE", reason: "NO_TRANSPORT_COST" };
    expect(calculateHouseholdMonthlyCosts(c).completeness).toBe("UNRESOLVED");
    c.location.transport = { status: "UNRESOLVED", override: monthly("0") };
    const r = calculateHouseholdMonthlyCosts(c);
    expect(r.completeness).toBe("PARTIAL");
    expect(r.resolvedSubtotalMonthly).toEqual(fromGbp("0"));
    expect(r.resolvedCategoryCount).toBe(1);
  });
  it("sums fractional pennies exactly without rounding source periods", () => {
    const c = context("LOC-LON");
    c.location.housing.overrides.rent = monthly("0.01");
    c.location.transport = { status: "SELECTED", productId: weeklyId };
    const r = calculateHouseholdMonthlyCosts(c);
    expect(r.resolvedSubtotalMonthly).toEqual({ currency: "GBP", unit: "pence", numerator: "32113", denominator: "3" });
    expect(multiplyMoney(r.resolvedSubtotalMonthly!, BigInt(12))).toEqual(fromGbp("1284.52"));
  });
  it("validates category set and blocks development models at the aggregation boundary", () => {
    const c = allOverrides();
    const rs = calculateHouseholdMonthlyCosts(c).categoryResults;
    expect(() => aggregateHouseholdMonthlyCosts(c, rs.slice(1))).toThrow();
    expect(() => aggregateHouseholdMonthlyCosts(c, [rs[0], ...rs.slice(0, 7)])).toThrow();
    expect(() => aggregateHouseholdMonthlyCosts(c, rs.map((r) => ({ ...r, cityId: "LOC-EDI" })))).toThrow();
    expect(() => aggregateHouseholdMonthlyCosts(c, rs.map((r) => r.category === "transport" ? { ...r, classification: "MODELLED_ESTIMATE" } as unknown as MonthlyCostResult : r))).toThrow();
    expect(() => aggregateHouseholdMonthlyCosts(c, rs.map((r) => r.category === "transport" ? { ...r, monthlyAmount: fromGbp("-1") } as MonthlyCostResult : r))).toThrow();
  });
  it("does not include income tax, NI or duplicate household_spending", () => {
    const c = allOverrides();
    const before = calculateHouseholdMonthlyCosts(c);
    c.location.income.grossAnnualSalaryGbp = "200000";
    c.location.grossAnnualSalary = fromGbp("200000");
    const after = calculateHouseholdMonthlyCosts(c);
    expect(after).toEqual(before);
    expect(after.categoryResults.map((r) => r.category)).toEqual(requiredHouseholdCostCategories);
  });
  it("matches category registry results and emits valid stable diagnostics", () => {
    const c = context();
    const r = calculateHouseholdMonthlyCosts(c);
    for (const category of requiredHouseholdCostCategories) expect(categoryCalculators[category](c)).toEqual(r.categoryResults.find((r) => r.category === category));
    for (const d of r.diagnostics) expect(diagnosticSchema.safeParse(d).success).toBe(true);
    expect(r.dataReleaseMetadata).toBe(evidence.metadata);
  });
  it("is deterministic and does not mutate input or source records", () => {
    const c = allOverrides();
    const before = structuredClone(c.location);
    const references = JSON.stringify(evidence.getGroceryReference());
    const r = calculateHouseholdMonthlyCosts(c);
    expect(calculateHouseholdMonthlyCosts(c)).toEqual(r);
    expect(c.location).toEqual(before);
    expect(JSON.stringify(evidence.getGroceryReference())).toBe(references);
    expect(() => JSON.stringify(r)).not.toThrow();
  });
});
