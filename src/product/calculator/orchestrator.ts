import { createEvidenceLoader, type EvidenceLoader } from "@/engine/loaders";
import type { SalaryPreservationOptions } from "@/engine/contracts/salary-preservation";
import { calculateProductResult as calculateWithEvidence } from "./runtime";
export type { ProductCalculation } from "./runtime";
/** Full pinned loader for engine/test/development callers. Browser uses explicit projected evidence. */
export function calculateProductResult(form: unknown, evidence: EvidenceLoader = createEvidenceLoader(), options?: SalaryPreservationOptions) {
  return calculateWithEvidence(form, evidence, options);
}
export function createProductCalculator() {
  const evidence = createEvidenceLoader();
  return (form: unknown) => calculateWithEvidence(form, evidence);
}
