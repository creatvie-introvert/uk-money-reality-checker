import { z } from "zod";
import { gbpText } from "../contracts/input";
import type { ScenarioCalculationResult } from "../contracts/scenario";
import type { IncomeEvidenceLoader, NetEmploymentResolved } from "../contracts/income";
import type { SalaryPreservationEligibility, SalaryPreservationOptions, SalaryPreservationReason, SalaryPreservationResult, SalarySearchMetadata } from "../contracts/salary-preservation";
import type { Diagnostic, DiagnosticCode } from "../diagnostics";
import { calculateNetEmploymentIncome } from "../calculators/income";
import { addMoney, subtractMoney, compareMoney, multiplyMoney, fromGbp, type Money } from "../money";

/** Operational safety limit only. Callers may lower it, but cannot raise it in this version. */
export const SALARY_PRESERVATION_MAX_GROSS_GBP = "10000000.00";
const zero = fromGbp("0"), blockPence = BigInt(200);
const optionsSchema = z.strictObject({ maxGrossAnnualSalaryGbp: gbpText.optional() });
const salaryText = (pence: bigint) => `${pence / BigInt(100)}.${String(pence % BigInt(100)).padStart(2, "0")}`;
const moneyAt = (pence: bigint) => fromGbp(salaryText(pence));
function diagnostic(code: DiagnosticCode, message: string, severity: Diagnostic["severity"] = "blocking"): Diagnostic {
  return { code, message, severity, kind: "calculation_policy", metric: "salary_preservation" };
}

/** Certify the search geometry using forward-engine outputs, never inverse tax tables.
 * Allowance drops align with £2 block starts; 3*t + 2*n < 2 proves increasing
 * endpoint maxima even when an interval crosses a tax/NI band. See the proof in docs.
 */
function supportsBlockSearch(income: NetEmploymentResolved): boolean {
  const pa = income.personalAllowance;
  const aligned = (money: Money, unit: bigint) => BigInt(money.numerator) % (BigInt(money.denominator) * unit) === BigInt(0);
  const maxRate = (rates: readonly string[]) => rates.map(fromGbp).reduce((a, b) => compareMoney(a, b) >= 0 ? a : b, zero);
  const t = maxRate(income.taxBreakdown.bands.map((b) => b.rate));
  const n = maxRate(income.niBreakdown.bands.map((b) => b.rate));
  return income.calculationVersion === "employment-annual-v1"
    && pa.rounding === "CEILING_TO_WHOLE_GBP_ITA2007_S35_3"
    && compareMoney(fromGbp(pa.taperRate), fromGbp("0.5")) === 0
    && aligned(pa.beforeTaper, BigInt(100)) && aligned(pa.taperStart, blockPence)
    && aligned(pa.zeroPointFromEvidence, blockPence)
    && compareMoney(addMoney(multiplyMoney(t, BigInt(3)), multiplyMoney(n, BigInt(2))), fromGbp("2")) < 0;
}

