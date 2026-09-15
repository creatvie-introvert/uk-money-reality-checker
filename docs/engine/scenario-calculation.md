# Slice 4: single-scenario calculation

## Scope and starting state

Started from `92fd8c566d646bfff1c5f573cfdee8d132e679c2` (Build Milestone 2 household cost engine) on `rebuild/next-production`. Live origin and the local tracking branch matched, 0 ahead / 0 behind. The v3.1 raw workbook was the only untracked starting file.

`calculateScenario(evidence, input)` validates and evaluates **one scenario**, composing the existing employment-income and household-cost calculators. The only added monetary operation is exact residual subtraction. It does not calculate tax/NI again, recalculate household categories, compare cities, solve salaries, rank costs, score affordability, recommend actions or render UI.

## Public input and API

The public `ScenarioInput` has `{ household, location }`. Household and all cost selectors/overrides reuse the existing schemas. `scenarioInputSchema` is available for callers wanting validation before evaluation; `calculateScenario` also validates and accepts unknown input safely.

`location.income` uses the existing field names, with optional employment fields:

- `grossAnnualSalaryGbp`: nonnegative decimal text, at most two places and 128 characters.
- `taxJurisdiction`, `taxYear`, `niCategory`, `scope`, `calculationBasis`: explicit baseline selections; none are defaulted.
- `payPeriod`: existing optional reference-selection metadata; does not change annual-comparison arithmetic.
- `netMonthlyIncomeOverride`: `{ amountGbp: "2800", period: "MONTHLY", note?: "Actual take-home" }`. Nonnegative, including explicit zero.

A supported baseline requires gross salary, year, category A, `ONE_EMPLOYEE_ONE_EMPLOYMENT`, `ANNUAL_COMPARISON` and explicit rUK/Scotland jurisdiction. Unsupported jurisdiction, scope or basis strings are accepted as declared selections so the income engine can return a business diagnostic, and a valid net override can still resolve effective income. Malformed money, unknown income-model fields and invalid override periods remain input errors even when a baseline or override could otherwise resolve.

Net-only input needs no gross salary or tax selectors:

```ts
import { calculateScenario, createEvidenceLoader } from "@/engine";

const result = calculateScenario(createEvidenceLoader(), {
  household: { adults: 1, children: 0 },
  location: {
    cityId: "LOC-MAN",
    effectiveOn: "2026-09-14",
    housing: { bedrooms: 2, rentSourceMonth: "2026-07", overrides: {} },
    income: { netMonthlyIncomeOverride: { amountGbp: "2800", period: "MONTHLY" } },
    spending: {},
    transport: { status: "UNRESOLVED" },
  },
});
```

`income: {}` is valid syntax and yields unresolved income. No missing amount becomes zero. Household-cost fields remain required as in Slice 3. This API is independent of the earlier two-location `normalizeCalculatorInput`: no destination scenario is needed. The legacy validator now also permits explicit zero net overrides, but its gross-employment requirements remain unchanged. Its derived `grossAnnualSalary` field is not an input to this single-scenario schema; pass the declared decimal-text fields.

The household engine's context now requires only cost fields and the evidence loader. Existing normalized category contexts remain structurally compatible. This small dependency change lets net-only scenarios reuse household arithmetic without creating a dummy gross salary. Household category resolution and aggregation rules are unchanged.

## Effective income and baseline preservation

Effective-income precedence:

1. Valid explicitly entered monthly net amount.
2. Existing calculated monthly employment net.
3. Structured unresolved income, with no amount.

If gross is present, call `calculateNetEmploymentIncome` once, including when an override exists. Its complete output remains under `incomeResult.baselineIncome.calculation`, including allowance, tax/NI band breakdowns, exact annual/monthly net, diagnostics, limitations, references and release versions. Gross, tax, NI and baseline net are never changed by the override.

`baselineIncome` is:

- `AVAILABLE` with a resolved employment calculation.
- `UNAVAILABLE / GROSS_INCOME_NOT_SUPPLIED` with an informational diagnostic and no fake calculation.
- `UNAVAILABLE / EMPLOYMENT_CALCULATION_UNRESOLVED` with the original unresolved calculation and blocking diagnostics.

`incomeResult` is independently RESOLVED or UNRESOLVED. Only resolved income exposes `effectiveMonthlyNetIncome`:

| Effective path | Classification | resolutionSource |
| --- | --- | --- |
| Employment calculation | CALCULATED | CALCULATED_EMPLOYMENT_INCOME |
| Monthly net override | USER_ENTERED | USER_OVERRIDE |

A valid override downgrades baseline failures to warnings in effective/scenario diagnostics, while the original baseline diagnostics remain unchanged. Effective diagnostic paths point into the scenario input; baseline paths remain those of the employment request. Effective income is never OBSERVED_DATA. User-entered income is not reverse-calculated into gross or verified against a payslip.

## Scenario and residual contracts

`ScenarioCalculationResult` first discriminates input validity:

- `status: INVALID_INPUT`, `completeness: UNRESOLVED`: path-addressed validation diagnostics; no income, cost or residual calculation objects.
- `status: EVALUATED`: valid syntax, evaluated income, the unchanged household result, residual state, city, input used, diagnostics, unresolved cost categories and release/lineage metadata. EVALUATED does not mean complete.

For evaluated results, scenario completeness is determined solely by income resolution and household completeness:

| Income | Household costs | Scenario / residual completeness |
| --- | --- | --- |
| RESOLVED | COMPLETE | COMPLETE |
| RESOLVED | PARTIAL | PARTIAL |
| RESOLVED | UNRESOLVED | UNRESOLVED |
| UNRESOLVED | Any | UNRESOLVED |

