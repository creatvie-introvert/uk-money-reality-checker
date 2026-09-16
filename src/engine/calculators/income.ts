import { z } from "zod";
import { jurisdictionSchema } from "../../data/schemas/enums";
import { incomeTaxRuleRecordSchema, nationalInsuranceRuleRecordSchema } from "../../data/schemas/income-records";
import { incomeTaxRequestSchema, employeeNiRequestSchema, netEmploymentRequestSchema,
  type IncomeEvidenceLoader, type IncomeUnresolved, type IncomeTaxResult, type EmployeeNiResult,
  type NetEmploymentResult, type TaxBandCalculation, type ReferenceRelease,
} from "../contracts/income";
import type { RuntimeEvidenceRecord as EvidenceRecord } from "../loaders/runtime-types";
import type { Diagnostic, DiagnosticCode } from "../diagnostics";
import { fromGbp, addMoney, subtractMoney, compareMoney, maxMoney, minMoney, applyDecimalRate, ceilWholeGbp, monthlyEquivalent, type Money } from "../money";

const zero = fromGbp("0"), onePound = fromGbp("1");
const version = "employment-annual-v1" as const;
const lineage = ["USER_ENTERED", "OBSERVED_DATA", "CALCULATED"] as const;
const taxLimitations = [
  "Simple employment scope: adjusted net income equals gross employment salary; no pensions, Gift Aid or other ANI adjustments.",
  "Standard Personal Allowance only; no tax-code/PAYE or Self Assessment return rounding. Tax bands retain exact rational precision.",
  "Personal Allowance is rounded up to a whole pound under ITA 2007 s35(3); small net-income decreases can occur at taper steps.",
];
const niLimitations = [
  "Annual NI is an annualized comparison calculation using official annual thresholds and rates. It is not a substitute for payroll-period NI calculation and may differ where pay is irregular.",
  "Category A employee Class 1 only; no employer, director or payroll-period rounding. Exact annual comparison amounts are retained.",
];
function unresolved(code: DiagnosticCode, message: string, category: "income_tax" | "national_insurance", path?: (string | number)[]): IncomeUnresolved {
  return { status: "UNRESOLVED", diagnostics: [{ code, message, category, severity: "blocking", kind: code.includes("REFERENCE") ? "evidence_gap" : "unsupported_combination", ...(path ? { path } : {}) }], limitations: [message] };
}
function invalidInput(error: z.ZodError, category: "income_tax" | "national_insurance"): IncomeUnresolved {
  return { status: "UNRESOLVED", diagnostics: error.issues.map((i) => ({ code: "INCOME_OUT_OF_SCOPE", category, severity: "blocking", kind: "validation", message: i.message, path: i.path.map((p) => typeof p === "number" ? p : String(p)) })), limitations: ["Only nonnegative decimal annual salary, explicit annual-comparison basis and one simple employment are supported."] };
}
const sum = (values: readonly Money[]) => values.reduce(addMoney, zero);
const positiveDifference = (a: Money, b: Money) => maxMoney(zero, subtractMoney(a, b));
const sourceMoney = (n: number) => fromGbp(String(n));
function release(loader: IncomeEvidenceLoader, dataset: "incomeTax" | "nationalInsurance", taxYear: string): ReferenceRelease | undefined {
  const matches = loader.metadata.datasets.filter((d) => d.dataset === dataset && d.sourcePeriod === taxYear && d.kind === "REFERENCE_ARTIFACT");
  return matches.length === 1 ? matches[0] : undefined;
}
function validPeriod(record: { effectiveFrom: string; effectiveTo: string; taxYear: string; provenance: { effectiveFrom?: string; effectiveTo?: string; sourcePeriod?: string } }, year: string, effectiveOn?: string) {
  return record.taxYear === year && record.provenance.sourcePeriod === year && record.effectiveFrom === record.provenance.effectiveFrom && record.effectiveTo === record.provenance.effectiveTo && (!effectiveOn || record.effectiveFrom <= effectiveOn && effectiveOn <= record.effectiveTo);
}