/** Consume genuine scenario-calculator results. Existing destination gross is optional. */
export function evaluateSalaryPreservationEligibility(loader: IncomeEvidenceLoader, current: ScenarioCalculationResult, destination: ScenarioCalculationResult): SalaryPreservationEligibility {
  const reasons: SalaryPreservationReason[] = [];
  if (current.incomeResult?.status !== "RESOLVED") reasons.push("CURRENT_INCOME_UNRESOLVED");
  if (current.householdCostResult?.completeness !== "COMPLETE") reasons.push("CURRENT_COSTS_INCOMPLETE");
  if (current.residual?.completeness !== "COMPLETE") reasons.push("CURRENT_RESIDUAL_INCOMPLETE");
  if (destination.householdCostResult?.completeness !== "COMPLETE") reasons.push("DESTINATION_COSTS_INCOMPLETE");
  if (destination.status !== "EVALUATED") reasons.push("DESTINATION_SCENARIO_UNRESOLVED");
  const input = destination.status === "EVALUATED" ? destination.inputUsed.location.income : undefined;
  if (input?.taxJurisdiction !== "rUK" && input?.taxJurisdiction !== "Scotland") reasons.push("DESTINATION_TAX_JURISDICTION_UNSUPPORTED");
  if (input?.niCategory !== "A" || input?.calculationBasis !== "ANNUAL_COMPARISON") reasons.push("DESTINATION_NI_UNSUPPORTED");
  if (input?.scope !== "ONE_EMPLOYEE_ONE_EMPLOYMENT") reasons.push("DESTINATION_EMPLOYMENT_UNSUPPORTED");
  if (input?.netMonthlyIncomeOverride !== undefined) reasons.push("DESTINATION_NET_OVERRIDE_CONFLICT");
  const ineligible = (extra: readonly Diagnostic[] = []): SalaryPreservationEligibility => ({
    status: "INELIGIBLE", reasons, diagnostics: [
      diagnostic("SALARY_PRESERVATION_INELIGIBLE", "Salary preservation requires complete current income, costs and residual, complete destination costs and supported employment selectors."),
      ...reasons.map((reason) => diagnostic(reason, reason.replaceAll("_", " "))), ...extra,
    ],
  });
  if (reasons.length || current.status !== "EVALUATED" || current.completeness !== "COMPLETE" || destination.status !== "EVALUATED" || destination.householdCostResult.completeness !== "COMPLETE") return ineligible();
  const employmentInput = {
    jurisdiction: input!.taxJurisdiction, niCategory: input!.niCategory!, taxYear: input!.taxYear!,
    scope: "ONE_EMPLOYEE_ONE_EMPLOYMENT" as const, basis: "ANNUAL_COMPARISON" as const,
    effectiveOn: destination.inputUsed.location.effectiveOn,
  };
  const zeroIncome = calculateNetEmploymentIncome(loader, { ...employmentInput, grossAnnualSalaryGbp: "0" });
  if (zeroIncome.status !== "RESOLVED") {
    reasons.push("DESTINATION_EMPLOYMENT_UNSUPPORTED");
    return ineligible(zeroIncome.diagnostics);
  }
  if (!supportsBlockSearch(zeroIncome)) {
    reasons.push("SALARY_SEARCH_REFERENCE_UNSUPPORTED");
    return ineligible();
  }
  const currentResidualMonthly = current.residual.completeResidualMonthly;
  const destinationCompleteMonthlyCost = destination.householdCostResult.totalMonthlyCost;
  return {
    status: "ELIGIBLE", employmentInput, zeroIncome, diagnostics: [],
    target: { classification: "CALCULATED", currentResidualMonthly, destinationCompleteMonthlyCost, requiredDestinationNetMonthly: addMoney(currentResidualMonthly, destinationCompleteMonthlyCost) },
    lineage: {
      current: { inputUsed: current.inputUsed, effectiveIncomeClassification: current.incomeResult.classification, incomeResolutionSource: current.incomeResult.resolutionSource, evidence: current.evidenceLineage, releases: current.dataReleaseMetadata },
      destination: { inputUsed: destination.inputUsed, costs: destination.evidenceLineage.householdCosts, releases: destination.dataReleaseMetadata },
      employmentReferenceReleases: zeroIncome.referenceRelease,
      employmentRecordIds: zeroIncome.evidenceLineage.map((r) => r.recordId),
    },
  };
}