There is no extra metadata score or optional-metadata completeness rule. Baseline warnings under a valid override do not make an otherwise complete declared scenario partial.

The nested `residual` is a discriminated union:

- **COMPLETE:** `completeResidualMonthly = effectiveMonthlyNetIncome − householdCostResult.totalMonthlyCost`.
- **PARTIAL:** `partialResidualAfterResolvedCosts = effectiveMonthlyNetIncome − householdCostResult.resolvedSubtotalMonthly`.
- **UNRESOLVED:** no monetary field; reason `INCOME_UNRESOLVED` or `COST_SUBTOTAL_UNAVAILABLE`.

The two residual monetary fields cannot coexist. Only a complete household result exposes `totalMonthlyCost`. All resolved/partial residuals are CALCULATED using existing rational-pence `subtractMoney`; no floating-point arithmetic, display rounding or zero clamp is added.

`unresolvedCategories` is exactly the household engine's unresolved cost list. Income resolution is represented separately by `incomeResult.status` and its diagnostics; tax/NI are never inserted into household costs. With unresolved income and complete costs, the supported costs remain visible while residual remains absent. With resolved income and no subtotal, income stays visible while residual remains absent.

### Negative and zero amounts

Negative complete residuals are legitimate shortfalls in the declared complete scope. Negative partial residuals are shortfalls **before the still-unresolved costs**: net £1,500 less known costs £1,700 yields −£200, with other costs still excluded. A positive partial residual is not complete disposable income and may be reduced or eliminated by the missing costs.

An explicitly entered zero net amount resolves income. A genuine resolved zero cost subtotal retains the household PARTIAL state, allowing an exact partial residual; absent costs do not create such a zero. Existing category-specific zero/N/A rules are unchanged.

## Worked examples

The complete cost fixture uses rent £1,500, council tax £170, energy £120, water £55, groceries £300, essentials £80, lifestyle £100 and transport £70: **£2,395/month**. These are explicit user inputs, not inferred source defaults.

### A. COMPLETE

Supported rUK employment, gross £50,000, pinned 2026/27 rules: the existing engine returns £39,519.60 annual net, or £3,293.30 monthly. All fixture costs resolve. Complete residual = £3,293.30 − £2,395 = **£898.30**.

### B. PARTIAL

User net £3,000. Observed Manchester two-bedroom July rent £1,227; declared Manchester Band D council charge £2,312.04 annual / 12 = £192.67; user groceries £300. Resolved subtotal **£1,719.67**. Energy, water, essentials, lifestyle and transport remain unresolved.

`partialResidualAfterResolvedCosts = £1,280.33`. No complete cost or complete residual is exposed.

### C. Net-income override

Same £50,000 baseline as A plus actual monthly take-home override **£2,800**. Effective income is USER_ENTERED; baseline monthly £3,293.30 and its tax/NI evidence remain intact. With complete fixture costs, residual = £2,800 − £2,395 = **£405**. Omitting gross instead still resolves effective income, with an unavailable baseline and informational diagnostic.

## Diagnostics and lineage

New codes: `SCENARIO_INCOME_UNRESOLVED`, `SCENARIO_COSTS_PARTIAL`, `SCENARIO_COSTS_UNRESOLVED`, `SCENARIO_RESIDUAL_PARTIAL`, `NET_INCOME_OVERRIDE_APPLIED`, `BASELINE_INCOME_UNAVAILABLE`. Existing calculator/category diagnostics pass through, including Edinburgh rent, London council tax, Birmingham water, energy model requirements and transport product gaps.

The scenario's extra `evidenceLineage` contains compact record/dataset/source/snapshot IDs and source-specific period/effective dates, grouped as income baseline and household category references. References are deduplicated within each group. It does not copy full source datasets into another scenario-level evidence array. Original rich baseline/category outputs remain available unchanged for explanations, including Greater Glasgow rent geography and source qualifications.

`dataReleaseMetadata` retains the active loader metadata by release. There is **no universal scenario data date**. Input `effectiveOn` is an applicability query date, not a claim that rent, tax, transport and national spending observations share one date. July 2026 rent, 2026/27 tax and date-qualified transport evidence remain distinct. No source dates are advanced to make a scenario resolve.

## Limits and next work

The existing simple-employment scope, annual-comparison NI limitation and household modelling gaps remain. Overrides resolve declared effective amounts without filling those evidence/model gaps. Invalid source configuration can still throw at the loader trust boundary; ordinary missing/unsupported business evidence remains structured unresolved.

The existing two-location result/comparison interfaces remain future boundaries. No destination-minus-current, residual change, salary needed, optimisation, ranking or recommendation is calculated here. Recommended next slice: a completeness-aware comparison of two independently evaluated scenarios, with explicit rules for comparing partial versus complete results. Salary preservation remains separate work.

## Validation result

All required commands passed: `npm run lint`, `npm run typecheck`, `npm test` (729 tests across 15 files), `npm run build`, `npm run data:verify` and `git diff --check`. The targeted engine suite passed 252 tests: 39 new scenario tests plus the unchanged foundation, income and household suites. Tests cover override precedence, unavailable/preserved baselines, zero and invalid inputs, complete/partial/negative residuals, exact fractional pennies, no-fallback gaps, classification, compact lineage, source periods, composition and immutability.

All 32 generated M1 artifacts matched their starting SHA-256 hashes. Data verification reconciled 1,191 observed rows and 80 coverage cells. The raw workbook remained untracked and unchanged, SHA-256 `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`. The build-generated `next-env.d.ts` change was restored and typecheck passed again. No tax/NI arithmetic, household category arithmetic, generated/controlled evidence, dependencies or UI changed. No commit was made.