/** Rates and thresholds come only from the supplied typed generated-evidence loader. */
export function calculateIncomeTax(loader: IncomeEvidenceLoader, raw: unknown): IncomeTaxResult {
  const parsed = incomeTaxRequestSchema.safeParse(raw);
  if (!parsed.success) return invalidInput(parsed.error, "income_tax");
  const q = parsed.data;
  if (!q.jurisdiction) return unresolved("TAX_JURISDICTION_REQUIRED", "Tax jurisdiction must be explicitly supplied; it is not inferred from a city.", "income_tax");
  const jurisdiction = jurisdictionSchema.safeParse(q.jurisdiction);
  if (!jurisdiction.success) return unresolved("TAX_JURISDICTION_UNSUPPORTED", "Only rUK and Scotland employment-income jurisdiction rules are supported.", "income_tax");
  const records = loader.getTaxReference({ jurisdiction: jurisdiction.data, taxYear: q.taxYear });
  const referenceRelease = release(loader, "incomeTax", q.taxYear);
  if (!records.length || !referenceRelease) return unresolved("TAX_REFERENCE_MISSING", "No exact reference release for the requested tax year/jurisdiction.", "income_tax");
  if (new Set(records.map((r) => r.recordId)).size !== records.length || new Set(records.map((r) => `${r.ruleType}:${r.bandName}`)).size !== records.length) return unresolved("TAX_REFERENCE_AMBIGUOUS", "Duplicate tax reference identity or rule.", "income_tax");
  if (records.some((r) => !incomeTaxRuleRecordSchema.safeParse(r).success || r.jurisdiction !== jurisdiction.data || r.valueType !== "OBSERVED_DATA" || r.releaseStatus !== "REFERENCE_ONLY" || !validPeriod(r, q.taxYear, q.effectiveOn))) return unresolved("TAX_REFERENCE_INVALID", "Tax references have incompatible classification, jurisdiction or effective period.", "income_tax");
  const ofType = (type: EvidenceRecord<"incomeTax">["ruleType"]) => records.filter((r) => r.ruleType === type);
  const allowances = ofType("personal_allowance"), tapers = ofType("personal_allowance_taper"), zeros = ofType("personal_allowance_zero_point");
  if ([allowances, tapers, zeros].some((rs) => rs.length > 1)) return unresolved("TAX_REFERENCE_AMBIGUOUS", "Personal allowance rules must have exactly one record each.", "income_tax");
  if ([allowances, tapers, zeros].some((rs) => rs.length !== 1)) return unresolved("TAX_REFERENCE_MISSING", "Missing personal allowance, taper or zero-allowance reference.", "income_tax");
  const allowance = allowances[0], taper = tapers[0], zeroPoint = zeros[0];
  if (allowance.threshold === undefined || taper.threshold === undefined || zeroPoint.threshold === undefined || taper.rate === undefined || taper.rate <= 0 || taper.rate > 1 || allowance.thresholdBasis !== "allowance_amount" || taper.thresholdBasis !== "adjusted_net_income" || zeroPoint.thresholdBasis !== "adjusted_net_income") return unresolved("TAX_REFERENCE_INVALID", "Allowance fields or threshold bases are unsupported.", "income_tax");
  const base = sourceMoney(allowance.threshold), taperStart = sourceMoney(taper.threshold), zeroAt = sourceMoney(zeroPoint.threshold), taperRate = String(taper.rate);
  if (compareMoney(base, zero) <= 0 || compareMoney(taperStart, base) <= 0 || compareMoney(applyDecimalRate(subtractMoney(zeroAt, taperStart), taperRate), base) !== 0) return unresolved("TAX_REFERENCE_INVALID", "Loaded zero-allowance point does not reconcile with the loaded taper formula.", "income_tax");
  const taxBands = ofType("tax_band");
  if (taxBands.some((b) => b.lowerBound === undefined)) return unresolved("TAX_REFERENCE_INVALID", "Tax band lower bound is missing.", "income_tax");
  const bands = taxBands.slice().sort((a,b) => compareMoney(sourceMoney(a.lowerBound!), sourceMoney(b.lowerBound!)));
  // Required names are schema dimensions, not a second numeric rates table.
  const names = jurisdiction.data === "rUK" ? ["basic", "higher", "additional"] : ["starter", "basic", "intermediate", "higher", "advanced", "top"];
  if (bands.length !== names.length || names.some((name) => !bands.some((r) => r.bandName === name))) return unresolved("TAX_REFERENCE_MISSING", "One or more required employment-tax bands are missing.", "income_tax");
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i], top = i === bands.length - 1;
    if (b.bandName !== names[i] || b.lowerBound === undefined || b.rate === undefined || b.rate <= 0 || b.rate > 1 || b.thresholdBasis !== "published_income_with_standard_allowance" || b.lowerInclusive !== !top || (top ? b.upperBound !== undefined || b.upperInclusive !== undefined : b.upperBound === undefined || b.upperInclusive !== true)) return unresolved("TAX_REFERENCE_INVALID", "Tax band order, bounds, rate or source basis is invalid.", "income_tax");
    const previousUpper = i === 0 ? base : sourceMoney(bands[i-1].upperBound!);
    const expectedLower = top ? previousUpper : addMoney(previousUpper, onePound);
    if (compareMoney(sourceMoney(b.lowerBound), expectedLower) !== 0 || (top && compareMoney(expectedLower, zeroAt) !== 0)) return unresolved("TAX_REFERENCE_INVALID", "Tax source bands contain a gap, overlap or incompatible top boundary.", "income_tax");
  }
  const gross = fromGbp(q.grossAnnualSalaryGbp);
  const unroundedReduction = minMoney(base, applyDecimalRate(positiveDifference(gross, taperStart), taperRate));
  const unroundedAllowance = subtractMoney(base, unroundedReduction);
  // ITA 2007 s35(3): the remaining allowance (not each tax band) is rounded UP to £1.
  const effective = minMoney(base, ceilWholeGbp(unroundedAllowance));
  const taxableIncome = positiveDifference(gross, effective);
  let lower = zero;
  const breakdown: TaxBandCalculation[] = bands.map((b, i) => {
    const top = i === bands.length - 1;
    // Published gross illustrations below the final threshold include standard PA.
    // The final/top boundary already applies to taxable income when PA has vanished.
    const upper = top ? undefined : i === bands.length - 2 ? sourceMoney(b.upperBound!) : subtractMoney(sourceMoney(b.upperBound!), base);
    const taxableAmount = positiveDifference(upper ? minMoney(taxableIncome, upper) : taxableIncome, lower);
    const row: TaxBandCalculation = { recordId: b.recordId, bandName: b.bandName!, rate: String(b.rate), lowerExclusive: lower, ...(upper ? { upperInclusive: upper } : {}), taxableAmount, tax: applyDecimalRate(taxableAmount, String(b.rate)) };
    if (upper) lower = upper;
    return row;
  });
  if (compareMoney(sum(breakdown.map((b) => b.taxableAmount)), taxableIncome) !== 0) return unresolved("TAX_REFERENCE_INVALID", "Taxable-income allocation does not reconcile.", "income_tax");
  const diagnostics: Diagnostic[] = [
    { code: "ANI_EQUALS_GROSS_SCOPE", severity: "info", kind: "unsupported_combination", category: "income_tax", message: taxLimitations[0] },
    { code: "PERSONAL_ALLOWANCE_STATUTORY_ROUNDING", severity: "info", kind: "calculation_policy", category: "income_tax", message: taxLimitations[2] },
  ];
  return { status: "RESOLVED", classification: "CALCULATED", lineageClassifications: lineage, calculationVersion: version,
    jurisdiction: jurisdiction.data, taxYear: q.taxYear, grossAnnual: gross, adjustedNetIncome: gross, aniBasis: "GROSS_EMPLOYMENT_ONLY_NO_ADJUSTMENTS",
    personalAllowance: { beforeTaper: base, taperStart, taperRate, zeroPointFromEvidence: zeroAt, unroundedReduction, unroundedAllowance, reduction: subtractMoney(base, effective), effective, rounding: "CEILING_TO_WHOLE_GBP_ITA2007_S35_3" },
    taxableIncome, bands: breakdown, incomeTax: sum(breakdown.map((b) => b.tax)), referenceRelease: [referenceRelease], evidenceLineage: records, diagnostics,
    limitations: [...taxLimitations, ...new Set(records.flatMap((r) => r.provenance.limitations))],
  };
}

