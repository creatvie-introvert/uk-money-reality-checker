# Slice 6: cost-driver ranking

## Scope and starting state

Started from `119f09c4f050423514edd66a5e4f927dd4c60d68` (Build Milestone 2 scenario comparison) on `rebuild/next-production`. Live origin and the local tracking reference matched, 0 ahead / 0 behind. The v3.1 raw workbook was the only untracked starting file.

`rankCostDrivers(comparison)` is a pure layer over Slice 5 `ScenarioComparisonResult.categoryComparisons`. It never calculates scenarios, resolves evidence, models households, recalculates tax/NI or sums partial household totals. It returns the full eligible ranking; there is no arbitrary limit or UI-specific top-three default.

```ts
import { rankCostDrivers } from "@/engine";
const ranking = rankCostDrivers(comparison);
// Check ranking.completeness and ranking.scope before describing the ranking.
```

## Eligibility and coverage universe

The fixed coverage universe is the eight existing canonical household categories:

rent, council_tax, energy, water, groceries, essentials, lifestyle, transport.

Exactly one COMPLETE monetary comparison with two RESOLVED category amounts is required for eligibility. User-entered amounts are valid. No take-home, residual, tax, NI or legacy household_spending metric enters the list.

The supplied typed comparison is the trust boundary. Narrow integrity checks reject malformed money, mismatched direction/formula, mismatched side/category amounts or a delta inconsistent with destination minus current. These checks do not replace the original signed delta or re-run a calculator. Missing/duplicate category comparisons are explicitly excluded. An unsupported delta convention throws as a programming/configuration error.

UNRESOLVED, non-complete and structural NOT_APPLICABLE comparisons never acquire a zero amount. N/A remains an explicit exclusion in this slice, including when both sides declare no transport cost. For conservative coverage reporting, all eight canonical categories count in `totalRelevantCategories`; thus seven monetary comparisons plus one N/A exclusion is PARTIAL, even if the original complete household totals were comparable. This does not change Slice 5's N/A policy or its result completeness.

## Exact ranking and views

The existing signed convention is preserved: **delta = destination − current**.

- Positive: INCREASE, destination monthly cost is higher.
- Negative: DECREASE, destination monthly cost is lower (a cost saving).
- Exact zero: NO_CHANGE.

Primary order is absolute monthly impact descending. `absoluteMoney` is a narrow addition to the existing BigInt rational-pence module. It preserves fractions; sorting uses `compareMoney`, not conversion to JavaScript Number. No display rounding is applied. £10.005 sorts above £10.004 exactly.

Equal absolute impacts use canonical category order, regardless of input array order or delta sign. For example rent +£100 precedes energy −£100. Every eligible category receives a consecutive global rank starting at one.

The result returns:

- `rankedByAbsoluteImpact`: every eligible category, zero impacts after nonzero impacts.
- `increases`: positive drivers in descending impact order.
- `decreases`: negative drivers by saving magnitude, so −£200 precedes −£25.
- `unchanged`: exact zero comparisons in canonical order.

The views filter the same ranked entries; they preserve each entry's **global rank**, rather than recalculating a rank within the filtered list. Zero entries have `meaningfulChange: false` and are never described as meaningful cost drivers. All-zero input can still mean COMPLETE coverage, with eight unchanged entries and zero meaningful drivers.

## Driver and exclusion contracts

Each `CostDriver` includes category, rank, current/destination monthly amounts, signed delta, absolute magnitude, direction, meaningful-change flag and CALCULATED classification. Current/destination classifications and resolution sources are explicit. Its original complete `comparison` retains the separate side results, source evidence, baseline evidence, source periods, formulas, diagnostics and limitations.

No combined provenance is invented. An observed rent amount versus an override is legitimate, as is an annual-derived council charge versus a user monthly amount. Deltas and magnitudes remain CALCULATED regardless of the side classifications.

`excludedCategories` retains, in canonical order:

- Category and original comparison state.
- Stable reason: COMPARISON_NOT_COMPLETE, COMPARISON_MISSING_OR_AMBIGUOUS or INVALID_COMPLETE_COMPARISON.
- Current and destination states.
- Original comparison references, including side-specific diagnostics and limitations.
- Ranking-exclusion diagnostic and limitations.

No excluded category becomes a zero-impact driver. No exclusion is hidden by truncating a top-driver list.

## Ranking completeness

