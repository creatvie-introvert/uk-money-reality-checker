import type { Diagnostic } from "../diagnostics";
import type { Money } from "../money";
import type { NetEmploymentRequest, NetEmploymentResolved, ReferenceRelease } from "./income";
import type { EvaluatedScenario, ScenarioInput } from "./scenario";

export type SalaryPreservationReason =
  | "CURRENT_RESIDUAL_INCOMPLETE" | "CURRENT_INCOME_UNRESOLVED" | "CURRENT_COSTS_INCOMPLETE"
  | "DESTINATION_COSTS_INCOMPLETE" | "DESTINATION_SCENARIO_UNRESOLVED"
  | "DESTINATION_TAX_JURISDICTION_UNSUPPORTED" | "DESTINATION_NI_UNSUPPORTED"
  | "DESTINATION_EMPLOYMENT_UNSUPPORTED" | "DESTINATION_NET_OVERRIDE_CONFLICT"
  | "SALARY_SEARCH_REFERENCE_UNSUPPORTED";
export interface SalaryPreservationTarget {
  classification: "CALCULATED";
  currentResidualMonthly: Money;
  destinationCompleteMonthlyCost: Money;
  requiredDestinationNetMonthly: Money;
}
export interface SalaryPreservationLineage {
  current: {
    inputUsed: ScenarioInput;
    effectiveIncomeClassification: "CALCULATED" | "USER_ENTERED";
    incomeResolutionSource: "CALCULATED_EMPLOYMENT_INCOME" | "USER_OVERRIDE";
    evidence: EvaluatedScenario["evidenceLineage"];
    releases: EvaluatedScenario["dataReleaseMetadata"];
  };
  destination: {
    inputUsed: ScenarioInput;
    costs: EvaluatedScenario["evidenceLineage"]["householdCosts"];
    releases: EvaluatedScenario["dataReleaseMetadata"];
  };
  employmentReferenceReleases: readonly ReferenceRelease[];
  employmentRecordIds: readonly string[];
}
export interface SalaryPreservationIneligible {
  status: "INELIGIBLE";
  reasons: readonly SalaryPreservationReason[];
  diagnostics: readonly Diagnostic[];
}
export type SalaryPreservationEligibility = SalaryPreservationIneligible | {
  status: "ELIGIBLE";
  target: SalaryPreservationTarget;
  employmentInput: Omit<NetEmploymentRequest, "grossAnnualSalaryGbp">;
  zeroIncome: NetEmploymentResolved;
  lineage: SalaryPreservationLineage;
  diagnostics: readonly Diagnostic[];
};
export interface SalaryPreservationOptions {
  /** Inclusive operational cap, decimal GBP with at most two places; never a statutory maximum. */
  maxGrossAnnualSalaryGbp?: string;
}
export interface SalarySearchMetadata {
  algorithm: "TWO_POUND_BLOCK_MAXIMA_V1";
  searchUnit: "ONE_PENNY_ANNUAL_GROSS";
  operationalMaximum: Money;
  lowerBoundChecked: Money;
  upperBoundChecked: Money;
  /** Binary-search decisions; excludes eligibility, endpoint checks and local scan. */
  iterations: number;
  forwardEvaluations: number;
  localPenceChecked: number;
  localWindow?: { lowerInclusive: Money; upperInclusive: Money };
}
interface SalaryResultBase {
  calculationVersion: "salary-preservation-v1";
  classification: "CALCULATED";
  target: SalaryPreservationTarget;
  taxJurisdiction: "rUK" | "Scotland";
  niCategory: "A";
  calculationBasis: "ANNUAL_COMPARISON";
  lineage: SalaryPreservationLineage;
  diagnostics: readonly Diagnostic[];
  limitations: readonly string[];
  search: SalarySearchMetadata;
}
export type SalaryPreservationResult = SalaryPreservationIneligible | (SalaryResultBase & (
  | { status: "NO_SOLUTION_WITHIN_BOUNDS"; requiredGrossAnnualSalary?: never }
  | {
    status: "ELIGIBLE_SOLVED";
    requiredGrossAnnualSalary: Money;
    requiredGrossAnnualSalaryGbp: string;
    achievedNetAnnual: Money;
    achievedNetMonthly: Money;
    achievedResidualMonthly: Money;
    overshootMonthly: Money;
    minimality: {
      guarantee: "GLOBAL_MINIMUM_WITHIN_BOUNDS";
      earlierBlocksExcluded: true;
      earlierLocalPenniesExcluded: true;
      previousPenny: { status: "BELOW_TARGET"; grossAnnual: Money; netMonthly: Money } | { status: "NOT_APPLICABLE_ZERO_SALARY" };
      exactTargetMatch: boolean;
    };
  }
));