export function calculateEmployeeNi(loader: IncomeEvidenceLoader, raw: unknown): EmployeeNiResult {
  const parsed = employeeNiRequestSchema.safeParse(raw);
  if (!parsed.success) return invalidInput(parsed.error, "national_insurance");
  const q = parsed.data;
  if (q.niCategory !== "A") return unresolved("NI_CATEGORY_UNSUPPORTED", "Only explicit employee Class 1 category A is supported.", "national_insurance");
  const records = loader.getNiReference({ taxYear: q.taxYear, categoryLetter: q.niCategory, payPeriod: "annual" });
  const referenceRelease = release(loader, "nationalInsurance", q.taxYear);
  if (!referenceRelease || !records.length) return unresolved("NI_REFERENCE_MISSING", "No official annual category-A reference table for this tax year; weekly/monthly thresholds are not annualized.", "national_insurance");
  if (new Set(records.map((r) => r.recordId)).size !== records.length || new Set(records.map((r) => r.bandName)).size !== records.length) return unresolved("NI_REFERENCE_AMBIGUOUS", "Duplicate NI reference band or identity.", "national_insurance");
  const names = ["LEL_TO_PT", "PT_TO_UEL", "ABOVE_UEL"];
  if (records.length !== names.length || names.some((name) => !records.some((r) => r.bandName === name))) return unresolved("NI_REFERENCE_MISSING", "Official annual NI bands are incomplete.", "national_insurance");
  const bands = records.slice().sort((a,b) => compareMoney(sourceMoney(a.lowerThreshold), sourceMoney(b.lowerThreshold)));
  if (bands.some((b,i) => !nationalInsuranceRuleRecordSchema.safeParse(b).success || !validPeriod(b,q.taxYear,q.effectiveOn) || b.class !== "Class 1" || b.categoryLetter !== "A" || b.payPeriod !== "annual" || b.valueType !== "OBSERVED_DATA" || b.releaseStatus !== "REFERENCE_ONLY" || b.bandName !== names[i] || b.lowerInclusive !== (i === 0) || b.employeeRate < 0 || b.employeeRate > 1 || (i === 0 ? b.employeeRate !== 0 : b.employeeRate <= 0) || (i === bands.length-1 ? b.upperThreshold !== undefined || b.upperInclusive !== undefined : b.upperThreshold === undefined || b.upperInclusive !== true) || (i > 0 && b.lowerThreshold !== bands[i-1].upperThreshold))) return unresolved("NI_REFERENCE_INVALID", "Annual NI boundaries, periods, classifications or rates are invalid.", "national_insurance");
  const gross = fromGbp(q.grossAnnualSalaryGbp);
  const breakdown = bands.map((b) => {
    const lowerThreshold = sourceMoney(b.lowerThreshold), upperThreshold = b.upperThreshold === undefined ? undefined : sourceMoney(b.upperThreshold);
    const contributableEarnings = positiveDifference(upperThreshold ? minMoney(gross, upperThreshold) : gross, lowerThreshold);
    return { recordId: b.recordId, bandName: b.bandName!, rate: String(b.employeeRate), lowerThreshold, ...(upperThreshold ? { upperThreshold } : {}), sourceLowerInclusive: b.lowerInclusive!, contributableEarnings, employeeNi: applyDecimalRate(contributableEarnings, String(b.employeeRate)) };
  });
  const earningsBelowLowerEarningsLimit = minMoney(gross, sourceMoney(bands[0].lowerThreshold));
  if (compareMoney(addMoney(earningsBelowLowerEarningsLimit, sum(breakdown.map((b) => b.contributableEarnings))), gross) !== 0) return unresolved("NI_REFERENCE_INVALID", "NI earnings allocation does not reconcile.", "national_insurance");
  return { status: "RESOLVED", classification: "CALCULATED", lineageClassifications: lineage, calculationVersion: version,
    taxYear: q.taxYear, grossAnnual: gross, niCategory: "A", niClass: "Class 1", basis: "ANNUAL_COMPARISON", referencePayPeriod: "annual",
    earningsBelowLowerEarningsLimit, bands: breakdown, employeeNi: sum(breakdown.map((b) => b.employeeNi)), referenceRelease: [referenceRelease], evidenceLineage: records,
    diagnostics: [{ code: "ANNUALISED_NI_COMPARISON", category: "national_insurance", severity: "warning", kind: "unsupported_combination", message: niLimitations[0] }],
    limitations: [...niLimitations, ...new Set(records.flatMap((r) => r.provenance.limitations))],
  };
}