| Completeness | Rule | scope |
| --- | --- | --- |
| COMPLETE | All eight categories have eligible monetary deltas | ALL_HOUSEHOLD_CATEGORIES |
| PARTIAL | At least one eligible category and at least one exclusion | COMPARABLE_CATEGORIES_ONLY |
| UNRESOLVED | No eligible deltas | NO_COMPARABLE_CATEGORIES |

PARTIAL means **biggest cost changes among the categories we can compare**. Excluded categories may contain larger changes, so this must not be presented as an overall household ranking.

Coverage fields are `totalRelevantCategories`, `rankedCategoryCount`, `excludedCategoryCount`, `unchangedCategoryCount` and `meaningfulDriverCount`. Ranked plus excluded equals eight; unchanged is a subset of ranked, not an exclusion. There is no coverage/confidence/affordability score.

Ranking completeness depends only on category eligibility. For example all costs can be comparable while income remains unresolved: ranking COMPLETE, original comparison PARTIAL. Conversely an original comparison can be COMPLETE while ranking is PARTIAL because an N/A category has no monetary delta. `comparisonCompleteness` preserves the original status explicitly; ranking does not mutate or upgrade the underlying comparison.

## Examples

### A. COMPLETE ranking

All eight category comparisons resolve:

| Global rank | Category | Signed monthly delta | Absolute impact |
| --- | --- | ---: | ---: |
| 1 | Rent | +£300 | £300 |
| 2 | Transport | −£120 | £120 |
| 3 | Council tax | +£50 | £50 |
| 4 | Energy | £0 | £0 |
| 5 | Water | £0 | £0 |
| 6 | Groceries | £0 | £0 |
| 7 | Essentials | £0 | £0 |
| 8 | Lifestyle | £0 | £0 |

Coverage COMPLETE: eight ranked, zero excluded, five unchanged, three meaningful changes. Increases are rent/council tax; decreases contain transport. The brief's four-category example ranks rent, transport, council tax, water when only those four are comparable; its coverage is PARTIAL because the other four are excluded.

### B. PARTIAL with energy excluded

Current energy resolves; destination energy remains model-required. The seven other comparisons are eligible. Energy is explicitly excluded with current RESOLVED, destination UNRESOLVED and its original ENERGY_MODEL_REQUIRED diagnostic accessible through the comparison reference. The result has seven ranked categories, one exclusion and COMPARABLE_CATEGORIES_ONLY scope. No energy zero is created.

### C. Override-based driver

Current energy override £120; destination energy override £180. Signed delta and absolute impact are £60, direction INCREASE. Both sides remain USER_ENTERED / USER_OVERRIDE, while the driver is CALCULATED. This is an arithmetic cost change, not evidence that a model predicts either bill.

## Diagnostics, metadata and limitations

Added stable codes: COST_DRIVER_RANKING_PARTIAL, COST_DRIVER_RANKING_UNRESOLVED and COST_DRIVER_CATEGORY_EXCLUDED. Diagnostics identify ranking metric, category and both side states as applicable. Original category diagnostics remain in the retained comparisons; exclusions preserve their direct diagnostics and limitations too.

Current/destination release metadata is passed through unchanged. Source-period differences remain on the original side results. There is no universal ranking data date or fabricated source.

The layer ranks arithmetic monthly changes. It makes no causal affordability claim, recommendation, household-cost-total claim or income-driver claim. No salary-preservation solver, new evidence model, partial-total delta, UI or chart is implemented. Recommended next slice: separately design the salary-preservation solver's eligibility and completeness rules before implementing its inverse search, including how net-income overrides and incomplete destination costs affect solvability.

## Validation result

All required commands passed: `npm run lint`, `npm run typecheck`, `npm test` (794 tests across 17 files), `npm run build`, `npm run data:verify` and `git diff --check`. The targeted ranking suite passed all 22 new tests. Existing comparison, scenario, household, income and foundation tests were unchanged and passed in the full suite.

Tests cover signed absolute ranking, increase/saving views, canonical ties under reversed input order, zero changes, explicit exclusions, N/A coverage, independent ranking/comparison completeness, override/mixed source lineage, exact fractional pennies (including values beyond JavaScript's safe integer range), missing/duplicate/inconsistent comparisons and immutability.

All 32 M1 generated artifacts matched their starting SHA-256 hashes; data verification reconciled 1,191 observed rows and 80 coverage cells. The raw workbook remained unchanged and untracked, SHA-256 `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`. The build-generated `next-env.d.ts` change was restored and typecheck passed again. No existing calculator/comparison arithmetic, generated/controlled evidence, input schemas, dependencies or UI changed. No commit was made.
