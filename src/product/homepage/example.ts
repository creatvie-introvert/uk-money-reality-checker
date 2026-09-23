import { calculateProductResult } from "@/product/calculator/orchestrator";
import type { CalculatorFormState, FormLocation } from "@/product/calculator/contracts";
import { formatMoney } from "@/product/calculator/formatting";
import { fromGbp } from "@/engine/money";

/** Declared illustration only; never imported into the visitor's calculator state. */
export function manchesterLeedsHomepageScenario(): CalculatorFormState {
  const amount = (amountGbp: string) => ({ mode: "AMOUNT" as const, amountGbp });
  function location(current: boolean): FormLocation {
    return {
      cityId: current ? "LOC-MAN" : "LOC-LEE", bedrooms: "2", effectiveOn: "2026-09-16", rentSourceMonth: "2026-07",
      rent: { mode: "SOURCE" }, council: { mode: "SOURCE", authorityName: current ? "Manchester" : "Leeds", band: "D" },
      income: { grossAnnualSalaryGbp: current ? "50000" : "55000", taxJurisdiction: "rUK", taxYear: "2026/27", niCategory: "A", scope: "ONE_EMPLOYEE_ONE_EMPLOYMENT", calculationBasis: "ANNUAL_COMPARISON" },
      spending: { groceries: amount(current ? "300" : "325"), essentials: amount(current ? "180" : "190"), lifestyle: amount(current ? "150" : "175") },
      energy: amount(current ? "120" : "145"), water: amount(current ? "45" : "48"), transport: amount(current ? "100" : "120"),
    };
  }
  return { household: { adults: "1", children: "0" }, current: location(true), destination: location(false) };
}

/** Called only by the server-rendered HomepageExample. No financial arithmetic here. */
export function buildHomepageExample() {
  const form = manchesterLeedsHomepageScenario();
  const result = calculateProductResult(form);
  if (result.state !== "EVALUATED" || result.product.completeness !== "COMPLETE" ||
      Object.values(result.product.headlines).some((metric) => metric.state !== "AVAILABLE") ||
      [result.product.current, result.product.destination].some((side) => side.coverage?.resolved !== 8)) {
    throw new Error("Homepage Manchester–Leeds example is incomplete. Review the scenario and released evidence before publishing.");
  }
  return {
    form, product: result.product, view: result.view,
    salaries: [form.current, form.destination].map((side) => formatMoney(fromGbp(side.income.grossAnnualSalaryGbp))),
    enteredRows: result.product.breakdown.filter((row) => row.current.explanation.classification === "USER_ENTERED" && row.destination.explanation.classification === "USER_ENTERED"),
    evidence: [result.product.current, result.product.destination].map((side, index) => ({
      name: side.name,
      categories: result.product.breakdown.filter((row) => row.category === "rent" || row.category === "council_tax")
        .map((row) => ({ label: row.label, explanation: (index === 0 ? row.current : row.destination).explanation })),
      income: side.income.explanation,
    })),
  };
}
