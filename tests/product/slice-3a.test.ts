import { expect, it } from "vitest";
import { calculateProductResult } from "@/product/calculator";
import { emptyForm, changeField } from "@/product/calculator/journey";

it("preserves the manually reconciled Manchester to Leeds comparison", () => {
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
  const result = calculateProductResult(form);
  if (result.state !== "EVALUATED") throw new Error("Comparison did not evaluate");
  const p = result.product;
  expect([p.current.costs.display, p.destination.costs.display]).toEqual(["£2,314.67", "£2,163.31"]);
  expect([p.current.income.display, p.destination.income.display]).toEqual(["£3,293.30", "£3,538.12"]);
  expect([p.current.residual.display, p.destination.residual.display]).toEqual(["£978.63", "£1,374.81"]);
  expect([p.headlines.costs.display, p.headlines.takeHome.display, p.headlines.residual.display]).toEqual(["−£151.36", "+£244.82", "+£396.18"]);
  expect(p.salary.state).toBe("AVAILABLE");
  if (p.salary.state !== "AVAILABLE") throw new Error("Preservation salary unavailable");
  expect(p.salary.grossAnnual.display).toBe("£47,477.35");
  expect(p.salary.proposedGross?.display).toBe("£55,000");
  expect(p.current.coverage).toMatchObject({ resolved: 8, required: 8 });
  expect(p.destination.coverage).toMatchObject({ resolved: 8, required: 8 });
});
