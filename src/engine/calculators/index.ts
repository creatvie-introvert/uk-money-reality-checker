import { calculateIncomeTax, calculateEmployeeNi } from "./income";
import type { EvidenceLoader } from "../loaders";
import type { NormalizedInput, NormalizedLocation } from "../contracts/input";
import type { CategoryResult } from "../contracts/output";
import { categorySchema, type Category, type DiagnosticCode } from "../diagnostics";
import { monthlyEquivalent } from "../money";
export { calculateRent, calculateCouncilTax } from "./housing";
import { calculateMonthlyCostCategory } from "./household";

export interface CategoryCalculatorContext {
  household: NormalizedInput["household"];
  location: NormalizedLocation;
  evidence: EvidenceLoader;
}
export type CategoryCalculator<C extends Category> = (context: CategoryCalculatorContext) => CategoryResult & { category: C };
export type CategoryCalculators = { [C in Category]: CategoryCalculator<C> };
function unsupportedCategory(category: Category, context: CategoryCalculatorContext): CategoryResult {
  categorySchema.parse(category);
  const cityId = context.location.cityId;
  const code: DiagnosticCode = category === "energy" ? "ENERGY_CITY_REGION_MAPPING_UNRESOLVED"
    : category === "water" ? cityId === "LOC-BIR" ? "BIRMINGHAM_WATER_APPLICABILITY_UNRESOLVED" : "WATER_APPLICABILITY_UNRESOLVED"
    : category === "groceries" || category === "household_spending" ? "HOUSEHOLD_SPENDING_MODEL_NOT_IMPLEMENTED"
    : category === "transport" && context.location.transport.status === "UNRESOLVED" ? "TRANSPORT_CITY_DEFAULT_PRODUCT_UNRESOLVED" : "CALCULATOR_NOT_IMPLEMENTED";
  const message = category === "transport" ? "Selected products do not establish monthly spending; no default, frequency calculation or optimizer is implemented."
    : category === "groceries" || category === "household_spending" ? "National reference evidence does not establish a household budget or approved Essentials/Lifestyle mapping."
    : category === "water" ? "Provider, address and billing-regime applicability and bill arithmetic remain unimplemented."
    : category === "energy" ? "City-region applicability and household consumption modelling remain unresolved."
    : "Calculator arithmetic is not implemented in this kickoff slice.";
  return { status: "UNRESOLVED", category, cityId, inputUsed: structuredClone(context.location), evidenceLineage: [], diagnostics: [{ code, category, cityId, severity: "blocking", kind: ["groceries", "household_spending"].includes(category) ? "model_required" : "unsupported_combination", message }], limitations: [message], canResolveWithUserInput: false };
}
function incomeCategory(context: CategoryCalculatorContext, category: "income_tax" | "national_insurance"): CategoryResult {
  const { income } = context.location;
  const common = { grossAnnualSalaryGbp: income.grossAnnualSalaryGbp, taxYear: income.taxYear, scope: income.scope, basis: income.calculationBasis, effectiveOn: context.location.effectiveOn };
  const calculation = category === "income_tax"
    ? calculateIncomeTax(context.evidence, { ...common, jurisdiction: income.taxJurisdiction })
    : calculateEmployeeNi(context.evidence, { ...common, niCategory: income.niCategory });
  const base = { category, cityId: context.location.cityId, inputUsed: structuredClone(income), diagnostics: calculation.diagnostics, limitations: calculation.limitations };
  if (calculation.status === "UNRESOLVED") return { ...base, status: "UNRESOLVED", evidenceLineage: [], canResolveWithUserInput: false };
  const annualAmount = "incomeTax" in calculation ? calculation.incomeTax : calculation.employeeNi;
  return { ...base, status: "RESOLVED", monthlyAmount: monthlyEquivalent(annualAmount, "ANNUAL"), classification: "CALCULATED", lineageClassifications: calculation.lineageClassifications,
    evidenceLineage: calculation.evidenceLineage, baselineEvidence: { status: "AVAILABLE", records: calculation.evidenceLineage }, overrideStatus: "NONE", amountBasis: "MATHEMATICAL_MONTHLY_EQUIVALENT",
    formula: { expression: "annual calculated liability / 12", version: calculation.calculationVersion }, incomeBreakdown: calculation,
  };
}

// Full calculator implementations will satisfy this same registry interface.
export const categoryCalculators: CategoryCalculators = {
  rent: (c) => calculateMonthlyCostCategory(c, "rent") as CategoryResult & { category: "rent" },
  council_tax: (c) => calculateMonthlyCostCategory(c, "council_tax") as CategoryResult & { category: "council_tax" },
  income_tax: (c) => incomeCategory(c, "income_tax") as CategoryResult & { category: "income_tax" },
  national_insurance: (c) => incomeCategory(c, "national_insurance") as CategoryResult & { category: "national_insurance" },
  energy: (c) => calculateMonthlyCostCategory(c, "energy") as CategoryResult & { category: "energy" },
  water: (c) => calculateMonthlyCostCategory(c, "water") as CategoryResult & { category: "water" },
  groceries: (c) => calculateMonthlyCostCategory(c, "groceries") as CategoryResult & { category: "groceries" },
  essentials: (c) => calculateMonthlyCostCategory(c, "essentials") as CategoryResult & { category: "essentials" },
  lifestyle: (c) => calculateMonthlyCostCategory(c, "lifestyle") as CategoryResult & { category: "lifestyle" },
  household_spending: (c) => unsupportedCategory("household_spending", c) as CategoryResult & { category: "household_spending" },
  transport: (c) => calculateMonthlyCostCategory(c, "transport") as CategoryResult & { category: "transport" },
};
