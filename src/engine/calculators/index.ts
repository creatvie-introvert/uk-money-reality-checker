import type { EvidenceLoader, EvidenceRecord } from "../loaders";
import type { NormalizedInput, NormalizedLocation } from "../contracts/input";
import type { CategoryResult, EvidenceResolution, EngineEvidence } from "../contracts/output";
import { categorySchema, type Category, type DiagnosticCode } from "../diagnostics";
import { fromGbp, monthlyEquivalent } from "../money";
import { resolveRent, resolveCouncilTax, type RentRequest, type CouncilTaxRequest } from "../resolution";

function monthlyResult<T extends EngineEvidence>(resolution: EvidenceResolution<T>, inputUsed: unknown, amount: (r: T) => { amount: ReturnType<typeof fromGbp>; converted: boolean }): CategoryResult {
  const base = { category: resolution.category, cityId: resolution.cityId, inputUsed: structuredClone(inputUsed), evidenceLineage: resolution.baselineEvidence.records, diagnostics: resolution.diagnostics, limitations: resolution.limitations };
  if (resolution.status === "UNRESOLVED") return { ...base, status: "UNRESOLVED", canResolveWithUserInput: resolution.canResolveWithUserInput };
  if (resolution.status === "USER_OVERRIDE") return { ...base, status: "RESOLVED", monthlyAmount: resolution.effectiveInput.amount, classification: "USER_ENTERED", lineageClassifications: [...resolution.baselineEvidence.records.map((r) => r.valueType), "USER_ENTERED"], overrideStatus: "USER_OVERRIDE", baselineEvidence: resolution.baselineEvidence, amountBasis: "USER_DECLARED_MONTHLY" };
  const value = amount(resolution.effectiveInput.records[0]);
  return { ...base, status: "RESOLVED", monthlyAmount: value.amount, classification: value.converted ? "CALCULATED" : "OBSERVED_DATA", lineageClassifications: value.converted ? ["OBSERVED_DATA", "CALCULATED"] : ["OBSERVED_DATA"], overrideStatus: "NONE", baselineEvidence: resolution.baselineEvidence, amountBasis: value.converted ? "MATHEMATICAL_MONTHLY_EQUIVALENT" : "SOURCE_MONTH", ...(value.converted ? { formula: { expression: "annualGbp / 12", version: "annual-monthly-equivalent-v1" } } : {}) };
}
/** Published monthly rent; source month and source geography remain in lineage. */
export function calculateRent(loader: EvidenceLoader, request: RentRequest): CategoryResult {
  return monthlyResult(resolveRent(loader, request), request, (r: EvidenceRecord<"rent">) => ({ amount: fromGbp(String(r.valueGbp)), converted: false }));
}
/** Equivalent of published annual band charge, not an assessed household bill or instalment. */
export function calculateCouncilTax(loader: EvidenceLoader, request: CouncilTaxRequest): CategoryResult {
  const result = monthlyResult(resolveCouncilTax(loader, request), request, (r: EvidenceRecord<"councilTax">) => ({ amount: monthlyEquivalent(fromGbp(r.qa.displayedAnnualGbp), "ANNUAL"), converted: true }));
  return { ...result, limitations: [...result.limitations, "Annual published authority/band charge divided by 12; discounts, exemptions, parish/address applicability and actual instalment schedules are not calculated."] };
}
export interface CategoryCalculatorContext {
  household: NormalizedInput["household"];
  location: NormalizedLocation;
  evidence: EvidenceLoader;
}
export type CategoryCalculator<C extends Category> = (context: CategoryCalculatorContext) => CategoryResult & { category: C };
export type CategoryCalculators = { [C in Category]: CategoryCalculator<C> };
export function unsupportedCategory(category: Category, context: CategoryCalculatorContext): CategoryResult {
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
// Full calculator implementations will satisfy this same registry interface.
export const categoryCalculators: CategoryCalculators = {
  rent: ({ location, evidence }) => calculateRent(evidence, { cityId: location.cityId, bedrooms: location.housing.bedrooms, sourcePeriod: location.housing.rentSourceMonth, propertyType: location.housing.propertyType, override: location.housing.overrides.rent }) as CategoryResult & { category: "rent" },
  council_tax: ({ location, evidence }) => calculateCouncilTax(evidence, { cityId: location.cityId, effectiveOn: location.effectiveOn, selection: location.housing.councilTax, override: location.housing.overrides.councilTax }) as CategoryResult & { category: "council_tax" },
  income_tax: (c) => unsupportedCategory("income_tax", c) as CategoryResult & { category: "income_tax" },
  national_insurance: (c) => unsupportedCategory("national_insurance", c) as CategoryResult & { category: "national_insurance" },
  energy: (c) => unsupportedCategory("energy", c) as CategoryResult & { category: "energy" },
  water: (c) => unsupportedCategory("water", c) as CategoryResult & { category: "water" },
  groceries: (c) => unsupportedCategory("groceries", c) as CategoryResult & { category: "groceries" },
  household_spending: (c) => unsupportedCategory("household_spending", c) as CategoryResult & { category: "household_spending" },
  transport: (c) => unsupportedCategory("transport", c) as CategoryResult & { category: "transport" },
};
