# Salary preservation: eligibility and minimum annual gross salary

## Meaning and public API

Slice 7 implements the locked result “salary needed to preserve current financial buffer”. For current **complete** monthly residual `R` and destination **complete** household cost `C`, find the smallest nonnegative annual gross salary `S`, in £0.01 increments, for which:

```text
requiredDestinationNetMonthly = R + C
forwardEmploymentNetMonthly(S) - C >= R
```

The target is exact rational money. A negative current residual is valid; the result preserves that negative buffer. It makes no affordability, safety or recommendation judgement.

```ts
import { evaluateSalaryPreservationEligibility, solveSalaryPreservation } from "@/engine";

const eligibility = evaluateSalaryPreservationEligibility(evidence, currentResult, destinationResult);
const result = solveSalaryPreservation(evidence, currentResult, destinationResult, {
  maxGrossAnnualSalaryGbp: "10000000.00", // optional inclusive operational cap
});
if (result.status === "ELIGIBLE_SOLVED") {
  // Exact Money values; format only at the presentation boundary.
  result.requiredGrossAnnualSalary;
  result.achievedNetMonthly;
  result.achievedResidualMonthly;
  result.overshootMonthly;
  result.minimality;
}
```

Both APIs consume genuine `calculateScenario` outputs and an immutable typed income-evidence loader. They do not accept arbitrary unvalidated JSON as scenario results. The solver re-evaluates eligibility rather than trusting an externally supplied eligibility token. Existing destination gross salary is optional and does not constrain the search. An unavailable destination income/residual caused solely by absent gross salary does not prevent solving when its costs and employment selectors are valid.

`SalaryPreservationTarget`, eligibility/result unions, options and search metadata are in `src/engine/contracts/salary-preservation.ts`; implementation is private to `comparison/salary-preservation.ts`, with public exports through `@/engine`.

## Eligibility and overrides

Current income must resolve, household costs must be COMPLETE, and residual must be COMPLETE. Destination costs must be COMPLETE. No resolved subtotal or partial residual can establish a salary target. Invalid scenario inputs are ineligible.

Destination employment requires explicit rUK or Scotland jurisdiction, one employee/one employment, Class 1 category A, `ANNUAL_COMPARISON`, a supported tax year and effective date. A zero-salary forward calculation validates the actual tax/NI references. Jurisdiction is never inferred from city. `payPeriod` does not change the annual-comparison calculation, consistent with scenario orchestration.

Current monthly net overrides and complete cost overrides on either side are valid; their USER_ENTERED ancestry is retained. Explicit no-cost transport can participate in complete costs. A **destination net override is rejected**, including zero and overrides alongside valid gross salary. The caller must explicitly exclude the override before requesting a salary-based result. It is never silently ignored.

Missing Edinburgh rent, London council tax, Birmingham water, energy, groceries, spending or transport remains a blocking gap unless an existing supported selection or explicit valid override resolves it. This slice adds no source fallback, model or zero substitution.

## Safe search and proof of global minimality

The existing [income engine](income-tax-ni.md) is the only calculator of tax, NI and take-home. Salary trials use integer BigInt pence, converted to exact decimal salary text. There is no inverse tax formula or duplicate tax table.

Ordinary penny-level binary search is unsafe: whole-pound Personal Allowance rounding creates downward net steps. The solver partitions salaries into **£2 blocks**, `[£2k, £(2k+1.99)]`. It validates this certificate from the existing forward calculator's loaded reference outputs:

1. Engine/rounding versions are the documented annual employment calculation and whole-pound allowance ceiling.
2. The taper rate is exactly one half; the base allowance is whole pounds, and taper start and zero-allowance point align to £2 boundaries.
3. Let `t` be the maximum loaded marginal tax rate and `n` the maximum loaded marginal employee NI rate. Require the sufficient inequality `3t + 2n < 2` using exact arithmetic. These are loaded maxima, not hard-coded jurisdiction rates.

**Within a block:** the allowance is constant. Tax and NI are continuous piecewise-linear functions of gross, even across rate-band boundaries. The certificate implies `t+n<1`, so net increases strictly within that block. Its last penny is its maximum.

