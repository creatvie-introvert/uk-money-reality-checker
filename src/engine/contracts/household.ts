import { z } from "zod";
import type { MvpCityId } from "../../data/schemas/enums";
import type { Diagnostic } from "../diagnostics";
import type { LocationInput } from "./input";
import type { DataReleaseMetadata, EvidenceLoader } from "../loaders";
import type { Money } from "../money";
import type { BaselineEvidence, CategoryResult, EngineEvidence } from "./output";

export const householdCostCategorySchema = z.enum([
  "rent", "council_tax", "energy", "water", "groceries", "essentials", "lifestyle", "transport",
]);
/** Costs require no income fields; existing normalized contexts remain compatible. */
export interface HouseholdCostContext {
  location: Pick<LocationInput, "cityId" | "effectiveOn" | "housing" | "transport" | "spending">;
  evidence: EvidenceLoader;
}
export type HouseholdCostCategory = z.infer<typeof householdCostCategorySchema>;
export const requiredHouseholdCostCategories = Object.freeze(householdCostCategorySchema.options);
export type ProductionCostClassification = "OBSERVED_DATA" | "CALCULATED" | "USER_ENTERED";
interface MonthlyCostMetadata {
  category: HouseholdCostCategory;
  baselineEvidence: BaselineEvidence<EngineEvidence>;
  sourceIds: readonly string[];
  sourcePeriods: readonly string[];
  canResolveWithUserInput: boolean;
}
/** No MODEL path is admitted until a production household model is approved. */
export type MonthlyCostResult = MonthlyCostMetadata & (
  | (Omit<Extract<CategoryResult, { status: "RESOLVED" }>, "classification" | "lineageClassifications"> & {
      classification: ProductionCostClassification;
      lineageClassifications: readonly ProductionCostClassification[];
      resolutionSource: "EVIDENCE" | "USER_OVERRIDE" | "CALCULATED_FROM_EVIDENCE";
      effectiveInput:
        | { valueType: "USER_ENTERED"; amount: Money; period: "MONTHLY"; note?: string }
        | { valueType: "OBSERVED_DATA"; records: readonly EngineEvidence[] };
    })
  | (Extract<CategoryResult, { status: "UNRESOLVED" }> & { resolutionSource?: never; effectiveInput?: never })
  | (Extract<CategoryResult, { status: "NOT_APPLICABLE" }> & { resolutionSource: "NOT_APPLICABLE"; effectiveInput: { declaration: "NO_TRANSPORT_COST" } })
);
interface HouseholdCostsBase {
  cityId: MvpCityId;
  categoryResults: readonly MonthlyCostResult[];
  requiredCategories: readonly HouseholdCostCategory[];
  includedCategories: readonly HouseholdCostCategory[];
  unresolvedCategories: readonly HouseholdCostCategory[];
  notApplicableCategories: readonly HouseholdCostCategory[];
  requiredCategoryCount: number;
  resolvedCategoryCount: number;
  unresolvedCategoryCount: number;
  notApplicableCategoryCount: number;
  diagnostics: readonly Diagnostic[];
  dataReleaseMetadata: DataReleaseMetadata;
  calculationVersion: "household-monthly-v1";
}
/** UNRESOLVED carries no subtotal. Only COMPLETE exposes totalMonthlyCost. */
export type HouseholdMonthlyCosts = HouseholdCostsBase & (
  | { completeness: "COMPLETE"; resolvedSubtotalMonthly: Money; totalMonthlyCost: Money; classification: "CALCULATED" }
  | { completeness: "PARTIAL"; resolvedSubtotalMonthly: Money; totalMonthlyCost?: never; classification: "CALCULATED" }
  | { completeness: "UNRESOLVED"; resolvedSubtotalMonthly?: never; totalMonthlyCost?: never; classification?: never }
);
