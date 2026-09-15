# Milestone 2 closure audit

## A. Executive summary

**GO for the next milestone within the pinned, explicitly supported engine scope.** The acceptance fixtures exercise the complete public pipeline from generated evidence through scenarios, comparison, ranking and salary preservation. Missing evidence remains visible and does not establish a complete budget. This decision supports UI integration planning; it does not certify current source freshness, new household models, payroll accuracy or public redistribution rights.

Audit date: 15 September 2026. Starting branch `rebuild/next-production`, commit `b93cda9da388c43ff103d83d79dce956f52f797b` (Build Milestone 2 salary preservation solver), matched live origin. Tracked worktree was clean; only `src/data/raw/ukmr_data_pack_and_source_register_v3_1.xlsx` was untracked. Starting SHA-256 hashes were captured for all 32 generated artifacts and that workbook. No commit or push was made.

Reviewed the [Milestone 1 closure](../data/milestone-1-closure.md), [engine architecture](milestone-2-architecture.md), all engine contracts/calculators, loaders/registry, resolution, money, diagnostics, scenario/comparison/ranking/solver paths, public exports and existing engine suites. The installed Next.js Vitest guide was read before changes. No source ingestion, model, UI, chart, recommendation or affordability classification was added.

**One narrow API defect was fixed:** `unsupportedCategory`, an internal placeholder used by the category registry, leaked through the public barrel. Repository search found no external caller. A new acceptance assertion reproduced the leak; making the helper private fixed it. Registry behavior and calculator arithmetic are unchanged. No numerical or completeness defect was found in the supported production path.

## B. Completed architecture and public API

```text
ten pinned observed datasets → typed immutable loader
→ scenario validation → exact evidence resolution / explicit overrides
→ employment income + eight household cost categories → scenario residual
→ current/destination metric and category comparisons → cost-driver ranking
→ eligibility → minimum salary using the existing forward income engine
```

Public capabilities are available through `@/engine`: scenario schema validation, standalone tax/NI/net income, household category/aggregation calculation, scenario calculation, comparison, ranking and salary-preservation eligibility/solve. Existing lower-level evidence resolvers, pinned-payload validator, schema/money utilities and category registry remain supported. No new runtime API was added.

Salary-search helpers and the raw active-dataset registry are not barrel exports. The formerly leaked placeholder is now private. Legacy `CalculationResult`/`LocationResult`, full-input normalizer and broad category contracts remain for compatibility; the implemented scenario/comparison contracts are the intended integration path. Do not treat a legacy interface as an implemented full-result orchestrator.

## C. Supported calculator scope

- One employee, one employment, standard Personal Allowance; explicit rUK/Scotland income jurisdiction; pinned 2026/27 income tax and Class 1 category-A annual NI comparison.
- Exact city/bedroom/source-month rent where observed, retaining London region and Greater Glasgow source geography.
- Explicit supported authority and actual council-tax band; published annual charge divided by 12, before household adjustments.
- Scottish unmetered Water: declared band, connected service components, regime and effective period. Combined charge is an alternative total, used once.
- Explicit supported adult period transport ticket; annual /12 or weekly ×52/12 equivalents, with fare evidence date and product conditions retained.
- Valid user-entered monthly amounts, including net-income overrides. Cost overrides can complete the declared eight-category budget.
- Complete/partial/unresolved scenarios, guarded comparisons, explicit ranking exclusions and salary preservation with proven search bounds.

## D. Unsupported scope

No payroll/PAYE reconstruction, pensions/ANI adjustments, student loans, employer NI, benefits, self-employment or multiple-income aggregation. No new household consumption/spending model, city energy-region inference, metered water bill, arbitrary-address provider assignment, council discounts/exemptions, default/optimized transport choice or assumed trip frequency. No UI or product recommendation layer.

Completeness covers the declared eight household categories. It does not assert that the model includes every real-world expense. Household headcounts never multiply reference spending or ticket prices.

## E. Integrated acceptance fixtures

Readable inputs and independent expected amounts are in [cases.ts](../../tests/engine/fixtures/milestone-2/cases.ts). The dedicated [acceptance suite](../../tests/engine/milestone-2-acceptance.test.ts) imports only public engine APIs and fixture inputs; it never reads the raw workbook. Annual equivalents in the table preserve fractional monthly pennies. All amounts are GBP; deltas are destination minus current.

