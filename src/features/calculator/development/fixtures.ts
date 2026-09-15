import type { CalculatorFormState, FormLocation } from "@/product/calculator/contracts";
/** Development inputs only. Values are deliberate fixture declarations, never production defaults. */
const amount = (amountGbp: string) => ({ mode: "AMOUNT" as const, amountGbp });
function location(): FormLocation {
  return {
    cityId: "LOC-MAN", effectiveOn: "2026-09-14", bedrooms: "2", rentSourceMonth: "2026-07",
    rent: { mode: "SOURCE" }, council: { mode: "SOURCE", authorityName: "Manchester", band: "D" },
    water: amount("55"), energy: amount("120"),
    spending: { groceries: amount("300"), essentials: amount("80"), lifestyle: amount("100") }, transport: amount("70"),
    income: { grossAnnualSalaryGbp: "50000", taxJurisdiction: "rUK", taxYear: "2026/27", niCategory: "A", scope: "ONE_EMPLOYEE_ONE_EMPLOYMENT", calculationBasis: "ANNUAL_COMPARISON" },
  };
}
export const previewNames = { complete: "Complete rUK", partial: "Partial costs", override: "Your amount", unchanged: "No change", limited: "Unavailable income", scotland: "Scotland" } as const;
export type PreviewName = keyof typeof previewNames;
export function previewForm(name: PreviewName): CalculatorFormState {
  const form = { household: { adults: "2", children: "0" }, current: location(), destination: location() };
  form.destination.cityId = "LOC-LON";
  form.destination.rent = amount("1850");
  form.destination.council = amount("190");
  form.destination.energy = amount("140");
  form.destination.spending.groceries = amount("320");
  form.destination.spending.lifestyle = amount("145");
  form.destination.transport = amount("90");
  form.destination.income.grossAnnualSalaryGbp = "60000";
  if (name === "partial") form.destination.water = { mode: "UNKNOWN" };
  if (name === "override") {
    form.current.income.netOverride = { amountGbp: "2800", note: "Development fixture: actual monthly take-home" };
    form.destination.income.netOverride = { amountGbp: "2900" };
  }
  if (name === "unchanged") form.destination = structuredClone(form.current);
  if (name === "limited") {
    for (const q of [form.current, form.destination]) {
      q.income.grossAnnualSalaryGbp = "";
      q.energy = { mode: "UNKNOWN" }; q.water = { mode: "UNKNOWN" };
      q.spending = { groceries: { mode: "UNKNOWN" }, essentials: { mode: "UNKNOWN" }, lifestyle: { mode: "UNKNOWN" } };
      q.transport = { mode: "UNKNOWN" }; q.council = { mode: "UNKNOWN" };
    }
  }
  if (name === "scotland") {
    for (const q of [form.current, form.destination]) {
      q.cityId = "LOC-GLA"; q.rent = { mode: "SOURCE" }; q.income.taxJurisdiction = "Scotland";
      q.council = { mode: "SOURCE", authorityName: "Glasgow City", band: "D" };
      q.water = { mode: "SOURCE", band: "D", connectedServices: "combined" };
    }
    form.current.income.grossAnnualSalaryGbp = "60000";
    form.destination.income.grossAnnualSalaryGbp = "90000";
  }
  return form;
}
