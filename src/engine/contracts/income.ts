import { z } from "zod";
import { gbpText } from "./input";
import type { Money } from "../money";
import type { Diagnostic } from "../diagnostics";
import type { EvidenceLoader, EvidenceRecord } from "../loaders";
import type { Jurisdiction } from "../../data/schemas/enums";

const employmentFields = {
  grossAnnualSalaryGbp: gbpText,
  taxYear: z.string().regex(/^\d{4}\/\d{2}$/),
  scope: z.literal("ONE_EMPLOYEE_ONE_EMPLOYMENT"),
  basis: z.literal("ANNUAL_COMPARISON"),
  effectiveOn: z.iso.date().optional(),
};
export const incomeTaxRequestSchema = z.strictObject({ ...employmentFields, jurisdiction: z.string().optional() });
export const employeeNiRequestSchema = z.strictObject({ ...employmentFields, niCategory: z.string() });
export const netEmploymentRequestSchema = z.strictObject({ ...employmentFields, jurisdiction: z.string().optional(), niCategory: z.string() });
export type IncomeTaxRequest = z.infer<typeof incomeTaxRequestSchema>;
export type EmployeeNiRequest = z.infer<typeof employeeNiRequestSchema>;
export type NetEmploymentRequest = z.infer<typeof netEmploymentRequestSchema>;
export type IncomeEvidenceLoader = Pick<EvidenceLoader, "metadata" | "getTaxReference" | "getNiReference">;
export type IncomeReference = EvidenceRecord<"incomeTax"> | EvidenceRecord<"nationalInsurance">;
export type ReferenceRelease = IncomeEvidenceLoader["metadata"]["datasets"][number];
export interface IncomeUnresolved {
  status: "UNRESOLVED";
  diagnostics: readonly Diagnostic[];
  limitations: readonly string[];
}
interface CalculatedBase {
  status: "RESOLVED";
  classification: "CALCULATED";
  lineageClassifications: readonly ["USER_ENTERED", "OBSERVED_DATA", "CALCULATED"];
  grossAnnual: Money;
  taxYear: string;
  calculationVersion: "employment-annual-v1";
  referenceRelease: readonly ReferenceRelease[];
  evidenceLineage: readonly IncomeReference[];
  diagnostics: readonly Diagnostic[];
  limitations: readonly string[];
}
export interface TaxBandCalculation {
  recordId: string; bandName: string; rate: string;
  lowerExclusive: Money; upperInclusive?: Money;
  taxableAmount: Money; tax: Money;
}
export interface IncomeTaxResolved extends CalculatedBase {
  jurisdiction: Jurisdiction;
  adjustedNetIncome: Money;
  aniBasis: "GROSS_EMPLOYMENT_ONLY_NO_ADJUSTMENTS";
  personalAllowance: {
    beforeTaper: Money; taperStart: Money; taperRate: string; zeroPointFromEvidence: Money;
    unroundedReduction: Money; unroundedAllowance: Money;
    reduction: Money; effective: Money;
    rounding: "CEILING_TO_WHOLE_GBP_ITA2007_S35_3";
  };
  taxableIncome: Money;
  bands: readonly TaxBandCalculation[];
  incomeTax: Money;
}
export interface NiBandCalculation {
  recordId: string; bandName: string; rate: string;
  lowerThreshold: Money; upperThreshold?: Money;
  sourceLowerInclusive: boolean;
  contributableEarnings: Money; employeeNi: Money;
}
export interface EmployeeNiResolved extends CalculatedBase {
  niCategory: "A"; niClass: "Class 1"; basis: "ANNUAL_COMPARISON"; referencePayPeriod: "annual";
  earningsBelowLowerEarningsLimit: Money;
  bands: readonly NiBandCalculation[];
  employeeNi: Money;
}
export interface NetEmploymentResolved extends CalculatedBase {
  jurisdiction: Jurisdiction;
  adjustedNetIncome: Money;
  personalAllowance: IncomeTaxResolved["personalAllowance"];
  taxableIncome: Money;
  incomeTax: Money; employeeNi: Money; netAnnual: Money; netMonthlyEquivalent: Money;
  taxBreakdown: IncomeTaxResolved;
  niBreakdown: EmployeeNiResolved;
  formula: "grossAnnual - incomeTax - employeeNi; netAnnual / 12";
}
export type IncomeTaxResult = IncomeUnresolved | IncomeTaxResolved;
export type EmployeeNiResult = IncomeUnresolved | EmployeeNiResolved;
export type NetEmploymentResult = IncomeUnresolved | NetEmploymentResolved;