export function calculateNetEmploymentIncome(loader: IncomeEvidenceLoader, raw: unknown): NetEmploymentResult {
  const parsed = netEmploymentRequestSchema.safeParse(raw);
  if (!parsed.success) return invalidInput(parsed.error, "income_tax");
  const { jurisdiction, niCategory, ...common } = parsed.data;
  const tax = calculateIncomeTax(loader, { ...common, jurisdiction });
  const ni = calculateEmployeeNi(loader, { ...common, niCategory });
  if (tax.status === "UNRESOLVED" || ni.status === "UNRESOLVED") return { status: "UNRESOLVED", diagnostics: [...tax.diagnostics, ...ni.diagnostics], limitations: [...tax.limitations, ...ni.limitations] };
  const netAnnual = subtractMoney(subtractMoney(tax.grossAnnual, tax.incomeTax), ni.employeeNi);
  return { status: "RESOLVED", classification: "CALCULATED", lineageClassifications: lineage, calculationVersion: version,
    taxYear: tax.taxYear, jurisdiction: tax.jurisdiction, grossAnnual: tax.grossAnnual, adjustedNetIncome: tax.adjustedNetIncome, personalAllowance: tax.personalAllowance, taxableIncome: tax.taxableIncome,
    incomeTax: tax.incomeTax, employeeNi: ni.employeeNi, netAnnual, netMonthlyEquivalent: monthlyEquivalent(netAnnual,"ANNUAL"),
    taxBreakdown: tax, niBreakdown: ni, formula: "grossAnnual - incomeTax - employeeNi; netAnnual / 12",
    referenceRelease: [...tax.referenceRelease, ...ni.referenceRelease], evidenceLineage: [...tax.evidenceLineage, ...ni.evidenceLineage], diagnostics: [...tax.diagnostics, ...ni.diagnostics], limitations: [...tax.limitations, ...ni.limitations],
  };
}
