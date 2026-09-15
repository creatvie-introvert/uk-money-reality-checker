import { describe, expect, it } from "vitest";
import { changeField, emptyForm, fieldValue, reviewSections, validateJourney, validateStep } from "@/product/calculator/journey";
import { initialJourney, journeyReducer } from "@/features/calculator/journey/state";
import { buildCalculatorInputsFromForm, calculateProductResult } from "@/product/calculator";
import { previewForm } from "@/features/calculator/development/fixtures";

describe("canonical journey state", () => {
  it("initializes empty with distinct scenarios and no financial defaults", () => {
    const a = initialJourney();
    expect(a.form.current.cityId).toBe(""); expect(a.form.current.income.grossAnnualSalaryGbp).toBe("");
    expect(a.form.current.rent).toEqual({ mode: "UNKNOWN" });
    expect(a.form.current).not.toBe(a.form.destination); expect(a.completed).toEqual([]); expect(a.result).toBeUndefined();
  });
  it("preserves distinct values across navigation and edits, then restarts cleanly", () => {
    let s = initialJourney();
    s = journeyReducer(s, { type: "CHANGE", path: "current.income.grossAnnualSalaryGbp", value: "50000", step: "income" });
    s = journeyReducer(s, { type: "CHANGE", path: "destination.spending.lifestyle.amountGbp", value: "75", step: "lifestyle" });
    s = journeyReducer(s, { type: "COMPLETE", step: "income" });
    s = journeyReducer(s, { type: "EDIT" });
    expect(s.form.current.income.grossAnnualSalaryGbp).toBe("50000");
    expect(s.form.destination.income.grossAnnualSalaryGbp).toBe("");
    expect(fieldValue(s.form, "destination.spending.lifestyle.amountGbp")).toBe("75");
    expect(journeyReducer(s, { type: "RESTART" })).toEqual(initialJourney());
  });
  it("distinguishes missing from explicit zero and clears net override explicitly", () => {
    let f = changeField(emptyForm(), "current.spending.lifestyle.amountGbp", "0");
    expect(f.current.spending.lifestyle).toEqual({ mode: "AMOUNT", amountGbp: "0" });
    f = changeField(f, "current.spending.lifestyle.amountGbp", "");
    expect(f.current.spending.lifestyle).toEqual({ mode: "UNKNOWN" });
    f = changeField(f, "current.income.netOverride.amountGbp", "0");
    expect(f.current.income.netOverride?.amountGbp).toBe("0");
    f = changeField(f, "current.income.netOverride.amountGbp", "");
    expect(f.current.income.netOverride).toBeUndefined();
  });
  it("invalidates a stored result on any edit", () => {
    const r = calculateProductResult(previewForm("complete"));
    if (r.state !== "EVALUATED") throw new Error("fixture failed");
    const s = journeyReducer(initialJourney(), { type: "RESULT", result: r });
    expect(journeyReducer(s, { type: "CHANGE", path: "current.cityId", value: "LOC-MAN", step: "start" }).result).toBeUndefined();
  });
  it("retains explicitly selected council and water baselines when entering overrides", () => {
    let f = changeField(previewForm("scotland"), "current.council.mode", "AMOUNT");
    f = changeField(f, "current.council.amountGbp", "180");
    f = changeField(f, "current.water.mode", "AMOUNT");
    f = changeField(f, "current.water.amountGbp", "55");
    expect(f.current.council).toMatchObject({ selection: { authorityName: "Glasgow City", band: "D" } });
    expect(f.current.water).toMatchObject({ selection: { band: "D", connectedServices: "combined" } });
    expect(buildCalculatorInputsFromForm(f).current.state).toBe("READY");
    f = changeField(f, "current.water.mode", "SOURCE");
    expect(f.current.water).toEqual({ mode: "SOURCE", band: "D", connectedServices: "combined" });
  });
});
describe("step validation and adapter gate", () => {
  it("allows same cities but blocks unsupported cities", () => {
    let f = previewForm("unchanged"); expect(validateStep(f, "start")).toEqual([]);
    f = changeField(f, "current.cityId", "Paris"); expect(validateStep(f, "start")[0].path).toBe("current.cityId");
  });
  it.each(["-1", "1.234", "1,000", "abc"])("blocks invalid salary %s", (value) => {
    const f = changeField(previewForm("complete"), "current.income.grossAnnualSalaryGbp", value);
    expect(validateStep(f, "income").some((e) => e.path.endsWith("grossAnnualSalaryGbp"))).toBe(true);
  });
  it("requires explicit jurisdiction and scope for salary-based income", () => {
    let f = changeField(previewForm("complete"), "current.income.taxJurisdiction", "");
    expect(validateStep(f, "income")[0].path).toBe("current.income.taxJurisdiction");
    f = changeField(f, "current.income.netOverride.amountGbp", "2800");
    expect(validateStep(f, "income")).toEqual([]);
  });
  it("preserves optional energy, transport and London council gaps", () => {
    const f = previewForm("complete"); f.destination.energy = { mode: "UNKNOWN" }; f.destination.transport = { mode: "UNKNOWN" }; f.destination.council = { mode: "UNKNOWN" };
    expect(validateJourney(f)).toEqual([]);
    const a = buildCalculatorInputsFromForm(f);
    if (a.destination.state !== "READY") throw new Error("unexpected blocked form");
    expect(a.destination.input.location.housing.councilTax).toBeUndefined();
    expect(a.destination.input.location.housing.overrides.energy).toBeUndefined();
    expect(a.destination.input.location.transport.status).toBe("UNRESOLVED");
    const r = calculateProductResult(f); expect(r.state === "EVALUATED" && r.product.completeness).toBe("PARTIAL");
  });
  it("permits unresolved Edinburgh rent after explicit source selection", () => {
    const f = previewForm("complete"); f.destination.cityId = "LOC-EDI"; f.destination.rent = { mode: "SOURCE" };
    expect(validateJourney(f)).toEqual([]);
    const r = calculateProductResult(f); expect(r.state === "EVALUATED" && r.product.headlines.costs.state).toBe("PARTIAL");
  });
  it("does not default Scottish water services while selecting source mode", () => {
    const f = changeField(previewForm("scotland"), "destination.water.mode", "SOURCE");
    expect(f.destination.water).toEqual({ mode: "SOURCE", band: "", connectedServices: "" });
    expect(validateJourney(f)).toEqual([]);
    const a = buildCalculatorInputsFromForm(f);
    expect(a.destination.state === "READY" && a.destination.input.location.housing.water).toBeUndefined();
  });
  it("blocks impossible counts and empty selected override", () => {
    let f = changeField(previewForm("complete"), "household.adults", "0");
    expect(validateStep(f, "household")[0].path).toBe("household.adults");
    f = changeField(previewForm("complete"), "destination.rent.mode", "AMOUNT");
    expect(validateStep(f, "household").some((e) => e.path === "destination.rent.amountGbp")).toBe(true);
  });
  it("review shows canonical entered values without calculated totals", () => {
    const f = changeField(previewForm("complete"), "destination.income.grossAnnualSalaryGbp", "61000.01");
    const review = JSON.stringify(reviewSections(f));
    expect(review).toContain("£61000.01 — your entered amount");
    expect(review).toContain("£145 — your entered amount");
    expect(review).not.toContain("requiredGrossAnnualSalary");
    expect(validateJourney(f)).toEqual([]);
  });
});