| Fixture | Scenario states; comparison/ranking | Expected arithmetic | Salary outcome |
| --- | --- | --- | --- |
| A: complete rUK | Both COMPLETE; both COMPLETE | Manchester → Leeds: net annual 39,519.60 → 45,357.40; costs annual 25,736.04 → 23,103.73; residual change annual +8,470.11 | Minimum gross 46,344.02; rent is largest cost driver |
| B: complete Scotland | Both COMPLETE; both COMPLETE | Glasgow Band D → E: net annual 43,607.35 → 59,957.35; costs annual 23,454.32 → 24,734.77; residual change annual +15,069.55 | Minimum gross 62,286.52; council tax is largest driver |
| C: partial evidence | Current COMPLETE, destination PARTIAL; both PARTIAL | Edinburgh rent, energy and transport unresolved; take-home delta zero; no cost/residual delta | INELIGIBLE; all three categories explicitly excluded |
| D: override-heavy | Both COMPLETE; both COMPLETE | Effective annual net 33,600 → 34,800; costs 25,736.04 → 28,740; residual change -1,803.96 | INELIGIBLE because destination has net override |
| E: eligible without destination gross | Current COMPLETE, destination UNRESOLVED income; comparison PARTIAL, ranking COMPLETE | Complete costs on both sides 28,740/year; no take-home/residual comparison delta | Minimum gross 50,000; missing existing gross does not prevent solving |
| F: ineligible missing bill | Current COMPLETE, destination PARTIAL; both PARTIAL | Destination energy absent; no complete total/residual or their deltas | INELIGIBLE despite seven resolved destination costs |
| G: negative residual | Both COMPLETE; both COMPLETE | Current net 2,000/month, costs 2,200, residual -200; destination costs 1,500; required monthly net 1,300 | Minimum gross 16,778.34; negative buffer is preserved |
| H: no change | Both COMPLETE; both COMPLETE | All three core deltas and eight category deltas exactly zero | Gross 50,000; zero overshoot, deterministic unchanged list |

Every fixture states expected unresolved categories, diagnostics, ranking behavior and solver state. Every solved fixture reconciles against the public forward income calculator and checks exact target/overshoot and bounds. Existing solver tests provide dense local minimum oracles and full taper-endpoint coverage; those low-level cases were not duplicated.

Eight additional cross-layer tests cover Scottish charge bases/geography, override provenance and notes, deterministic unchanged categories, weekly-ticket fractions through salary targets, N/A versus explicit zero, invalid input flowing safely through all downstream layers, release/period retention and public API boundaries. Total: **16 new acceptance tests**.

Scottish source checks use actual published council annual charges **1,706.00 (D)** and **2,241.49 (E)**, and combined Water annual charges **652.32 (D)** and **797.28 (E)**. They retain exactly one Water combined record. Greater Glasgow rent remains geography **S33000009**, distinct from Glasgow City council tax.

## F. Money, periods and rounding audit — PASS

All monetary arithmetic uses reduced rational BigInt pence serialized as integer strings. Reviewed tax, NI, monthly conversion, household aggregation, residual, comparison, absolute-impact ranking, solver target and overshoot. Searches found no `parseFloat`, `Number(...)`, `Math.round` or `Math.abs` monetary paths. Source numeric fields become decimal text before money construction; source rates are applied through exact rational helpers.

JavaScript numbers are used for source schema fields, counts, dates, ordering metadata and bounded iterations, not accumulated money. Daily helper arithmetic counts explicitly supplied calendar days; it is not a 30-day monthly billing assumption. Annual /12 and weekly ×52/12 remain exact; no ×4 shortcut is present.

The statutory whole-pound ceiling of remaining Personal Allowance is deliberate and documented in [income tax and NI](income-tax-ni.md). Per-band liabilities and annual/monthly equivalents are otherwise not rounded to payroll pennies. `formatGbp` is a display-only boundary, half away from zero. No calculator feeds display rounding back into money.

The weekly acceptance case preserves **24.70 ×52 = 1,284.40 annually**. Replacing monthly transport 70 changes costs by **444.40/12** and residual by **-444.40/12**; the exact fraction reaches ranking and the salary target unchanged.

## G. Contracts and completeness audit — PASS

| State | Meaning and monetary boundary |
| --- | --- |
| RESOLVED category/income | Has an effective amount, classification and retained basis |
| UNRESOLVED category/income | Has no effective amount; baseline/context may remain |
| NOT_APPLICABLE transport | Explicit declaration; no monetary amount, distinct from user-entered zero |
| COMPLETE household | All required categories resolve or have supported explicit N/A; complete total exists |
| PARTIAL household | Resolved subtotal exists; missing categories visible; no complete total |
| UNRESOLVED household | No resolved amount; no invented subtotal |
| COMPLETE scenario | Resolved income, complete costs and complete residual |
| PARTIAL scenario | Resolved income and partial costs; only residual after resolved costs |
| UNRESOLVED scenario | No usable residual; independently resolved income or costs may still be retained |
| INELIGIBLE solver | Reasons/diagnostics, no target or salary estimate |
| NO_SOLUTION_WITHIN_BOUNDS | Valid target and bounds, no fabricated salary or achieved income |

