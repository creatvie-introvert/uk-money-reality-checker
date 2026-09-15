import { scenarioInputSchema, type BaselineIncome, type ScenarioCalculationResult, type ScenarioIncomeResult, type ScenarioInput, type ScenarioEvidenceReference } from "../contracts/scenario";
import type { EngineEvidence } from "../contracts/output";
import type { Diagnostic, DiagnosticCode } from "../diagnostics";
import type { EvidenceLoader } from "../loaders";
import { fromGbp, subtractMoney } from "../money";
import { calculateNetEmploymentIncome } from "./income";
import { calculateHouseholdMonthlyCosts } from "./household";

function scenarioDiagnostic(cityId: ScenarioInput["location"]["cityId"], code: DiagnosticCode, severity: Diagnostic["severity"], message: string): Diagnostic {
  return { code, cityId, severity, kind: code === "NET_INCOME_OVERRIDE_APPLIED" ? "user_override" : "evidence_gap", message, canResolveWithUserInput: true };
}
function resolveIncome(loader: EvidenceLoader, location: ScenarioInput["location"]): ScenarioIncomeResult {
  const income = location.income;
  let baselineIncome: BaselineIncome;
  if (income.grossAnnualSalaryGbp === undefined) {
    baselineIncome = {
      status: "UNAVAILABLE", reason: "GROSS_INCOME_NOT_SUPPLIED",
      diagnostics: [scenarioDiagnostic(location.cityId, "BASELINE_INCOME_UNAVAILABLE", "info", "No gross salary was supplied; no employment baseline or implied gross salary was created.")],
    };
  } else {
    // Compose the existing annual engine once. Pay period and net override do not alter its request.
    const calculation = calculateNetEmploymentIncome(loader, {
      grossAnnualSalaryGbp: income.grossAnnualSalaryGbp, jurisdiction: income.taxJurisdiction,
      taxYear: income.taxYear, niCategory: income.niCategory, scope: income.scope,
      basis: income.calculationBasis, effectiveOn: location.effectiveOn,
    });
    baselineIncome = calculation.status === "RESOLVED"
      ? { status: "AVAILABLE", calculation }
      : { status: "UNAVAILABLE", reason: "EMPLOYMENT_CALCULATION_UNRESOLVED", calculation, diagnostics: calculation.diagnostics };
  }
  const baselineDiagnostics = baselineIncome.status === "AVAILABLE" ? baselineIncome.calculation.diagnostics : baselineIncome.diagnostics;
  // Baseline diagnostics retain calculator-request paths; effective diagnostics point into the scenario.
  const effectiveDiagnostics = baselineDiagnostics.map((d): Diagnostic => {
    const [field, ...rest] = d.path ?? [];
    const scenarioField = field === "basis" ? "calculationBasis" : field === "jurisdiction" ? "taxJurisdiction" : field;
    return {
      ...d, cityId: location.cityId, canResolveWithUserInput: true,
      ...(field !== undefined ? { path: field === "effectiveOn" ? ["location", field, ...rest] : ["location", "income", scenarioField!, ...rest] } : {}),
    };
  });
  const limitations = baselineIncome.calculation?.limitations ?? ["Employment tax/NI baseline unavailable without gross salary and supported employment selections."];
  const common = { baselineIncome, inputUsed: structuredClone(income), limitations };
  if (income.netMonthlyIncomeOverride !== undefined) {
    return {
      ...common, status: "RESOLVED", effectiveMonthlyNetIncome: fromGbp(income.netMonthlyIncomeOverride.amountGbp),
      classification: "USER_ENTERED", resolutionSource: "USER_OVERRIDE",
      diagnostics: [
        ...effectiveDiagnostics.map((d) => ({ ...d, severity: d.severity === "blocking" ? "warning" as const : d.severity })),
        scenarioDiagnostic(location.cityId, "NET_INCOME_OVERRIDE_APPLIED", "info", "Using the entered monthly take-home amount. The employment baseline, where available, is retained without alteration."),
      ],
      limitations: [...limitations, "Effective monthly income is user entered; it is not reverse-calculated into gross income or verified against the employment baseline."],
    };
  }
  if (baselineIncome.status === "AVAILABLE") return {
    ...common, status: "RESOLVED", effectiveMonthlyNetIncome: baselineIncome.calculation.netMonthlyEquivalent,
    classification: "CALCULATED", resolutionSource: "CALCULATED_EMPLOYMENT_INCOME",
    diagnostics: effectiveDiagnostics,
  };
  return {
    ...common, status: "UNRESOLVED", diagnostics: [
      ...effectiveDiagnostics,
      scenarioDiagnostic(location.cityId, "SCENARIO_INCOME_UNRESOLVED", "blocking", "Neither a valid monthly net override nor a supported employment calculation resolves income."),
    ],
  };
}
function references(records: readonly EngineEvidence[]): ScenarioEvidenceReference[] {
  const unique = new Map<string, ScenarioEvidenceReference>();
  for (const record of records) {
    const p = record.provenance;
    const reference: ScenarioEvidenceReference = {
      recordId: record.recordId, dataset: record.dataset, sourceId: p.sourceId, snapshotId: p.snapshotId,
      ...(p.sourcePeriod ? { sourcePeriod: p.sourcePeriod } : {}),
      ...(p.effectiveFrom ? { effectiveFrom: p.effectiveFrom } : {}),
      ...(p.effectiveTo ? { effectiveTo: p.effectiveTo } : {}),
    };
    unique.set(`${record.dataset}:${record.recordId}:${p.snapshotId}`, reference);
  }
  return [...unique.values()];
}
/** One scenario only. Schema failures are returned; configuration corruption may still throw. */
export function calculateScenario(loader: EvidenceLoader, raw: unknown): ScenarioCalculationResult {
  const parsed = scenarioInputSchema.safeParse(raw);
  if (!parsed.success) return {
    status: "INVALID_INPUT", completeness: "UNRESOLVED",
    diagnostics: parsed.error.issues.map((issue) => ({ code: "INVALID_INPUT", severity: "blocking", kind: "validation", message: issue.message, path: issue.path.map((p) => typeof p === "number" ? p : String(p)), canResolveWithUserInput: true })),
  };
  const input = parsed.data;
  const incomeResult = resolveIncome(loader, input.location);
  const householdCostResult = calculateHouseholdMonthlyCosts({ location: input.location, evidence: loader });
  const diagnostics = [...incomeResult.diagnostics, ...householdCostResult.diagnostics];
  if (householdCostResult.completeness === "PARTIAL") diagnostics.push(scenarioDiagnostic(input.location.cityId, "SCENARIO_COSTS_PARTIAL", "warning", "Household costs contain a resolved subtotal and unresolved categories; no complete cost is available."));
  if (householdCostResult.completeness === "UNRESOLVED") diagnostics.push(scenarioDiagnostic(input.location.cityId, "SCENARIO_COSTS_UNRESOLVED", "blocking", "No household cost amount is resolved; residual income cannot be calculated."));
  const base = {
    status: "EVALUATED" as const, cityId: input.location.cityId, inputUsed: input,
    unresolvedCategories: householdCostResult.unresolvedCategories, diagnostics,
    dataReleaseMetadata: loader.metadata, calculationVersion: "single-scenario-v1" as const,
    evidenceLineage: {
      incomeBaseline: references(incomeResult.baselineIncome.status === "AVAILABLE" ? incomeResult.baselineIncome.calculation.evidenceLineage : []),
      householdCosts: householdCostResult.categoryResults.map((r) => ({ category: r.category, references: references(r.evidenceLineage) })),
    },
  };
  if (incomeResult.status === "UNRESOLVED" || householdCostResult.completeness === "UNRESOLVED") return {
    ...base, completeness: "UNRESOLVED", incomeResult, householdCostResult,
    residual: { completeness: "UNRESOLVED", reason: incomeResult.status === "UNRESOLVED" ? "INCOME_UNRESOLVED" : "COST_SUBTOTAL_UNAVAILABLE" },
  };
  if (householdCostResult.completeness === "PARTIAL") return {
    ...base, completeness: "PARTIAL", incomeResult, householdCostResult,
    residual: {
      completeness: "PARTIAL", partialResidualAfterResolvedCosts: subtractMoney(incomeResult.effectiveMonthlyNetIncome, householdCostResult.resolvedSubtotalMonthly),
      classification: "CALCULATED", formula: "effectiveMonthlyNetIncome - resolvedSubtotalMonthly",
    },
    diagnostics: [...diagnostics, scenarioDiagnostic(input.location.cityId, "SCENARIO_RESIDUAL_PARTIAL", "warning", "Residual after resolved costs only; unresolved costs are still excluded. A negative amount is a shortfall before those remaining costs.")],
  };
  return {
    ...base, completeness: "COMPLETE", incomeResult, householdCostResult,
    residual: {
      completeness: "COMPLETE", completeResidualMonthly: subtractMoney(incomeResult.effectiveMonthlyNetIncome, householdCostResult.totalMonthlyCost),
      classification: "CALCULATED", formula: "effectiveMonthlyNetIncome - totalMonthlyCost",
    },
  };
}