/** No externally supplied eligibility token is trusted: eligibility is always re-evaluated. */
export function solveSalaryPreservation(loader: IncomeEvidenceLoader, current: ScenarioCalculationResult, destination: ScenarioCalculationResult, options: SalaryPreservationOptions = {}): SalaryPreservationResult {
  const config = optionsSchema.parse(options);
  const maximum = fromGbp(config.maxGrossAnnualSalaryGbp ?? SALARY_PRESERVATION_MAX_GROSS_GBP);
  if (compareMoney(maximum, fromGbp(SALARY_PRESERVATION_MAX_GROSS_GBP)) > 0) throw new RangeError("Salary preservation maximum exceeds the operational limit.");
  const eligible = evaluateSalaryPreservationEligibility(loader, current, destination);
  if (eligible.status === "INELIGIBLE") return eligible;
  const maxPence = BigInt(maximum.numerator) / BigInt(maximum.denominator);
  const target = eligible.target.requiredDestinationNetMonthly;
  const search: SalarySearchMetadata = {
    algorithm: "TWO_POUND_BLOCK_MAXIMA_V1", searchUnit: "ONE_PENNY_ANNUAL_GROSS",
    operationalMaximum: maximum, lowerBoundChecked: zero, upperBoundChecked: zero,
    iterations: 0, forwardEvaluations: 1, localPenceChecked: 0,
  };
  const cache = new Map<bigint, NetEmploymentResolved>([[BigInt(0), eligible.zeroIncome]]);
  const forward = (pence: bigint): NetEmploymentResolved => {
    const cached = cache.get(pence);
    if (cached) return cached;
    const result = calculateNetEmploymentIncome(loader, { ...eligible.employmentInput, grossAnnualSalaryGbp: salaryText(pence) });
    // The typed loader is immutable for a solve. Failure after its validated probe is a configuration error.
    if (result.status !== "RESOLVED") throw new Error("Employment references changed or became invalid during salary search.");
    search.forwardEvaluations++;
    if (compareMoney(result.grossAnnual, search.upperBoundChecked) > 0) search.upperBoundChecked = result.grossAnnual;
    cache.set(pence, result);
    return result;
  };
  const meets = (pence: bigint) => compareMoney(forward(pence).netMonthlyEquivalent, target) >= 0;
  const base = {
    calculationVersion: "salary-preservation-v1" as const, classification: "CALCULATED" as const,
    target: eligible.target, taxJurisdiction: eligible.zeroIncome.jurisdiction,
    niCategory: "A" as const, calculationBasis: "ANNUAL_COMPARISON" as const,
    lineage: eligible.lineage, search, limitations: [...eligible.zeroIncome.limitations,
      "Preserves the declared complete residual using annual-comparison employment income; makes no affordability judgement.",
      `Search is limited to annual gross £${SALARY_PRESERVATION_MAX_GROSS_GBP}; this is an operational, not statutory, limit.`,
    ],
  };
  const solved = (pence: bigint): SalaryPreservationResult => {
    const result = forward(pence);
    const previous = pence > BigInt(0) ? forward(pence - BigInt(1)) : undefined;
    if (!meets(pence) || previous && compareMoney(previous.netMonthlyEquivalent, target) >= 0) throw new Error("Salary search minimality invariant failed.");
    const overshootMonthly = subtractMoney(result.netMonthlyEquivalent, target);
    return {
      ...base, status: "ELIGIBLE_SOLVED", requiredGrossAnnualSalary: result.grossAnnual,
      requiredGrossAnnualSalaryGbp: salaryText(pence), achievedNetAnnual: result.netAnnual,
      achievedNetMonthly: result.netMonthlyEquivalent,
      achievedResidualMonthly: subtractMoney(result.netMonthlyEquivalent, eligible.target.destinationCompleteMonthlyCost), overshootMonthly,
      minimality: { guarantee: "GLOBAL_MINIMUM_WITHIN_BOUNDS", earlierBlocksExcluded: true, earlierLocalPenniesExcluded: true,
        previousPenny: previous ? { status: "BELOW_TARGET", grossAnnual: previous.grossAnnual, netMonthly: previous.netMonthlyEquivalent } : { status: "NOT_APPLICABLE_ZERO_SALARY" },
        exactTargetMatch: compareMoney(overshootMonthly, zero) === 0,
      },
      diagnostics: [...result.diagnostics, diagnostic("SALARY_PRESERVATION_SOLVED", "Minimum annual gross salary preserves the complete current monthly residual within the declared search bounds.", "info")],
    };
  };
  if (meets(BigInt(0))) return solved(BigInt(0));
  // Search FULL blocks only. A truncated final block can have a lower maximum
  // than the previous full block at an allowance drop; never binary-search it.
  const fullBlocks = (maxPence + BigInt(1)) / blockPence;
  const endpoint = (index: bigint) => index * blockPence + blockPence - BigInt(1);
  let block = fullBlocks;
  if (fullBlocks > BigInt(0) && meets(endpoint(fullBlocks - BigInt(1)))) {
    let low = BigInt(-1), high = fullBlocks - BigInt(1);
    while (high - low > BigInt(1)) {
      search.iterations++;
      const mid = (low + high) / BigInt(2);
      if (meets(endpoint(mid))) high = mid;
      else low = mid;
    }
    block = high;
  } else if (fullBlocks * blockPence > maxPence || !meets(maxPence)) {
    return { ...base, status: "NO_SOLUTION_WITHIN_BOUNDS", diagnostics: [diagnostic("SALARY_PRESERVATION_NO_SOLUTION", "No salary within the inclusive operational bound meets the target; no capped salary is returned.", "warning")] };
  }
  const start = block * blockPence;
  const end = endpoint(block) < maxPence ? endpoint(block) : maxPence;
  search.localWindow = { lowerInclusive: moneyAt(start), upperInclusive: moneyAt(end) };
  for (let pence = start; pence <= end; pence++) {
    search.localPenceChecked++;
    if (meets(pence)) return solved(pence);
  }
  throw new Error("Salary search qualifying block invariant failed.");
}