**Between full-block endpoints:** gross increases by £2 and allowance falls by at most £1. Taxable income therefore increases by at most £3; tax increases by at most `3t` pounds and NI by at most `2n` pounds. Net increases by at least `2-3t-2n>0`. Thus full-block maxima are strictly increasing, including before, during and after taper and across rate-band boundaries. The certificate is sufficient without depending on where a rate change falls inside a block.

The solver binary-searches those full-block maxima to identify the **first** block that can meet the target, then checks its pennies in ascending order (at most 200). Every earlier block is excluded by its maximum; every earlier penny in the selected block is explicitly checked. This proves global minimality over the declared domain, beyond the adjacent-penny check. The returned salary is also checked against the target, and its previous penny is separately verified to fail when salary is positive.

A cap may truncate the final block. Its maximum can be lower than the preceding full-block maximum at a taper drop. Therefore it is **not** inserted into the binary-search sequence. Only after ruling out all full blocks does the solver inspect the truncated block's endpoint and, if qualifying, scan it. For example, at a £100,002 cap, £100,001.99 can meet a target that the cap itself fails.

Unsupported certificate conditions produce `INELIGIBLE / SALARY_SEARCH_REFERENCE_UNSUPPORTED`, rather than applying an unproven search to changed references. Future income/rounding versions need review of this proof. References must remain immutable during a solve; an unexpected forward failure after validation throws a configuration error, never a fabricated no-solution result.

## Bounds, precision and performance

The lower bound is £0. The default and hard operational maximum is **£10,000,000.00 annual gross**, exported as `SALARY_PRESERVATION_MAX_GROSS_GBP`. Callers may select a lower inclusive cap down to £0. This is an operational safety limit, not a statutory salary maximum or a new limit on the existing income calculator. Invalid options (negative, subpenny, unknown fields or above the hard limit) throw validation/RangeError exceptions, separate from business ineligibility.

No bound expansion is needed: the finite search has at most 5,000,000 full £2 blocks. It performs at most 23 binary decisions and 200 local penny checks; the conservative test guard is **227 forward evaluations**, including eligibility, endpoints and previous-penny verification. Trials are cached only within one solve. Complexity is `O(log(maxPence/200) + 200)` forward evaluations, with similarly bounded local cache space. There are no wall-clock performance assertions.

If `R+C <= 0`, zero salary meets the target: one eligibility/zero forward evaluation, zero binary iterations and zero local scan. Negative targets are retained, not clamped; their overshoot is meaningful.

If no salary satisfies the target within the inclusive cap, return `NO_SOLUTION_WITHIN_BOUNDS`, target, lineage, diagnostics and search metadata, with **no salary or achieved-income fields**. The result does not claim impossibility above the cap.

## Output and lineage

`ELIGIBLE_SOLVED` includes exact gross, exact decimal whole-penny gross text for forward reuse, achieved annual/monthly net, achieved residual and `overshootMonthly = achievedNetMonthly - targetNetMonthly`. Overshoot is always nonnegative; `exactTargetMatch` is true only for exact equality. Display rounding never feeds back into search or target construction.

All derived values are CALCULATED. Compact lineage retains current effective-income classification/source and input (including override notes), current income/cost evidence references, destination cost references and input, both scenarios' release metadata, employment reference releases and record IDs. Baseline observed references never reclassify a user override. Complete source datasets are not copied into the result. Tax jurisdiction, NI category and calculation basis are explicit result fields; tax year/effective date are retained in destination input and reference releases.

Search metadata contains the algorithm/version, unit, operational maximum, smallest/largest salaries actually evaluated, binary iterations, distinct forward evaluations, local scan count and full selected local window. `lowerBoundChecked` is £0; `upperBoundChecked` is the greatest evaluated salary, which need not equal the operational cap. Minimality records global exclusion of earlier blocks/pennies and the actual previous-penny net, or zero-salary exemption.

## Diagnostics

Stable result codes: `SALARY_PRESERVATION_INELIGIBLE`, `SALARY_PRESERVATION_SOLVED`, `SALARY_PRESERVATION_NO_SOLUTION`. Eligibility reasons are also validated diagnostic codes:

