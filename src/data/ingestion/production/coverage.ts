import { auditRecordSchema, type AuditRecord } from "../../schemas/records";

export type ReferenceDataset = "income-tax" | "national-insurance";
export interface CoverageDiagnostic {
  code: "INVALID_REFERENCE_RULE" | "MISSING_REFERENCE_RULE" | "DUPLICATE_REFERENCE_RULE" | "UNEXPECTED_REFERENCE_RULE";
  dimension: string;
  message: string;
}
const allowances = ["personal-allowance", "allowance-taper", "zero-allowance"];
export const requiredTaxRules = {
  rUK: [...allowances, "basic", "higher", "additional"],
  Scotland: [...allowances, "starter", "basic", "intermediate", "higher", "advanced", "top"],
};
export const requiredNIPeriods = ["weekly", "monthly", "annual"] as const;
const niBands = ["LEL_TO_PT", "PT_TO_UEL", "ABOVE_UEL"];

/** Completeness of the reviewed 2026/27 reference scope; never substitutes missing data. */
export function validateReferenceCoverage(dataset: ReferenceDataset, input: readonly AuditRecord[]): CoverageDiagnostic[] {
  const diagnostics: CoverageDiagnostic[] = [];
  const required = dataset === "income-tax"
    ? Object.entries(requiredTaxRules).flatMap(([jurisdiction, names]) => names.map((name) => `${jurisdiction}:${name}`))
    : requiredNIPeriods.flatMap((period) => niBands.map((band) => `Class 1:A:${period}:${band}`));
  const seen = new Map<string, number>();
  const recordIds = new Set<string>();
  const invalid = (dimension: string, message: string) => diagnostics.push({ code: "INVALID_REFERENCE_RULE", dimension, message });
  for (const raw of input) {
    const parsed = auditRecordSchema.safeParse(raw);
    if (!parsed.success) { invalid(raw.recordId, parsed.error.message); continue; }
    const record = parsed.data;
    if (recordIds.has(record.recordId)) invalid(record.recordId, "Duplicate record ID");
    recordIds.add(record.recordId);
    if (record.releaseStatus !== "REFERENCE_ONLY" || record.valueType !== "OBSERVED_DATA") invalid(record.recordId, "Production references require REFERENCE_ONLY and OBSERVED_DATA");
    if ((dataset === "income-tax" && record.category !== "income_tax_rule") ||
        (dataset === "national-insurance" && record.category !== "national_insurance_rule")) {
      invalid(record.recordId, "Wrong reference category"); continue;
    }
    if (record.category !== "income_tax_rule" && record.category !== "national_insurance_rule") continue;
    const key = record.category === "income_tax_rule" ? `${record.jurisdiction}:${record.bandName}` : `${record.class}:${record.categoryLetter}:${record.payPeriod}:${record.bandName}`;
    if (record.taxYear !== "2026/27" || record.effectiveFrom !== "2026-04-06" || record.effectiveTo !== "2027-04-05") invalid(key, "Required tax year 2026/27 and effective period 2026-04-06 to 2027-04-05");
    seen.set(key, (seen.get(key) ?? 0) + 1);
    if (!required.includes(key)) diagnostics.push({ code: "UNEXPECTED_REFERENCE_RULE", dimension: key, message: `Rule outside approved scope: ${key}` });
    if (record.category === "income_tax_rule") {
      const expectedType = record.bandName === "personal-allowance" ? "personal_allowance" : record.bandName === "allowance-taper" ? "personal_allowance_taper" : record.bandName === "zero-allowance" ? "personal_allowance_zero_point" : "tax_band";
      if (record.ruleType !== expectedType) invalid(key, `Required rule type: ${expectedType}`);
      const sourceId = record.jurisdiction === "Scotland" && expectedType === "tax_band" ? "SRC-013" : "SRC-011";
      if (record.provenance.sourceId !== sourceId) invalid(key, `Required source: ${sourceId}`);
      if (expectedType === "tax_band") {
        const open = record.bandName === "additional" || record.bandName === "top";
        if (record.lowerBound === undefined || record.rate === undefined || record.rate <= 0 || record.rate > 1 ||
            record.threshold !== undefined || record.lowerInclusive !== !open ||
            (open ? record.upperBound !== undefined || record.upperInclusive !== undefined : record.upperBound === undefined || record.upperInclusive !== true) ||
            record.thresholdBasis !== "published_income_with_standard_allowance") invalid(key, "Missing/invalid tax band bounds, rate or published basis");
      } else {
        if (record.threshold === undefined || record.threshold <= 0 || record.lowerBound !== undefined || record.upperBound !== undefined ||
            record.thresholdBasis !== (expectedType === "personal_allowance" ? "allowance_amount" : "adjusted_net_income")) invalid(key, "Missing/invalid allowance threshold or basis");
        if (expectedType === "personal_allowance_taper" && (record.rate === undefined || record.rate <= 0 || record.rate > 1)) invalid(key, "Missing/invalid allowance taper rate");
        if (expectedType !== "personal_allowance_taper" && record.rate !== undefined) invalid(key, "Unexpected allowance rate");
      }
    } else {
      const open = record.bandName === "ABOVE_UEL";
      if (record.provenance.sourceId !== "SRC-012" || record.lowerThreshold <= 0 || record.employeeRate > 1 || (record.bandName === "LEL_TO_PT" ? record.employeeRate !== 0 : record.employeeRate <= 0) ||
          record.lowerInclusive !== (record.bandName === "LEL_TO_PT") ||
          (open ? record.upperThreshold !== undefined || record.upperInclusive !== undefined : record.upperThreshold === undefined || record.upperInclusive !== true)) invalid(key, "Missing/invalid NI source, thresholds or boundary semantics");
    }
  }
  if (dataset === "national-insurance") {
    for (const period of requiredNIPeriods) {
      const bands = input.filter((r) => r.category === "national_insurance_rule").filter((r) => r.payPeriod === period);
      const low = bands.find((r) => r.bandName === "LEL_TO_PT");
      const main = bands.find((r) => r.bandName === "PT_TO_UEL");
      const top = bands.find((r) => r.bandName === "ABOVE_UEL");
      if (low && main && low.upperThreshold !== main.lowerThreshold) invalid(period, "NI primary threshold must reconcile across adjacent bands");
      if (main && top && main.upperThreshold !== top.lowerThreshold) invalid(period, "NI upper earnings limit must reconcile across adjacent bands");
    }
  }
  for (const key of required) {
    const count = seen.get(key) ?? 0;
    if (count === 0) diagnostics.push({ code: "MISSING_REFERENCE_RULE", dimension: key, message: `Required 2026/27 rule missing: ${key}` });
    if (count > 1) diagnostics.push({ code: "DUPLICATE_REFERENCE_RULE", dimension: key, message: `Required exactly one rule, found ${count}: ${key}` });
  }
  return diagnostics;
}
