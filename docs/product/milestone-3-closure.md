# Milestone 3 closure audit — GO

Audit date: 16 September 2026. Recommendation: **GO for formal Milestone 3 closure and a separately reviewed closure commit.** No unresolved closure blocker was found. This is not a claim of Safari/VoiceOver certification, final artwork acceptance or a deployed public-launch audit. Nothing was staged, committed or pushed.

## Repository and scope

Started on `rebuild/next-production` at `10186d67a0eb807032eeef663832098697b1bca3` (`Polish Milestone 3 calculator for production`). `git status --short` showed only the untracked raw workbook. `git fetch origin` succeeded; local HEAD and `origin/rebuild/next-production` matched exactly (0 ahead, 0 behind). The five latest commits were `10186d6`, `510b8e5`, `bf47980`, `b28211f`, `c110a84`.

Read AGENTS.md and installed Next.js testing guidance, all six requested Milestone 3 documents, and calculator/report READMEs. Inspected production routes, canonical state/provider, journey metadata and validation, adapter, orchestration, composer, view model, source controls, CSS, engine loading gates and existing tests. This audit adds tests and documentation only; no application behavior, evidence, financial logic, dependencies or contracts changed.

Completed scope: design handoff, strict product integration, production calculator journey, review/edit/results handoff, targeted usability and accessibility refinements, responsive report presentation and full-width source disclosures.

## Architecture and form contract

The implementation follows:

`form state → buildCalculatorInputsFromForm → two engine scenario inputs → calculateScenario → compareScenarios → rankCostDrivers → eligibility → solver when eligible → composeProductResult → buildResultsViewModel → React`

`orchestrator.ts` is the sole production calculation entry. The composer copies domain deltas and ordering; the view model formats exact amounts and visual bar scales. Searches in routes, calculator and report components found no financial arithmetic, evidence resolution, monetary parsing or competing mappings. Arithmetic matches were date formatting, step indices/cancellation counters and CSS dimensions. React does not import generated evidence or the engine calculators.

One calculator-scoped provider/reducer holds a canonical draft, completion metadata and result. Current/destination objects are distinct; only explicit adult/child counts are shared. Money remains decimal text. Empty optional fields become UNKNOWN, while permitted zero amounts remain explicit. The strict adapter rejects unsupported properties/cities and malformed values. The eight UI/engine city choices are London, Birmingham, Manchester, Leeds, Liverpool, Bristol, Edinburgh and Glasgow.

All displayed fields were traced through `stepFields`, `changeField` and the adapter: cities; shared counts; per-side bedrooms/evidence date/rent period and mode; council source or amount; gross/jurisdiction/year/scope/net override; groceries/essentials/energy/water; transport mode/amount; lifestyle. Employment confirmation deliberately supplies category A and annual-comparison scope after user confirmation. No property-type, childcare, payroll-deduction, household-spending profile or commute-frequency calculation path exists. Explicit fare-product mapping is supported by the adapter but deferred in the journey UI.

The original handoff proposed evaluating structurally valid sides independently. The established Slice 1 implementation waits for both adapters to be READY. This documented input-readiness gate is safe: structural omissions show input errors; optional financial gaps still allow partial results. It is not a hidden financial fallback.

## Journey, progress, validation and review

Routes implement Move setup → Household & homes → Income → Everyday spending → Transport → Lifestyle → Review → Results. Six data-entry steps plus Review account for the seven progress entries. Unsupported slugs return 404.

Existing browser and reducer tests pass for Continue, Back, native history, Review Edit, save-and-return, edits after results and restart. A change invalidates the result and that step's validation marker while preserving unrelated later inputs. Restart clears draft, result, completion and edit metadata. Pending submission is ignored after navigation/restart. Refresh/direct results access offers Start calculator without fixture values.

Fresh state has Step 1 active and an empty completed set. Only successfully submitted valid steps become complete; Back retains completion history. Progress explicitly describes visited/validated steps rather than financial completeness.

Blocking field errors include unsupported city, invalid counts/date, negative or malformed money, and missing jurisdiction/year/scope on an active salary-calculation path. First-invalid focus, the alert summary and field associations remain. Missing optional energy/transport/spending or unsupported source applicability are nonblocking financial gaps. Optional UNKNOWN income remains valid; explicit net override is separate from gross calculation.

Review prioritises entered values, city/household, housing, income and spending decisions. Evidence dates, rent periods, tax year and employment detail remain visible in secondary sections. All seven descriptive edit controls target the corresponding step (household and housing share the household route). No review totals or financial arithmetic are introduced.

