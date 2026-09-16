import { describe, expect, it } from "vitest";
import { buildCalculatorInputsFromForm, calculateProductResult, classificationLabels, type CalculatorFormState } from "@/product/calculator";
import { emptyForm, changeField, validateJourney } from "@/product/calculator/journey";
import { createEvidenceLoader, fromGbp } from "@/engine";

// Locked closure inputs only. No production defaults or duplicated financial formulas.
function completeForm(): CalculatorFormState {
  let form = emptyForm();
  form = changeField(form, "household.adults", "1");
  form = changeField(form, "household.children", "0");
  for (const role of ["current", "destination"] as const) {
    const current = role === "current";
    const entries = {
      cityId: current ? "LOC-MAN" : "LOC-LEE", bedrooms: "2", effectiveOn: "2026-09-16", rentSourceMonth: "2026-07",
      "rent.mode": "SOURCE", "council.mode": "SOURCE", "council.authorityName": current ? "Manchester" : "Leeds", "council.band": "D",
      "income.grossAnnualSalaryGbp": current ? "50000" : "55000", "income.taxJurisdiction": "rUK", "income.taxYear": "2026/27", "income.scope": "ONE_EMPLOYEE_ONE_EMPLOYMENT",
      "spending.groceries.amountGbp": current ? "300" : "325", "spending.essentials.amountGbp": current ? "180" : "190", "energy.amountGbp": current ? "120" : "145",
      "water.mode": "AMOUNT", "water.amountGbp": current ? "45" : "48", "transport.mode": "AMOUNT", "transport.amountGbp": current ? "100" : "120", "spending.lifestyle.amountGbp": current ? "150" : "175",
    };
    for (const [path, value] of Object.entries(entries)) form = changeField(form, `${role}.${path}`, value);
  }
  return form;
}
const evidence = createEvidenceLoader();
function evaluate(form = completeForm()) {
  const result = calculateProductResult(form, evidence);
  if (result.state !== "EVALUATED") throw new Error("Closure fixture did not evaluate");
  return result;
}
const category = (result: ReturnType<typeof evaluate>, name: string) => result.product.breakdown.find((row) => row.category === name)!;

