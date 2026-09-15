# Slice 5: completeness-aware scenario comparison

## Scope and starting state

Started from `9914bd3315b4fdf0a892b6bb6353e2a21cc26a51` (Build Milestone 2 scenario orchestration) on `rebuild/next-production`. Live origin and the local tracking reference matched, 0 ahead / 0 behind. The raw workbook was the only untracked starting file.

`compareScenarios(current, destination)` consumes two independently produced `ScenarioCalculationResult` values. It has no loader dependency and does not call scenario, tax, NI or household calculators. Existing inputs, arithmetic, evidence and models remain unchanged. There is no convenience orchestration wrapper in this slice.

```ts
import { calculateScenario, compareScenarios, createEvidenceLoader } from "@/engine";

const evidence = createEvidenceLoader();
const current = calculateScenario(evidence, currentInput);
const destination = calculateScenario(evidence, destinationInput);
const comparison = compareScenarios(current, destination);
```

Roles are named in both the API and result. The previous unimplemented `ComparisonEngine` placeholder is replaced by this two-result signature; `ComparisonResult` aliases `ScenarioComparisonResult`. No caller in the repository used the old placeholder.

The API expects typed engine results, including genuine INVALID_INPUT results. It is not a schema validator for arbitrary/deserialized objects. Configuration corruption remains a programming concern. A missing or ambiguous category result is never replaced with a different category.

## Delta convention and classification

Every complete delta is **destination − current**, using existing rational-pence subtraction with no floating-point conversion or display rounding. `delta + currentAmount = destinationAmount` exactly, including fractional pennies and negative residuals.

A complete metric exposes `currentAmount`, `destinationAmount`, `delta`, `direction`, `classification: CALCULATED` and `formula: "destination - current"`. Direction is INCREASE, DECREASE or NO_CHANGE based on exact comparison. It is metric-neutral; it does not label an increase good or bad.

Each metric retains named current/destination side results. Their classifications, override states, baselines, source records and limitations remain inspectable. The comparison delta is calculated even when its inputs are observed or user-entered. No combined source provenance is invented.

## Core metrics

| Metric | COMPLETE rule | Compared amounts |
| --- | --- | --- |
| Take-home | Both effective incomes RESOLVED | Effective monthly net amounts |
| Household costs | Both household results COMPLETE | Complete monthly totals |
| Residual | Both residuals COMPLETE | Complete monthly residuals |

Take-home can be complete even when scenario costs are partial or unresolved. A calculated income can be compared with an override; `takeHomeComparison.overrideStatus` identifies USER_OVERRIDE, NONE or UNRESOLVED for each side. Original effective-income results preserve classification/source and any employment baseline.

Complete household costs can be compared even if income is unresolved. Metric gates inspect their own underlying states, rather than simply trusting the scenario's overall completeness.

For household costs and residuals:

- Both sides have complete/partial values, with at least one partial: metric PARTIAL, **no delta**.
- Either side has no usable amount, or its scenario is INVALID_INPUT: metric UNRESOLVED, **no delta**.
- Individual partial values remain nested in their original side results for context. No comparison-level currentAmount/destinationAmount aliases or direction are emitted for an incomplete metric.

The conservative policy deliberately withholds partial-subtotal deltas even when resolved category sets match. There is no intersection subtotal or like-for-like partial-total feature. Two partial residuals are never subtracted. This prevents an arbitrary difference in known costs from being presented as a complete household-cost or residual change.

## Category comparisons and N/A

All eight categories appear in canonical order: rent, council_tax, energy, water, groceries, essentials, lifestyle and transport. They are not ranked or sorted by delta. Income tax, NI and the legacy household_spending reference family are excluded.

- Both categories RESOLVED: COMPLETE numeric delta; observed-versus-override and derived-versus-user comparisons are valid with lineage retained.
- Either category UNRESOLVED/unavailable: UNRESOLVED with no delta.
- Both NOT_APPLICABLE: neutral NOT_APPLICABLE state, no monetary amount or direction.
- One NOT_APPLICABLE and one RESOLVED: UNRESOLVED category comparison, no conversion of N/A into zero.

This is intentionally conservative even for the existing explicit no-transport-cost declaration. A caller needing a monetary zero category comparison can supply the supported explicit £0 transport override when that describes their scenario. No automatic rewrite is performed.

The existing household engine may independently produce COMPLETE totals with explicit N/A transport excluded. Those totals remain comparable. Therefore the three core comparisons can be COMPLETE while a mixed N/A/resolved transport category comparison is UNRESOLVED. That is not an unknown total: it is a limitation of this slice's category transition policy. `unresolvedDifferences.categories` makes it visible.

