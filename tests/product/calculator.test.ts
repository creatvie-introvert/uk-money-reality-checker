import { describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import * as engine from "@/engine";
import { buildCalculatorInputsFromForm, calculateProductResult, classificationLabels, type CalculatorFormState, type FormLocation } from "@/product/calculator";
import { formatMoney, formatChange } from "@/product/calculator/formatting";
import { acceptanceFixtures } from "../engine/fixtures/milestone-2/cases";
import { previewForm } from "@/features/calculator/development/fixtures";

const evidence = engine.createEvidenceLoader();
const entered = (q: { amountGbp: string; note?: string } | undefined) => q ? { mode: "AMOUNT" as const, amountGbp: q.amountGbp, ...(q.note ? { note: q.note } : {}) } : { mode: "UNKNOWN" as const };
/** Test-only translation of reviewed M2 fixtures; no runtime form defaults. */
function formLocation(s: engine.ScenarioInput): FormLocation {
  const q = s.location;
  return {
    cityId: q.cityId, effectiveOn: q.effectiveOn, bedrooms: String(q.housing.bedrooms), rentSourceMonth: q.housing.rentSourceMonth,
    rent: q.housing.overrides.rent ? entered(q.housing.overrides.rent) : { mode: "SOURCE" },
    council: q.housing.overrides.councilTax ? { ...entered(q.housing.overrides.councilTax), selection: q.housing.councilTax } : q.housing.councilTax ? { mode: "SOURCE", ...q.housing.councilTax } : { mode: "UNKNOWN" },
    water: q.housing.overrides.water ? { ...entered(q.housing.overrides.water), selection: q.housing.water } : q.housing.water ? { mode: "SOURCE", band: q.housing.water.band, connectedServices: q.housing.water.connectedServices } : { mode: "UNKNOWN" },
    energy: entered(q.housing.overrides.energy),
    spending: { groceries: entered(q.spending.groceries), essentials: entered(q.spending.essentials), lifestyle: entered(q.spending.lifestyle) },
    transport: q.transport.status === "NOT_APPLICABLE" ? { mode: "NONE" } : q.transport.status === "SELECTED" ? { mode: "PRODUCT", productId: q.transport.productId, ...(q.transport.override ? { override: q.transport.override } : {}) } : entered(q.transport.override),
    income: { grossAnnualSalaryGbp: q.income.grossAnnualSalaryGbp ?? "", taxJurisdiction: q.income.taxJurisdiction ?? "", taxYear: q.income.taxYear ?? "", niCategory: q.income.niCategory ?? "", scope: q.income.scope ?? "", calculationBasis: q.income.calculationBasis ?? "", ...(q.income.netMonthlyIncomeOverride ? { netOverride: { amountGbp: q.income.netMonthlyIncomeOverride.amountGbp, note: q.income.netMonthlyIncomeOverride.note } } : {}) },
  };
}
function evaluated(form: unknown, options?: engine.SalaryPreservationOptions) {
  const result = calculateProductResult(form, evidence, options);
  if (result.state !== "EVALUATED") throw new Error(JSON.stringify(result));
  return result;
}

describe("form adapter without defaults or model leakage", () => {
  it("maps reviewed form state without mutation", () => {
    const form = previewForm("complete"), before = structuredClone(form);
    const r = buildCalculatorInputsFromForm(form);
    expect(r.current.state).toBe("READY");
    expect(r.current.input?.location.income.taxJurisdiction).toBe("rUK");
    expect(r.destination.input?.location.housing.overrides.rent?.amountGbp).toBe("1850");
    expect(form).toEqual(before);
  });
  it.each(["cityId", "bedrooms", "effectiveOn", "rentSourceMonth"] as const)("does not invent missing structural %s", (key) => {
    const q = previewForm("complete"); q.current[key] = "";
    const r = calculateProductResult(q, evidence);
    expect(r.state).toBe("INPUT_REQUIRED");
    expect(r.adapter.current.state).toBe("INCOMPLETE");
    expect(r).not.toHaveProperty("product");
  });
  it("requires an explicit rent basis instead of quietly selecting source data", () => {
    const q = previewForm("complete"); q.current.rent = { mode: "UNKNOWN" };
    expect(buildCalculatorInputsFromForm(q).current.state).toBe("INCOMPLETE");
  });
  it.each(["energy", "water"] as const)("keeps missing %s unresolved", (category) => {
    const q = previewForm("complete"); q.destination[category] = { mode: "UNKNOWN" };
    const { product } = evaluated(q);
    expect(product.breakdown.find((r) => r.category === category)?.destination.state).toBe("UNAVAILABLE");
    expect(product.headlines.costs).not.toHaveProperty("exact");
  });
  it("does not guess authority, transport, spending, income or jurisdiction", () => {
    const q = previewForm("complete");
    q.destination.council = { mode: "SOURCE", authorityName: "", band: "" };
    q.destination.transport = { mode: "UNKNOWN" };
    q.destination.spending.groceries = { mode: "UNKNOWN" };
    q.destination.income.grossAnnualSalaryGbp = "";
    q.destination.income.taxJurisdiction = "";
    const { adapter, product } = evaluated(q);
    expect(adapter.destination.input?.location.housing.councilTax).toBeUndefined();
    expect(adapter.destination.input?.location.income.taxJurisdiction).toBeUndefined();
    expect(adapter.destination.issues.map((d) => d.code)).toContain("ADAPTER_TAX_JURISDICTION_REQUIRED");
    expect(product.destination.income).not.toHaveProperty("exact");
    for (const key of ["council_tax", "transport", "groceries"]) expect(product.breakdown.find((r) => r.category === key)?.destination.state).toBe("UNAVAILABLE");
  });
  it("preserves explicit allowed zeros and N/A distinctly", () => {
    const q = previewForm("complete");
    q.destination.transport = { mode: "AMOUNT", amountGbp: "0" };
    q.destination.spending.essentials = { mode: "AMOUNT", amountGbp: "0.00" };
    q.current.income.netOverride = { amountGbp: "0" };
    const a = evaluated(q).product;
    expect(a.destination.income.state).toBe("AVAILABLE");
    expect(a.current.income).toHaveProperty("exact", engine.fromGbp("0"));
    expect(a.breakdown.find((r) => r.category === "transport")?.destination).toHaveProperty("exact", engine.fromGbp("0"));
    q.destination.transport = { mode: "NONE" };
    const b = evaluated(q).product;
    expect(b.breakdown.find((r) => r.category === "transport")?.destination).not.toHaveProperty("exact");
    expect(b.destination.coverage?.notApplicable).toBe(1);
    expect(b.drivers.excluded.map((c) => c.category)).toContain("transport");
  });
  it.each(["", "-1", "0", "1.234", "NaN"])("does not fall through an invalid rent override %s", (amountGbp) => {
    const q = previewForm("complete"); q.current.rent = { mode: "AMOUNT", amountGbp };
    expect(buildCalculatorInputsFromForm(q).current.state).toBe("INVALID");
  });
  it.each(["childcare", "payrollDeductions", "lifestyleProfile", "commuteFrequency", "propertyType"])("rejects unsupported form field %s", (key) => {
    const q = previewForm("complete"); Object.assign(q.current, { [key]: "Typical" });
    expect(buildCalculatorInputsFromForm(q).current.state).toBe("INVALID");
  });
  it("retains a selected transport baseline under an explicit override", () => {
    const q = previewForm("complete"); q.destination.transport = { mode: "PRODUCT", productId: "SRC-TFL:tfl:seven-day:2026-09", override: { amountGbp: "110", note: "Actual ticket costs" } };
    const p = evaluated(q).product.breakdown.find((r) => r.category === "transport")!.destination;
    expect(p).toHaveProperty("exact", engine.fromGbp("110"));
    expect(p.explanation.label).toBe("Your amount");
    expect(p.explanation.sources[0].organisation).toBeTruthy();
    expect(p.explanation.baselineStatus).toBe("AVAILABLE");
  });
});

describe("M2 acceptance fixtures through product orchestration", () => {
  it.each(acceptanceFixtures())("$id survives form → engine → product → view", (fixture) => {
    const form: CalculatorFormState = { household: { adults: String(fixture.current.household.adults), children: String(fixture.current.household.children) }, current: formLocation(fixture.current), destination: formLocation(fixture.destination) };
    const { product: p, view } = evaluated(form);
    expect(p.breakdown).toHaveLength(8);
    for (const [index, m] of [p.headlines.takeHome, p.headlines.costs, p.headlines.residual].entries()) {
      const expected = fixture.expected.annualDeltas[index];
      if (expected === null) { expect(m.state).not.toBe("AVAILABLE"); expect(m).not.toHaveProperty("exact"); }
      else {
        expect(m.state).toBe("AVAILABLE");
        expect(engine.multiplyMoney(m.exact!, BigInt(12))).toEqual(engine.fromGbp(expected));
      }
    }
    expect(p.drivers.completeness).toBe(fixture.expected.ranking);
    expect(p.drivers.excluded.map((r) => r.category)).toEqual(fixture.expected.excluded);
    expect(p.salary.state).toBe(fixture.expected.solver === "ELIGIBLE_SOLVED" ? "AVAILABLE" : "UNAVAILABLE");
    if (p.salary.state === "AVAILABLE") expect(p.salary.grossAnnual).toHaveProperty("exact", engine.fromGbp(fixture.expected.solvedGross!));
    expect(view.coverage[0].text).toContain("of 8");
    expect(JSON.parse(JSON.stringify(p))).toEqual(p);
    expect(JSON.stringify(view)).not.toContain("MODELLED_ESTIMATE");
  });
  it("calls eligibility first, never calls solver for ineligible state", () => {
    const eligibility = vi.spyOn(engine, "evaluateSalaryPreservationEligibility");
    const solve = vi.spyOn(engine, "solveSalaryPreservation");
    evaluated(previewForm("partial"));
    expect(eligibility).toHaveBeenCalledTimes(1); expect(solve).not.toHaveBeenCalled();
    evaluated(previewForm("complete"));
    expect(solve).toHaveBeenCalledTimes(1);
    expect(eligibility.mock.invocationCallOrder[1]).toBeLessThan(solve.mock.invocationCallOrder[0]);
    vi.restoreAllMocks();
  });
  it("preserves baseline source explanations and user override badges", () => {
    const { product, view } = evaluated(previewForm("override"));
    expect(product.current.income.explanation.label).toBe("Your amount");
    expect(product.current.income.explanation.sources.length).toBeGreaterThan(0);
    expect(view.salary.state).toBe("UNAVAILABLE");
    expect(view.salary.detail).toContain("override");
    const rent = product.breakdown.find((r) => r.category === "rent")!;
    expect(rent.current.explanation.label).toBe("Official data");
    expect(rent.current.explanation.sources[0]).toMatchObject({ organisation: "ONS", period: "2026-07", geography: "Manchester" });
    expect(rent.destination.explanation.label).toBe("Your amount");
    expect(rent.destination.explanation.sources[0].geography).toBe("London");
    expect(product.periodDisclosure).toBe("Sources use different publication and effective periods.");
    expect(product).not.toHaveProperty("updatedAt");
    expect(product.periods.some((p) => p.period === "FYE 2024")).toBe(true);
    expect(classificationLabels.MODELLED_ESTIMATE).toBe("Estimate");
  });
  it("uses a qualified partial hero and does not call a partial residual amount left", () => {
    const { view, product } = evaluated(previewForm("partial"));
    expect(view.title).toBe("We can compare part of your monthly costs");
    expect(view.cards[3].label).toBe("After known costs — incomplete");
    expect(view.cards[3].state).toBe("PARTIAL");
    expect(product.headlines.residual).not.toHaveProperty("exact");
    expect(product.unresolved.find((i) => i.category === "water")?.action).toBe("ENTER_AMOUNT");
    expect(view.drivers.title).toContain("costs we can compare");
  });
  it("retains zero changes and does not claim exact equality after display rounding", () => {
    const { view, product } = evaluated(previewForm("unchanged"));
    expect(view.title).toBe("Your monthly household costs are about the same");
    expect(product.headlines.costs.display).toBe("£0 — no change");
    expect(view.drivers.unchanged).toHaveLength(8);
    expect(formatChange(engine.fromGbp("0.0001"))).toBe("+less than £0.01");
    expect(formatChange(engine.fromGbp("-0.0001"))).toBe("−less than £0.01");
    expect(formatMoney(engine.fromGbp("9007199254740993.01"))).toBe("£9,007,199,254,740,993.01");
  });
  it("keeps no-solution within the salary section without a capped salary", () => {
    const { product, view } = evaluated(previewForm("complete"), { maxGrossAnnualSalaryGbp: "1000" });
    expect(product.salary).toMatchObject({ state: "UNAVAILABLE", engineStatus: "NO_SOLUTION_WITHIN_BOUNDS" });
    expect(product.salary).not.toHaveProperty("grossAnnual");
    expect(view.salary.text).toBe("Salary result unavailable");
  });
  it("keeps fully unresolved comparisons limited without fabricated coverage or deltas", () => {
    const q = previewForm("limited");
    for (const side of [q.current, q.destination]) {
      side.cityId = "LOC-EDI";
      side.rent = { mode: "SOURCE" };
    }
    const { product, view } = evaluated(q);
    expect(product.completeness).toBe("LIMITED");
    expect(view.title).toBe("Your comparison needs more information");
    expect(view.coverage[0].text).toBe("0 of 8 cost categories resolved");
    expect(product.headlines.costs).not.toHaveProperty("exact");
    expect(view.drivers.entries).toHaveLength(0);
  });
  it("marks a negative complete buffer for presentation while retaining its signed amount", () => {
    const q = previewForm("complete");
    q.destination.income.netOverride = { amountGbp: "0" };
    const { view } = evaluated(q);
    expect(view.cards[3]).toMatchObject({ state: "AVAILABLE", negative: true, text: "−£2,870" });
  });
  it("is deterministic and leaves source data unchanged", () => {
    const q = previewForm("complete"), before = JSON.stringify(evidence.metadata);
    expect(evaluated(q)).toEqual(evaluated(q));
    expect(JSON.stringify(evidence.metadata)).toBe(before);
  });
  it("keeps presentation free of engine calls, data imports, persistence and finance logs", () => {
    const paths = ["src/components/report/ResultsPage.tsx", "src/features/calculator/development/ResultsPreview.tsx"];
    for (const path of paths) expect(readFileSync(path, "utf8")).not.toMatch(/from ["']@\/engine|data\/(generated|controlled|raw)|calculateIncome|calculateScenario|rankCostDrivers|solveSalary|parseFloat|localStorage|console\.log/);
    for (const file of readdirSync("src/product/calculator").filter((f) => f.endsWith(".ts"))) expect(readFileSync(`src/product/calculator/${file}`, "utf8")).not.toMatch(/localStorage|console\.log|fetch\(/);
  });
});