An UNRESOLVED scenario does **not** mean all its individual values are unavailable. Fixture E deliberately protects this distinction: costs and category ranking remain complete while destination income/residual are unavailable, and salary solving can still be eligible. Consumers must inspect the relevant discriminant rather than hide or invent values based solely on the root status.

Precise household/scenario/comparison/solver unions prevent the important impossible combinations. Legacy generic category contracts are broader; the production household boundary narrows classifications and rejects unsupported amount/state combinations at runtime.

## H. No-fallback and classification audit — PASS

Loader inputs must match all fields of the pinned generated payloads. Only observed production records enter the runtime loader; calculated reference derivatives, controlled source extracts and raw workbooks are outside the transitive runtime graph. All source records are deeply immutable.

No fallback to zero, national averages, another authority/provider/city, neighbouring rent geography, inferred energy region, cheapest fare or headcount model was found. Zero used as a sum/search identity is not a missing-data replacement. Missing selectors/period matches emit structured gaps. Explicit transport N/A is excluded from aggregation; it is not converted into a category monetary zero.

Monthly observed rent stays OBSERVED_DATA. Council/Water/ticket conversions and income are CALCULATED with observed ancestry; effective overrides remain USER_ENTERED. Comparisons, ranking and salary outputs are CALCULATED and retain side/source lineage. MODELLED_ESTIMATE cannot enter production household arithmetic; a DEV_ONLY transport frequency selection remains unresolved unless a valid explicit override supplies the effective amount.

## I. Override audit — PASS

The effective precedence is valid user override → supported exact evidence/calculation → structured unresolved. Baselines, source references and original gaps remain retrievable after an override. Baseline blocking diagnostics may become warnings on the effective overridden result while the baseline retains its original state. Housing override notes remain in `inputUsed`; income override notes remain in the effective-income input.

Explicit zero is accepted for net income, essentials, lifestyle and transport. Rent, council tax, energy, Water and groceries require positive overrides under their current category contracts. Missing values never imply zero.

Destination net overrides conflict explicitly with salary preservation; current overrides are valid when the residual is complete. The acceptance fixtures test both rules across downstream comparison/ranking/solver outputs.

## J. Comparison and ranking audit — PASS

Take-home deltas require two resolved effective incomes; household-cost and residual deltas require two COMPLETE respective amounts. Category deltas require two resolved category amounts. Partial subtotals are never subtracted into a full cost change, even when their category sets match.

Ranking includes only complete category deltas, orders exact absolute impacts and uses canonical category order for ties. Zero deltas remain in the unchanged list. Excluded categories retain reasons and both sides. No income/tax/NI driver enters the eight household categories.

Comparison, ranking and solver eligibility have intentionally independent completeness. Explicit N/A versus resolved zero can yield complete equal household totals but an excluded transport category and PARTIAL ranking. No whole-household ranking claim is made in that case.

## K. Salary solver and performance audit — PASS

Strict eligibility, destination override conflict, explicit jurisdiction/NI scope and forward-engine reuse remain intact. No inverse tax implementation is present. The loaded-reference certificate proves monotone full £2 block maxima; the first qualifying block is scanned in pennies. The truncated final block is handled separately so a cap at a taper drop cannot hide an earlier solution. Global minimum and adjacent-penny checks remain covered by the prior solver suite.

Operational domain is nonnegative annual gross pennies through the inclusive **10 million GBP** hard/default cap; callers can lower it. No-solution output makes no claim above the cap. Negative current residual and zero/negative target behavior remain supported. Exact overshoot is retained.

Scenario calculation has one effective income composition and eight fixed household categories, with finite scans of pinned datasets. Comparison traverses three core metrics/eight categories; ranking sorts at most eight entries. The solver has at most 23 binary decisions, 200 local penny checks and a conservative 227 forward evaluations. Acceptance assertions retain those bounds; no timing benchmark was added. Loader validation should occur once per caller-managed evidence lifetime, not on each input keystroke.

## L. Data releases and unresolved evidence/model gaps — PASS within pinned scope

The ten runtime release pins still identify the original 1,191 observed records. No alternate paths, implicit newest-release selection or category release switch was introduced. Scenario/comparison/ranking/solver outputs preserve release metadata, record IDs and category-specific periods, never a universal data date.

