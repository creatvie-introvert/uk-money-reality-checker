import { calculateScenario } from "@/engine/calculators/scenario";
import { compareScenarios } from "@/engine/comparison";
import { rankCostDrivers } from "@/engine/comparison/cost-drivers";
import { evaluateSalaryPreservationEligibility, solveSalaryPreservation } from "@/engine/comparison/salary-preservation";
import type { EvidenceLoader } from "@/engine/loaders";
import type { SalaryPreservationOptions } from "@/engine/contracts/salary-preservation";
import { buildCalculatorInputsFromForm } from "./adapter";
import { composeProductResult } from "./composer";
import { buildResultsViewModel } from "./view-model";
import type { AdapterResult, ProductCalculatorResult } from "./contracts";
import type { ResultsViewModel } from "./view-model";
export type ProductCalculation = { state: "EVALUATED"; product: ProductCalculatorResult; view: ResultsViewModel; adapter: AdapterResult }
  | { state: "INPUT_REQUIRED"; adapter: AdapterResult; product?: never; view?: never };
/** Loader lifetime belongs to the caller. Nothing is persisted or sent to a server. */
export function calculateProductResult(form: unknown, evidence: EvidenceLoader, options?: SalaryPreservationOptions): ProductCalculation {
  const adapter = buildCalculatorInputsFromForm(form);
  if (adapter.current.state !== "READY" || adapter.destination.state !== "READY") return { state: "INPUT_REQUIRED", adapter };
  const current = calculateScenario(evidence, adapter.current.input), destination = calculateScenario(evidence, adapter.destination.input);
  const comparison = compareScenarios(current, destination);
  const ranking = rankCostDrivers(comparison);
  const eligible = evaluateSalaryPreservationEligibility(evidence, current, destination);
  const preservation = eligible.status === "ELIGIBLE" ? solveSalaryPreservation(evidence, current, destination, options) : eligible;
  const product = composeProductResult(comparison, ranking, preservation, [...adapter.current.issues, ...adapter.destination.issues]);
  return { state: "EVALUATED", product, view: buildResultsViewModel(product), adapter };
}
