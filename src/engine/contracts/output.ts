import type { ConfidenceClass, MvpCityId } from "../../data/schemas/enums";
import type { RuntimeEvidence } from "../loaders/runtime-types";
import type { Category, Diagnostic } from "../diagnostics";
import type { DataReleaseMetadata, DeepReadonly } from "../loaders";
import type { IncomeTaxResolved, EmployeeNiResolved } from "./income";
import type { HouseholdMonthlyCosts } from "./household";
import type { Money } from "../money";

export type EngineEvidence = RuntimeEvidence;
export type BaselineEvidence<T> =
  | { status: "AVAILABLE"; records: readonly T[] }
  | { status: "UNAVAILABLE"; records: readonly T[]; diagnostics: readonly Diagnostic[] };
interface ResolutionContext<T> {
  category: Category;
  cityId: MvpCityId;
  baselineEvidence: BaselineEvidence<T>;
  diagnostics: readonly Diagnostic[];
  limitations: readonly string[];
}
export type EvidenceResolution<T> =
  | (ResolutionContext<T> & { status: "RESOLVED"; effectiveInput: { valueType: "OBSERVED_DATA"; records: readonly T[] } })
  | (ResolutionContext<T> & { status: "USER_OVERRIDE"; effectiveInput: { valueType: "USER_ENTERED"; amount: Money; period: "MONTHLY"; note?: string } })
  | (ResolutionContext<T> & { status: "UNRESOLVED"; canResolveWithUserInput: boolean; sourceCandidates: readonly string[] });
interface CategoryResultBase {
  category: Category;
  cityId: MvpCityId;
  inputUsed: unknown;
  evidenceLineage: readonly EngineEvidence[];
  diagnostics: readonly Diagnostic[];
  limitations: readonly string[];
}
export type CategoryResult =
  | (CategoryResultBase & {
      status: "RESOLVED"; monthlyAmount: Money; classification: ConfidenceClass;
      lineageClassifications: readonly ConfidenceClass[];
      overrideStatus: "USER_OVERRIDE" | "NONE";
      baselineEvidence: BaselineEvidence<EngineEvidence>;
      amountBasis: "SOURCE_MONTH" | "MATHEMATICAL_MONTHLY_EQUIVALENT" | "USER_DECLARED_MONTHLY";
      formula?: { expression: string; version: string };
      incomeBreakdown?: DeepReadonly<IncomeTaxResolved | EmployeeNiResolved>;
    })
  | (CategoryResultBase & { status: "UNRESOLVED"; canResolveWithUserInput: boolean; monthlyAmount?: never })
  | (CategoryResultBase & { status: "NOT_APPLICABLE"; reason: string; monthlyAmount?: never });
/** Simple total state retained for the future net-income orchestration boundary. */
export type MonthlyTotal =
  | { status: "RESOLVED"; amount: Money; includedCategories: readonly Category[] }
  | { status: "UNRESOLVED"; unresolvedCategories: readonly Category[]; amount?: never };
export interface LocationResult {
  cityId: MvpCityId;
  categoryResults: readonly CategoryResult[];
  monthlyTotals: { expenditure: HouseholdMonthlyCosts; netIncome: MonthlyTotal };
  diagnostics: readonly Diagnostic[];
  unresolvedCategories: readonly Category[];
}
export interface CalculationResult {
  currentLocation: LocationResult;
  destinationLocation: LocationResult;
  dataReleaseMetadata: DataReleaseMetadata;
  diagnostics: readonly Diagnostic[];
}