## Acceptance results

The locked complete fixture uses one adult, no children, two bedrooms per side, evidence date 2026-09-16, July 2026 published rent, Manchester/Leeds authorities and Band D, explicit rUK 2026/27 supported employment, £50,000/£55,000 gross and no net overrides. Monthly inputs are current/destination groceries 300/325, essentials 180/190, energy 120/145, water 45/48, transport 100/120 and lifestyle 150/175.

| Locked complete measure | Current | Destination | Change |
| --- | --- | --- | --- |
| Monthly costs | £2,314.67 | £2,163.31 | −£151.36/month |
| Monthly take-home | £3,293.30 | £3,538.12 | +£244.82/month |
| Monthly buffer | £978.63 | £1,374.81 | +£396.18/month |
| Coverage | 8/8 | 8/8 | — |

Salary preservation is **£47,477.35/year**. Target monthly buffer is £978.63; required monthly net is £3,141.94; proposed annual salary is £55,000; jurisdiction is rUK. Exact overshoot is 1/60 penny and displays “less than £0.01”, not a false exact zero. Product acceptance and the existing real Manchester–Leeds browser journeys pass unchanged.

| Additional product case | Exact observed outcome |
| --- | --- |
| Same Manchester–Leeds fixture with destination energy and transport UNKNOWN | PARTIAL; current 8/8, destination 6/8; known destination costs £1,898.31 and after-known-costs buffer £1,639.81, both explicitly incomplete. Cost and buffer deltas have no exact numeric value; take-home delta remains +£244.82. Salary INELIGIBLE/unavailable. Energy/transport show Needs input without exact amounts, have actionable gaps and are excluded from ranking. |
| Override-heavy fixture | Current/destination rent £1,000/£1,200, council £200/£210 and actual net £3,100/£3,600 take precedence. Effective amounts say Your amount. Rent/council source references and income baseline references remain; supplied destination gross £55,000 remains in adapted input. Complete comparison with unavailable salary because destination net override conflicts. Re-evaluating the original fixture yields the identical original result; input and evidence are unmutated. |
| Explicit zero | Destination transport and lifestyle £0 are AVAILABLE/Your amount, exact zero, with 8/8 coverage. Clearing lifestyle and choosing UNKNOWN transport produces unavailable categories with no exact amount. Explicit NONE transport remains NOT_APPLICABLE rather than numeric zero. |
| Edinburgh published rent | Changing destination to Edinburgh, entering council £200 and leaving energy UNKNOWN gives 6/8: rent and energy unresolved. Entering rent £1,400 resolves rent only (7/8), retains unavailable source-baseline status and leaves energy unresolved. No fabricated published rent. |
| London council tax | London with council UNKNOWN has no adapted authority and no numeric council amount, an actionable gap and 7/8 coverage. Entering £200 resolves council to Your amount and gives 8/8 while preserving the unavailable source baseline. No borough is guessed. |
| Tax jurisdiction | Explicit Scotland is accepted even with Leeds city; income resolves and the salary result identifies Scotland. Clearing jurisdiction does not infer rUK or Scotland and blocks the active salary form path. The complete fixture verifies rUK. |
| Empty form | INPUT_REQUIRED, no product or view. No fabricated result. |

## Product truth and provenance

COMPLETE, PARTIAL and LIMITED comparison states remain independent of salary eligibility. Known subtotals/partial buffers are qualified; unavailable deltas never subtract partial subtotals. NOT_APPLICABLE remains distinct from missing and zero. Coverage is factual resolved/required/unresolved/N/A counts for each scenario, with its own evidence-applicability date. There is no affordability score, confidence percentage or hidden financial fallback.

Classification mapping remains OBSERVED_DATA → Official data, CALCULATED → Calculated, USER_ENTERED → Your amount, MODELLED_ESTIMATE → Estimate. The latter mapping does not create estimates. Source organisation/title/URL, publication/effective periods, geography and limitations remain intact. Overrides distinguish effective user amounts from baseline context. Category-specific rent, fiscal-year, quarterly, FYE and transport periods are not collapsed into a universal date. Source URL destinations were checked for preservation in code/product data, not externally revalidated for remote availability during this audit.

Cost drivers preserve engine rank/order, signed values and excluded categories. The view does not re-sort. Higher cost/Lower cost labels supplement colour; unchanged costs are separately accessible. The salary title remains “Salary needed to keep the same monthly buffer”; solved facts and unavailable reason/input guidance remain visible without approximations.

