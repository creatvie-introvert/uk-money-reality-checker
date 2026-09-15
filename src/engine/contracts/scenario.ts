import { z } from "zod";
import { calculatorInputSchema, locationInputSchema, nonnegativeMonthlyOverrideSchema } from "./input";
import type { MvpCityId } from "../../data/schemas/enums";
import type { Diagnostic } from "../diagnostics";
import type { DataReleaseMetadata } from "../loaders";
import type { Money } from "../money";
import type { IncomeUnresolved, NetEmploymentResolved } from "./income";
import type { HouseholdCostCategory, HouseholdMonthlyCosts } from "./household";

/** Syntax validation is separate from the income engine's supported employment scope. */
export const scenarioIncomeInputSchema = locationInputSchema.shape.income.partial().extend({
  taxJurisdiction: z.string().min(1).max(100).optional(),
  scope: z.string().min(1).max(100).optional(),
  calculationBasis: z.string().min(1).max(100).optional(),
  netMonthlyIncomeOverride: nonnegativeMonthlyOverrideSchema.optional(),
});
export const scenarioInputSchema = z.strictObject({
  household: calculatorInputSchema.shape.household,
  location: locationInputSchema.extend({ income: scenarioIncomeInputSchema }),
});
export type ScenarioInput = z.infer<typeof scenarioInputSchema>;
export type BaselineIncome =
  | { status: "AVAILABLE"; calculation: NetEmploymentResolved }
  | { status: "UNAVAILABLE"; reason: "GROSS_INCOME_NOT_SUPPLIED"; diagnostics: readonly Diagnostic[]; calculation?: never }
  | { status: "UNAVAILABLE"; reason: "EMPLOYMENT_CALCULATION_UNRESOLVED"; calculation: IncomeUnresolved; diagnostics: readonly Diagnostic[] };
interface ScenarioIncomeBase {
  baselineIncome: BaselineIncome;
  inputUsed: ScenarioInput["location"]["income"];
  diagnostics: readonly Diagnostic[];
  limitations: readonly string[];
}
export type ScenarioIncomeResult = ScenarioIncomeBase & (
  | { status: "RESOLVED"; effectiveMonthlyNetIncome: Money; classification: "CALCULATED"; resolutionSource: "CALCULATED_EMPLOYMENT_INCOME" }
  | { status: "RESOLVED"; effectiveMonthlyNetIncome: Money; classification: "USER_ENTERED"; resolutionSource: "USER_OVERRIDE" }
  | { status: "UNRESOLVED"; effectiveMonthlyNetIncome?: never; classification?: never; resolutionSource?: never }
);
export type ScenarioResidual =
  | { completeness: "COMPLETE"; completeResidualMonthly: Money; partialResidualAfterResolvedCosts?: never; classification: "CALCULATED"; formula: "effectiveMonthlyNetIncome - totalMonthlyCost" }
  | { completeness: "PARTIAL"; partialResidualAfterResolvedCosts: Money; completeResidualMonthly?: never; classification: "CALCULATED"; formula: "effectiveMonthlyNetIncome - resolvedSubtotalMonthly" }
  | { completeness: "UNRESOLVED"; reason: "INCOME_UNRESOLVED" | "COST_SUBTOTAL_UNAVAILABLE"; completeResidualMonthly?: never; partialResidualAfterResolvedCosts?: never; classification?: never };
export interface ScenarioEvidenceReference {
  recordId: string;
  dataset: string;
  sourceId: string;
  snapshotId: string;
  sourcePeriod?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}
interface ScenarioBase {
  status: "EVALUATED";
  cityId: MvpCityId;
  inputUsed: ScenarioInput;
  unresolvedCategories: readonly HouseholdCostCategory[];
  diagnostics: readonly Diagnostic[];
  dataReleaseMetadata: DataReleaseMetadata;
  evidenceLineage: {
    /** Baseline references never imply an observed effective user override. */
    incomeBaseline: readonly ScenarioEvidenceReference[];
    householdCosts: readonly { category: HouseholdCostCategory; references: readonly ScenarioEvidenceReference[] }[];
  };
  calculationVersion: "single-scenario-v1";
}
export type EvaluatedScenario = ScenarioBase & (
  | { completeness: "COMPLETE"; incomeResult: Extract<ScenarioIncomeResult, { status: "RESOLVED" }>; householdCostResult: Extract<HouseholdMonthlyCosts, { completeness: "COMPLETE" }>; residual: Extract<ScenarioResidual, { completeness: "COMPLETE" }> }
  | { completeness: "PARTIAL"; incomeResult: Extract<ScenarioIncomeResult, { status: "RESOLVED" }>; householdCostResult: Extract<HouseholdMonthlyCosts, { completeness: "PARTIAL" }>; residual: Extract<ScenarioResidual, { completeness: "PARTIAL" }> }
  | { completeness: "UNRESOLVED"; incomeResult: ScenarioIncomeResult; householdCostResult: HouseholdMonthlyCosts; residual: Extract<ScenarioResidual, { completeness: "UNRESOLVED" }> }
);
/** Invalid syntax has no calculation results; valid but unsupported evidence is EVALUATED/UNRESOLVED. */
export type ScenarioCalculationResult = EvaluatedScenario | {
  status: "INVALID_INPUT";
  completeness: "UNRESOLVED";
  diagnostics: readonly Diagnostic[];
  incomeResult?: never;
  householdCostResult?: never;
  residual?: never;
};