describe("Milestone 3 product closure acceptance", () => {
  it("preserves every locked complete output and eligible salary", () => {
    const { product: p, view } = evaluate();
    expect(validateJourney(completeForm())).toEqual([]);
    expect(p.completeness).toBe("COMPLETE");
    expect([p.current.costs.display, p.destination.costs.display]).toEqual(["£2,314.67", "£2,163.31"]);
    expect([p.current.income.display, p.destination.income.display]).toEqual(["£3,293.30", "£3,538.12"]);
    expect([p.current.residual.display, p.destination.residual.display]).toEqual(["£978.63", "£1,374.81"]);
    expect([p.headlines.costs.display, p.headlines.takeHome.display, p.headlines.residual.display]).toEqual(["−£151.36", "+£244.82", "+£396.18"]);
    expect(p.salary.state).toBe("AVAILABLE");
    if (p.salary.state !== "AVAILABLE") throw new Error("Expected eligible solver");
    expect(p.salary.grossAnnual.display).toBe("£47,477.35");
    expect(p.salary.proposedGross?.display).toBe("£55,000");
    expect(p.salary.targetResidual.display).toBe("£978.63");
    expect(p.salary.jurisdiction).toBe("rUK");
    for (const side of [p.current, p.destination]) expect(side.coverage).toEqual({ required: 8, resolved: 8, unresolved: 0, notApplicable: 0 });
    expect(view.salary.label).toBe("Salary needed to keep the same monthly buffer");
  });
  it("keeps missing destination energy and transport partial with actionable gaps", () => {
    const form = completeForm();
    form.destination.energy = { mode: "UNKNOWN" };
    form.destination.transport = { mode: "UNKNOWN" };
    expect(validateJourney(form)).toEqual([]);
    const r = evaluate(form), p = r.product;
    expect(p.completeness).toBe("PARTIAL");
    expect(p.destination.coverage).toEqual({ required: 8, resolved: 6, unresolved: 2, notApplicable: 0 });
    expect(p.destination.costs).toMatchObject({ state: "PARTIAL", display: "£1,898.31" });
    expect(p.destination.residual).toMatchObject({ state: "PARTIAL", display: "£1,639.81" });
    for (const name of ["energy", "transport"]) {
      expect(category(r, name).destination).toMatchObject({ state: "UNAVAILABLE", display: "Needs input" });
      expect(category(r, name).destination.exact).toBeUndefined();
      expect(p.unresolved.some((i) => i.role === "destination" && i.category === name && i.userActionPossible)).toBe(true);
    }
    for (const metric of [p.headlines.costs, p.headlines.residual]) { expect(metric.state).not.toBe("AVAILABLE"); expect(metric.exact).toBeUndefined(); }
    expect(p.headlines.takeHome.display).toBe("+£244.82");
    expect(p.salary).toMatchObject({ state: "UNAVAILABLE", engineStatus: "INELIGIBLE" });
    expect(r.view.cards[3].label).toBe("After known costs — incomplete");
    expect(p.drivers.excluded.map((i) => i.category)).toEqual(["energy", "transport"]);
  });
  it("keeps override precedence and source/gross baselines without evidence mutation", () => {
    const baseline = evaluate(), form = completeForm();
    for (const role of ["current", "destination"] as const) {
      const current = role === "current";
      form[role].rent = { mode: "AMOUNT", amountGbp: current ? "1000" : "1200" };
      form[role].income.netOverride = { amountGbp: current ? "3100" : "3600" };
      form[role].council = { mode: "AMOUNT", amountGbp: current ? "200" : "210", selection: { authorityName: current ? "Manchester" : "Leeds", band: "D" } };
    }
    const before = structuredClone(form), r = evaluate(form);
    expect(form).toEqual(before);
    expect(r.product.completeness).toBe("COMPLETE");
    for (const role of ["current", "destination"] as const) {
      expect(category(r, "rent")[role].display).toBe(role === "current" ? "£1,000" : "£1,200");
      expect(category(r, "council_tax")[role].display).toBe(role === "current" ? "£200" : "£210");
      for (const name of ["rent", "council_tax"]) {
        expect(category(r, name)[role].explanation).toMatchObject({ classification: "USER_ENTERED", label: "Your amount", baselineStatus: "AVAILABLE" });
        expect(category(r, name)[role].explanation.sources).toEqual(category(baseline, name)[role].explanation.sources);
      }
      expect(r.product[role].income.explanation).toMatchObject({ label: "Your amount", baselineStatus: "AVAILABLE" });
      expect(r.product[role].income.explanation.sources).toEqual(baseline.product[role].income.explanation.sources);
    }
    expect(r.adapter.destination.input?.location.income.grossAnnualSalaryGbp).toBe("55000");
    expect(r.product.destination.income.display).toBe("£3,600");
    expect(r.product.salary.state).toBe("UNAVAILABLE");
    expect(r.view.salary.detail).toContain("override");
    expect(evaluate()).toEqual(baseline);
  });
  it("distinguishes resolved zero transport/lifestyle from blank and explicit no-cost", () => {
    let form = completeForm();
    form = changeField(form, "destination.transport.amountGbp", "0");
    form = changeField(form, "destination.spending.lifestyle.amountGbp", "0");
    const zero = evaluate(form);
    for (const name of ["transport", "lifestyle"]) expect(category(zero, name).destination).toMatchObject({ state: "AVAILABLE", exact: fromGbp("0"), display: "£0", explanation: { label: "Your amount" } });
    expect(zero.product.destination.coverage?.resolved).toBe(8);
    form = changeField(form, "destination.spending.lifestyle.amountGbp", "");
    form = changeField(form, "destination.transport.mode", "UNKNOWN");
    const missing = evaluate(form);
    for (const name of ["transport", "lifestyle"]) { expect(category(missing, name).destination.state).toBe("UNAVAILABLE"); expect(category(missing, name).destination.exact).toBeUndefined(); }
    form = changeField(form, "destination.transport.mode", "NONE");
    expect(category(evaluate(form), "transport").destination.state).toBe("NOT_APPLICABLE");
  });
  it("keeps Edinburgh published rent unresolved and resolves only rent with an override", () => {
    const form = completeForm();
    form.destination.cityId = "LOC-EDI";
    form.destination.council = { mode: "AMOUNT", amountGbp: "200" };
    form.destination.energy = { mode: "UNKNOWN" };
    const gap = evaluate(form);
    expect(category(gap, "rent").destination.state).toBe("UNAVAILABLE");
    expect(category(gap, "rent").destination.exact).toBeUndefined();
    expect(gap.product.completeness).toBe("PARTIAL");
    expect(gap.product.destination.coverage?.resolved).toBe(6);
    form.destination.rent = { mode: "AMOUNT", amountGbp: "1400" };
    const override = evaluate(form);
    expect(category(override, "rent").destination).toMatchObject({ state: "AVAILABLE", display: "£1,400", explanation: { label: "Your amount", baselineStatus: "UNAVAILABLE" } });
    expect(category(override, "energy").destination.state).toBe("UNAVAILABLE");
    expect(override.product.destination.coverage?.resolved).toBe(7);
  });
  it("does not invent a London authority or charge and supports an explicit amount", () => {
    const form = completeForm();
    form.destination.cityId = "LOC-LON";
    form.destination.council = { mode: "UNKNOWN" };
    const gap = evaluate(form);
    expect(gap.adapter.destination.input?.location.housing.councilTax).toBeUndefined();
    expect(category(gap, "council_tax").destination.state).toBe("UNAVAILABLE");
    expect(category(gap, "council_tax").destination.exact).toBeUndefined();
    expect(gap.product.destination.coverage?.resolved).toBe(7);
    expect(gap.product.unresolved.some((i) => i.category === "council_tax" && i.userActionPossible)).toBe(true);
    form.destination.council = { mode: "AMOUNT", amountGbp: "200" };
    const own = evaluate(form);
    expect(category(own, "council_tax").destination).toMatchObject({ state: "AVAILABLE", display: "£200", explanation: { label: "Your amount", baselineStatus: "UNAVAILABLE" } });
    expect(own.product.destination.coverage?.resolved).toBe(8);
  });
  it("keeps jurisdiction explicit independently of city", () => {
    const form = completeForm();
    form.destination.income.taxJurisdiction = "Scotland";
    const scottish = evaluate(form);
    expect(scottish.product.destination.income.state).toBe("AVAILABLE");
    expect(scottish.product.salary.state === "AVAILABLE" && scottish.product.salary.jurisdiction).toBe("Scotland");
    form.destination.income.taxJurisdiction = "";
    expect(validateJourney(form).some((i) => i.path === "destination.income.taxJurisdiction")).toBe(true);
    expect(buildCalculatorInputsFromForm(form).destination.input?.location.income.taxJurisdiction).toBeUndefined();
  });
  it("retains classifications, category periods, source links and ranking order in the view", () => {
    const r = evaluate();
    expect(classificationLabels).toEqual({ OBSERVED_DATA: "Official data", CALCULATED: "Calculated", USER_ENTERED: "Your amount", MODELLED_ESTIMATE: "Estimate" });
    expect(category(r, "rent").current.explanation).toMatchObject({ label: "Official data", sources: [expect.objectContaining({ organisation: "ONS", period: "2026-07", url: expect.stringMatching(/^https:/) })] });
    expect(category(r, "council_tax").current.explanation.label).toBe("Calculated");
    expect(category(r, "groceries").current.explanation.label).toBe("Your amount");
    expect(new Set(r.product.periods.map((p) => p.period)).size).toBeGreaterThan(1);
    expect(category(r, "rent").current.explanation.limitations.length).toBeGreaterThan(0);
    expect(r.view.drivers.entries.map((d) => [d.category, d.rank, d.display])).toEqual(r.product.drivers.ranked.filter((d) => d.direction !== "NO_CHANGE").map((d) => [d.category, d.rank, d.display]));
  });
  it("rejects unsupported data at the single adapter gate", () => {
    const form = completeForm();
    expect(buildCalculatorInputsFromForm({ ...form, affordabilityScore: 80 }).current.state).toBe("INVALID");
    form.destination.cityId = "LOC-UNKNOWN";
    expect(calculateProductResult(form, evidence).state).toBe("INPUT_REQUIRED");
  });
  it("never fabricates a product for empty state", () => {
    const result = calculateProductResult(emptyForm(), evidence);
    expect(result.state).toBe("INPUT_REQUIRED");
    expect(result.product).toBeUndefined();
    expect(result.view).toBeUndefined();
  });
});