Full-width cost disclosure buttons expose aria-expanded/aria-controls and open a labelled region in a four-column row beneath the category. One side opens per category; headings identify Current/Destination and city. Hidden content is unmounted. Keyboard Enter/Space, retained trigger focus, no hidden links, column stability and panel containment pass. Mobile uses the same semantic table content in category cards; source prose spans the available card width, with readable Basis/Sources/Limitations sections.

## Privacy and production isolation

Runtime financial state is in memory only. Searches of `src` found no localStorage, sessionStorage, financial query construction, analytics, financial console logging, cookie writes or submission API in the active flow. Browser closure checks observed no non-GET/HEAD requests, no query string in the result URL, empty local/session storage and no cookies. Standard Next route/chunk requests are not financial payloads.

False positives: JSON.stringify in product issue deduplication serializes diagnostic keys, not form amounts; engine canonicalization serializes pinned evidence for integrity; ingestion code serializes source records or diagnostics, not user finances. Storage references in browser tests inspect absence. External HTML/prototype descriptions and explicit development fixtures are not production defaults.

Production results import only the in-memory provider and report. The separate `/dev/calculator-results` route calls notFound outside development. The fresh production build's `.next/server/app/dev/calculator-results.meta` has status **404**. Production empty-result and refresh/restart behavior pass browser tests. Browser functional tests use the development server; production isolation is verified through source gating and production build metadata, not a deployed HTTP environment.

## Responsive and accessibility QA

| Viewports | Automated closure matrix |
| --- | --- |
| 1440, 1280, 1024, 768, 390, 320px | Start, household, income, spending, transport, lifestyle, review, partial results, complete results and expanded source disclosure: one H1/main, no page horizontal overflow, no visible form controls extending outside the viewport. |

The added browser case uses an existing Manchester–London form scenario, first partial then completed through Review Edit. Its partial destination has 6/8 coverage, £2,515 known costs and £1,264.78 incomplete buffer; take-home delta +£486.48, unavailable cost/buffer deltas and unavailable salary. This supplements, rather than replaces, the locked Manchester–Leeds numeric/browser tests. Existing five-width disclosure tests verify colSpan, header-width stability, keyboard semantics, side switching and no panel overflow; the 1280px existing production layout test also passes.

Captures are temporary `/tmp/ukmr-closure-{calculator,household,income,spending,transport,lifestyle,review,partial,complete,source}-{width}.png`. Agent visual inspection covered desktop and 320px start/forms/review/results/source layouts and selected 1280/1024/768/390px captures. Main hierarchy, mobile cards, source wrapping and salary facts remain usable. Detailed Manchester–Leeds disclosure captures from the prior fix were re-generated by the passing suite. Screenshots contain the local Next development badge; it is not product UI. Screenshots are not committed and may expire from `/tmp`.

Automated checks cover real labels, fieldset legends, required/invalid state, helper/error associations, first-invalid and result-heading focus, keyboard navigation/disclosures, skip links and progress. Source/CSS inspection and screenshot review confirm visible focus, descriptive controls, landmarks and signed/textual change directions. No actual VoiceOver session, Safari run, axe certification or comprehensive WCAG certification is claimed.

### Re-measured principal contrast

Computed using sRGB relative luminance; darkest relevant mint/lightest navy endpoints are used conservatively. Thresholds: normal text 4.5:1, large text 3:1 and meaningful input boundaries 3:1.

| Pair | Hex foreground/background | Ratio |
| --- | --- | --- |
| Body/canvas | #091737 / #fafbf9 | 17.01:1 |
| Body/card | #091737 / #ffffff | 17.66:1 |
| Helper/field | #52657b / #f7faff | 5.72:1 |
| Hero title/mint | #072626 / #d4ebe5 | 12.79:1 |
| Hero helper/mint | #304b54 / #d4ebe5 | 7.44:1 |
| Primary button | #ffffff / #005be3 | 5.82:1 |
| Green cue/white | #006645 / #ffffff | 7.03:1 |
| Red cue/white | #bf2529 / #ffffff | 5.98:1 |
| Notice | #854211 / #fff0dc | 6.73:1 |
| Salary title/navy | #ffffff / #215283 | 8.08:1 |
| Salary helper/navy | #e0ebf7 / #215283 | 6.69:1 |
| Input boundary/white | #8090a5 / #ffffff | 3.26:1 |
| Source prose/panel | #091737 / #f7f9fc | 16.74:1 |

No measured pair falls below its threshold. The previous hero-title value 14.07:1 used a lighter endpoint; final QA now records 12.79:1. Decorative card/progress boundaries are not substituted for input-boundary contrast requirements.

