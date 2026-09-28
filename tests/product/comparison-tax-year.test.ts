import { describe, expect, it } from "vitest";
import { changeField, comparisonTaxYearPath, emptyForm, fieldValue, reviewSections, validateStep } from "@/product/calculator/journey";
import { initialJourney, journeyReducer } from "@/features/calculator/journey/state";
import { previewForm } from "@/features/calculator/development/fixtures";
import { buildCalculatorInputsFromForm } from "@/product/calculator/adapter";

describe("shared comparison tax year", () => {
  it("starts blank and atomically updates canonical fields without extra state", () => {
    const initial = initialJourney();
    expect(fieldValue(initial.form, comparisonTaxYearPath)).toBe("");
    const next = journeyReducer({ ...initial, completed: ["income"] }, { type: "CHANGE", path: comparisonTaxYearPath, value: "2026/27", step: "income" });
    expect(next.form.current.income.taxYear).toBe("2026/27");
    expect(next.form.destination.income.taxYear).toBe("2026/27");
    expect(next.form).not.toHaveProperty("comparison");
    expect(next.completed).not.toContain("income");
    expect(initial.form.current.income.taxYear).toBe("");
    expect(journeyReducer(next, { type: "RESTART" })).toEqual(initialJourney());
  });
  for (const current of ["calculated", "override", "unknown"]) for (const destination of ["calculated", "override", "unknown"]) {
    it(`validates a shared blank year for ${current}/${destination}`, () => {
      let form = emptyForm();
      for (const [role, mode] of [["current", current], ["destination", destination]] as const) {
        form = changeField(form, `${role}.income.taxJurisdiction`, role === "current" ? "rUK" : "Scotland");
        form = changeField(form, `${role}.income.scope`, "ONE_EMPLOYEE_ONE_EMPLOYMENT");
        if (mode !== "unknown") form = changeField(form, `${role}.income.grossAnnualSalaryGbp`, "50000");
        if (mode === "override") form = changeField(form, `${role}.income.netOverride.amountGbp`, "0");
      }
      const errors = validateStep(form, "income");
      expect(errors).toEqual(current === "calculated" || destination === "calculated" ? [{ path: comparisonTaxYearPath, message: "Choose the tax year for this comparison.", step: "income" }] : []);
      form = changeField(form, comparisonTaxYearPath, "2026/27");
      expect(validateStep(form, "income")).toEqual([]);
      expect(form.current.income.taxJurisdiction).toBe("rUK");
      expect(form.destination.income.taxJurisdiction).toBe("Scotland");
      form = changeField(form, "destination.cityId", "LOC-LON");
      expect(form.destination.income.taxJurisdiction).toBe("Scotland");
    });
  }
  it("does not reconcile mismatched legacy values without explicit action", () => {
    const form = emptyForm(); form.current.income.taxYear = "2026/27";
    const before = structuredClone(form);
    expect(fieldValue(form, comparisonTaxYearPath)).toBe("");
    expect(validateStep(form, "income")[0]).toMatchObject({ path: comparisonTaxYearPath, message: expect.stringContaining("differ") });
    expect(form).toEqual(before);
    expect(validateStep(changeField(form, comparisonTaxYearPath, ""), "income")).toEqual([]);
    expect(validateStep(changeField(form, comparisonTaxYearPath, "2026/27"), "income")).toEqual([]);
  });
  it("keeps the adapter shape and shows the year once on Review", () => {
    const form = changeField(previewForm("complete"), comparisonTaxYearPath, "2026/27");
    const adapted = buildCalculatorInputsFromForm(form);
    for (const role of ["current", "destination"] as const) {
      expect(adapted[role].state).toBe("READY");
      expect(adapted[role].input?.location.income.taxYear).toBe("2026/27");
    }
    const rows = reviewSections(form).flatMap((s) => s.groups.flatMap((g) => g.rows));
    expect(rows.filter((r) => r.label.includes("Tax year"))).toEqual([{ label: "Tax year for this comparison", secondary: false, value: "2026/27" }]);
    expect(rows.some((r) => r.label === "Income tax year")).toBe(false);
  });
});