- `CURRENT_RESIDUAL_INCOMPLETE`, `CURRENT_INCOME_UNRESOLVED`, `CURRENT_COSTS_INCOMPLETE`
- `DESTINATION_COSTS_INCOMPLETE`, `DESTINATION_SCENARIO_UNRESOLVED`
- `DESTINATION_TAX_JURISDICTION_UNSUPPORTED`, `DESTINATION_NI_UNSUPPORTED`, `DESTINATION_EMPLOYMENT_UNSUPPORTED`
- `DESTINATION_NET_OVERRIDE_CONFLICT`, `SALARY_SEARCH_REFERENCE_UNSUPPORTED`

The new diagnostic metric is `salary_preservation`. Failed employment probes preserve their underlying tax/NI diagnostics. Successful solves retain normal employment limitations/diagnostics and emit one solver success message, never per-iteration diagnostics. No bound-expansion code is needed.

## Worked examples

### A. Standard rUK

Current gross £50,000; exact monthly net £3,293.30; complete costs £2,395; current residual £898.30. Destination complete costs £2,395, explicit rUK/category A/annual scope, and no net override. Target net is £3,293.30. Minimum annual gross is **£50,000.00**, achieved residual £898.30 and overshoot £0. The preceding penny fails.

Increase destination rent by £0.01: minimum gross becomes **£50,000.17**. Exact monthly overshoot is **£0.0002**, deliberately retained despite displaying as £0.00 at two decimals.

### B. Scottish high income

Current Scottish gross £150,000; exact annual net £85,355.05; monthly equivalent £85,355.05 / 12 (approximately £7,112.920833…). Current and destination complete costs are both £2,395, with destination Scottish/category A/annual scope. Target is that exact monthly equivalent. Minimum gross is **£150,000.00**, achieved residual approximately £4,717.920833… and exact overshoot £0. No rounded display value establishes the target.

For a target generated at £100,002 gross, taper discontinuities make the minimum lower: **£100,001.32 rUK** and **£100,001.16 Scotland**. Tests independently scan a £4 neighbourhood and verify the earlier solution against the forward engine.

### C. Partial destination

Remove the destination energy override without an approved model. Household costs become PARTIAL; eligibility returns `DESTINATION_COSTS_INCOMPLETE` and no salary or target. An existing resolved subtotal cannot stand in for the missing bill. Restoring an explicit valid energy amount can make costs complete and permit solving.

### Negative and zero targets

Current net £2,000 and complete costs £2,200 give `R=-£200`. Destination complete costs £1,500 give target net £1,300; search proceeds normally. If current net is zero and both complete costs match, target is zero and minimum gross is zero without searching. Lower destination costs give a negative target and positive overshoot at zero salary.

## Validation and remaining scope

Tests cover strict eligibility, both override rules, missing destination gross, invalid scenarios/selectors/reference dates, unsupported search certificates, all protected no-fallback gaps, Scottish bands and high incomes, exact and subpenny overshoot, negative/zero targets, inclusive/truncated/default caps, finite no-solution, determinism and nonmutation. Every solved fixture reconciles against the forward engine and checks the adjacent penny. Independent exhaustive local oracles cover taper entry, interior, full allowance loss and £125,140; an independent range checks every full-block endpoint across the taper in both jurisdictions. Ordered target ranges verify that minimum salary never decreases as the target increases.

Annual comparison remains an exact annualized model, not payslip/PAYE reconstruction. No pensions, student loans, employer NI, benefits, self-employment, household income aggregation, new expense models, gross-gap feature, UI or recommendations are added. Current and destination completeness applies to the engine's declared eight cost categories, not an assertion that every real-world expense is represented.

Recommended next slice: Milestone 2 closure audit and integrated engine acceptance fixtures, including release-lineage consistency and consumer-facing completeness contracts before UI wiring.

Validation on 15 September 2026: all required commands passed (`lint`, `typecheck`, `test`, `build`, `data:verify`, `git diff --check`). The suite passed 854 tests across 18 files, including 60 new salary-preservation cases. All 32 generated artifacts and the raw workbook match their starting SHA-256 hashes; the workbook remains untracked. Starting branch `rebuild/next-production` matched origin at `f1a4189`. No commit or push was made.