## Validation and protection

| Command | Outcome |
| --- | --- |
| npm run lint | PASS |
| npm run typecheck | PASS, including after restoring generated next-env route-path churn |
| npm test | **935 tests / 23 files PASS**: prior 925 plus 10 product closure cases |
| npm run test:e2e -- --workers=2 | **24 Chromium tests PASS**: prior 23 plus one supplementary responsive/privacy case |
| npm run build | PASS; dev preview production status 404 |
| npm run data:verify | PASS: 32 artifacts, 1191 observed rows, 80 coverage cells |
| git diff --check | PASS; new files also checked for whitespace |

An additional temporary observation test recorded salary exact/display facts for audit, passed, and was removed; it is not part of the committed suite counts. No test failures required product changes.

All 32 generated JSON files and the workbook match the prior `/tmp/ukmr-3b-hashes.json` baseline. Workbook SHA-256 remains `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`; it is untouched/untracked. `git diff 1da26f1 HEAD -- src/engine src/data` is empty: protected engine and data are identical to Milestone 2 closure. This audit adds no financial evidence. Runtime artifact validation requires the pinned full payload and classification/kind; direct artifacts allow only RELEASE_READY and reference artifacts only REFERENCE_ONLY. Neither DEV_ONLY nor BLOCKED_FROM_RELEASE records can enter public calculations through these gates.

## Documentation accuracy and legacy/debt findings

Corrected the calculator README's remaining-form-wiring wording and seven-input-steps count; documented report component ownership. Clarified nonblocking council gaps in architecture, marked the earlier mobile/preview descriptions as historical and linked closure. Marked Slice 3A's horizontal table description as superseded. Corrected final QA contrast and its explanation of the 23-test count. Historical slice test counts and starting states remain historical rather than overwritten. The design handoff remains the original specification; its proposed folder/order/independent-side choices are clarified by the implementation records. The visual audit already has a superseding Slice 3B section, so no further edit was needed there.

No active legacy/prototype calculator, static salary requirement, arbitrary score/completeness percentage or automatic frequency/spending/default amount path was found. Existing root development shell is outside the calculator closure scope. React Hook Form remains installed but unused, and CSS retains some superseded table-details selectors; both are cleanup debt with no competing calculation path. No large legacy removal was attempted.

## Remaining items and decision

| Classification | Item and assessed impact |
| --- | --- |
| BLOCKER | None found against the locked Milestone 3 closure criteria. |
| NONBLOCKING | Safari/VoiceOver and broader physical-device/browser review remain unverified. Native controls, explicit semantics and Chromium checks provide closure evidence, but device-specific accessibility regressions remain possible; retain these as public-launch sign-off work. |
| NONBLOCKING | Approved original font, skyline and pictograms are unavailable. Existing fallback text and layout remain usable with no broken introduced assets. Exact artwork fidelity and owner visual acceptance remain launch-review work. |
| NONBLOCKING | Fare-product selection UI is deferred. Explicit monthly amounts, zero/no-cost and truthful unresolved states provide supported paths; “Choose transport” routes to that step, whose helper discloses the deferral. |
| NONBLOCKING | London borough evidence/selection is deferred. User council amounts resolve the path; unknown remains unavailable rather than a guessed borough. |
| NONBLOCKING | Edinburgh published-rent gap remains real and disclosed; an explicit amount resolves rent. This is protected data truth, not an implementation defect. |
| NONBLOCKING | Mobile review/report pages are long because full context remains present. Some long native select labels shorten in the closed 320px control; full option and review text remain available, and the controls are operable/in bounds. |
| NONBLOCKING | Unused dependency/superseded CSS, wider assistive-technology testing and final owner visual review are separate cleanup/sign-off work. |

**GO.** Financial regressions, truthful partial states, explicit override/zero semantics, privacy, production/dev isolation, supported journey, responsive/keyboard checks and release-data protection all pass. Milestone 3 is safe to close with this audit evidence and safe for a separately reviewed closure commit excluding the raw workbook. No staging, commit or push has been performed.

## Audit file inventory

Created:
- `docs/product/milestone-3-closure.md`
- `tests/product/milestone-3-acceptance.test.ts`
- `e2e/milestone-3-closure.spec.ts`

Modified documentation only:
- `docs/product/milestone-3-architecture.md`
- `docs/product/slice-3a-ux-review.md`
- `docs/product/milestone-3-final-qa.md`
- `src/features/calculator/README.md`
- `src/components/report/README.md`

No application source files, engine/data files, dependencies or lockfiles changed. The raw workbook remains excluded.
