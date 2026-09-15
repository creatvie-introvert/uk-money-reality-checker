import type { EvidenceLoader, EvidenceRecord } from "../loaders";
import type { CategoryResult, EvidenceResolution, EngineEvidence } from "../contracts/output";
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