All 32 Milestone 1 generated artifacts are preserved, including derived/reference/report artifacts not consumed at runtime. The audit verifies pinned bytes and contracts; it does not revisit today's source webpages or recertify statutory rates.

Known gaps remain explicit: Edinburgh rent; London borough council tax; household energy model and region mapping; Birmingham water zone/drainage and English household bills; groceries and Essentials/Lifestyle methodology; transport defaults, route/usage applicability and source-date refresh. Scottish Water is conditional on declared property/service selections. Transport observations are dated **14 September 2026**; they do not establish later-day fares. Provider/operator/Ofgem reuse and export qualifications from Milestone 1 remain unresolved.

## M. Diagnostics, exceptions and nonblocking debt

Stable diagnostic codes, severities and schema validation pass. Comparison adds current/destination roles; category and ranking diagnostics retain category and relevant side states. Salary reasons are machine-readable rather than prose-only. Override downgrading reflects an effective valid amount, not disappearance of baseline evidence gaps.

Business states at scenario/income/comparison/solver boundaries return structured results. Invalid standalone low-level resolver/category arguments and invalid solver options may throw by their documented typed/configuration contracts. Corrupt artifacts, malformed synthetic aggregate results and impossible search invariants may also throw. No expected missing-evidence state on the supported scenario pipeline was found to throw.

Nonblocking debt for the integration milestone:

1. Some historical architecture/README and generic contracts describe earlier slices. The closure update and concrete scenario APIs take precedence; avoid wiring a UI to an unimplemented legacy orchestration interface.
2. Diagnostic `kind`, `metric`, `canResolveWithUserInput` and role enrichment vary across historical layers. Salary reason messages are mechanically derived and could be clearer; repeated diagnostics need a presentation policy. Codes/states remain reliable. Do not infer eligibility from severity alone.
3. Full scenario results can repeat baseline source rows and limitations; compact scenario/solver references help, but consumer payload composition should avoid unnecessary duplication. No payload reduction was attempted here.
4. Typed downstream APIs consume genuine calculator results; they are not general parsers for arbitrary deserialized/tampered results. A future persistence/API boundary needs explicit validation and version/release compatibility policy. Current loader pins one release set; comparisons retain metadata without enforcing compatibility across hypothetical future versions.
5. Broad barrel exports include established low-level schema/money/validation utilities. No blanket API redesign was made; only the proven internal placeholder leak was removed.
6. Housing effective override metadata does not repeat the note, but the original note remains retrievable through `inputUsed`. A future unified presentation contract can normalize access without changing classification.

These do not block UI development against the current pinned public scenario pipeline.

## N. Blocking defects

**None remaining in the audited supported scope.** The API leak is fixed and regression-tested. No arithmetic, missing-evidence fallback, classification-loss or completeness defect remains demonstrated by this audit. Existing model/source gaps are not reclassified as engine defects or silently filled.

## O. Validation

Use the existing scripts; no redundant `engine:verify` script or new dependency was added. Required checks are lint, typecheck, complete test suite, production build, data verification and diff whitespace validation. Focused acceptance command:

```sh
npm test -- tests/engine/milestone-2-acceptance.test.ts
```

Final results on 15 September 2026:

| Check | Result |
| --- | --- |
| Focused acceptance suite | PASS: 16 tests |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS, including after restoring build-generated `next-env.d.ts` |
| `npm test` | PASS: 870 tests across 19 files, all prior suites included |
| `npm run build` | PASS |
| `npm run data:verify` | PASS: 32 artifacts, 1,191 observed rows, 80 coverage cells |
| `git diff --check` and new-file whitespace | PASS |
| Generated artifact preservation | All 32 starting SHA-256 hashes unchanged |
| Raw workbook preservation | Starting SHA-256 unchanged; still untracked |
| Diagnostic enum identity | No duplicate code definitions |

The raw workbook SHA-256 remains `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`. The build-generated route-type path change was restored, leaving only the intended closure changes. No dependency, package script, application UI or generated evidence was changed.

## P. Recommendation

**GO for Milestone 3 product-result composition and calculator UI integration.** Start with a presentation contract that preserves metric-specific completeness, explicit unresolved categories, effective versus baseline lineage, ranking exclusions and solver eligibility/overshoot. Then wire the existing calculator flow to those public results. Keep missing inputs explicit and formatting at the final display boundary. Do not introduce new evidence models or infer missing expenses during that work.

This audit does not start that milestone. The closure slice is safe to commit: the listed validations passed. Exclude the unchanged untracked raw workbook. No commit was made.