## Top-level completeness

Only the three core metrics determine comparison completeness:

- COMPLETE: all three core metrics complete.
- PARTIAL: at least one core metric complete, at least one not complete.
- UNRESOLVED: no core metric complete.

Category deltas alone never upgrade this status. A comparison can be UNRESOLVED while retaining useful individual category deltas. There is no confidence, affordability or recommendation score, and completeness does not depend on every provenance field being perfect.

`unresolvedDifferences` carries the incomplete core metric names, unresolved category comparison names and each evaluated scenario's original unresolved category list. An invalid scenario has no evaluated category list; its INVALID_INPUT state and diagnostics remain authoritative rather than inventing missing category outcomes.

## Diagnostics, lineage and dates

New stable codes: COMPARISON_PARTIAL, COMPARISON_UNRESOLVED, TAKE_HOME_COMPARISON_UNRESOLVED, HOUSEHOLD_COST_COMPARISON_PARTIAL, HOUSEHOLD_COST_COMPARISON_UNRESOLVED, RESIDUAL_COMPARISON_PARTIAL, RESIDUAL_COMPARISON_UNRESOLVED and CATEGORY_COMPARISON_UNRESOLVED.

Comparison diagnostics name metric/category and current/destination states. Each side result retains its specific limitations and underlying diagnostics. Original scenario diagnostics are copied into the comparison diagnostic list with `scenarioRole: current/destination`; the originals are not mutated. A category blocking diagnostic blocks that category comparison, not an independently complete core total.

`current` and `destination` retain the full supplied results, including their evidence lineages. Metric sides reference the corresponding original results. Release metadata is kept separately by role; an invalid scenario has null metadata, never fabricated release information. No universal comparison data date is introduced. Pinned rent, tax, transport and reference periods remain distinct.

Comparison completeness means the declared metrics meet these gates. It does not independently validate household scope equivalence, source refresh suitability, actual user-entered spending or route eligibility. Different source releases remain visible; no version is silently substituted or merged.

## Examples

### A. COMPLETE

| Metric | Current | Destination | Delta |
| --- | ---: | ---: | ---: |
| Monthly take-home | £3,000 | £3,200 | +£200 |
| Complete household costs | £2,000 | £2,400 | +£400 |
| Complete residual | £1,000 | £800 | −£200 |

All three comparisons are COMPLETE. The residual direction is DECREASE: the destination leaves £200 less monthly buffer within the declared scope. This is arithmetic, not a recommendation.

### B. PARTIAL destination

Both incomes resolve. Current household costs are complete; destination energy is unresolved while other amounts resolve. Take-home comparison is COMPLETE. Household-cost and residual comparisons are PARTIAL with no deltas. Their side results retain the destination subtotal and partial residual. Overall comparison is PARTIAL. Category deltas are available only for categories resolved on both sides.

If current instead knows rent/council/water and destination knows rent/council/groceries, those different subtotals are likewise never subtracted. Rent and council category deltas may still resolve independently.

### C. Calculated versus override take-home

Current gross £50,000 under the supported pinned rUK employment scope yields £3,293.30 monthly net. Destination effective net is an explicit £3,400 override. Take-home delta is **+£106.70**, classified CALCULATED. Current remains CALCULATED/NONE; destination remains USER_ENTERED/USER_OVERRIDE. Any destination employment baseline remains intact.

## Remaining work

No partial intersection subtotal, partial residual delta, monetary N/A transition, cost-driver ranking, salary-preservation solver, affordability score, recommendations, UI or new models are implemented. Recommended next slice: explicitly scoped cost-driver ranking using only complete category deltas, preserving excluded categories and overall partiality. Salary preservation needs a separate contract and solver.

## Validation result

All required checks passed: `npm run lint`, `npm run typecheck`, `npm test` (772 tests across 16 files), `npm run build`, `npm run data:verify` and `git diff --check`. The targeted comparison suite passed all 43 new tests. Existing scenario, household, income and foundation tests were unchanged and passed in the full suite.

All 32 M1 artifacts matched their starting SHA-256 hashes; data verification reconciled 1,191 observed rows and 80 coverage cells. The raw workbook stayed unchanged and untracked, SHA-256 `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`. The build-generated `next-env.d.ts` change was restored and typecheck passed again. No generated/controlled evidence, prior calculator arithmetic, input schemas, dependencies or UI changed. No commit was made.
