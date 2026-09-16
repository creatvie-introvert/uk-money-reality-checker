# Milestone 3 Slice 3A: targeted UX review

## Starting state and boundary

Branch `rebuild/next-production`, HEAD `bf47980012e1d1107becd8119a71e146e5037058` (`Build Milestone 3 calculator journey`), matched local and live origin at inspection. Slice 3 presentation work was already uncommitted in seven tracked files, plus its new `visual-usability-audit.md`. This pass preserves and extends that work. The raw workbook was the only untracked data file. No staging or commit is authorized for this pass.

AGENTS.md, installed Next.js guidance (read during Slice 3), the locked design handoff, architecture, journey, component/CSS implementation, copy mappings and tests informed the changes. The approved visual direction remains intact. No new assets, dependencies, financial models or persistence were introduced.

Before presentation edits, a new product regression test reproduced all supplied Manchester–Leeds values successfully. Changes are limited to text, presentation metadata, markup, CSS, tests and documentation. Engine, adapter, evidence, validation conditions, reducer, provider, solver eligibility, ranking and completeness semantics are unchanged.

## Progress findings

No progress bug was found. `initialJourney()` initializes `completed` to an empty array. Only a successful step submission dispatches COMPLETE; Back does not add completion, and an invalid submission does not complete a step. Returning to an earlier step can legitimately show later steps as previously visited and validated. Restart clears progress.

New browser coverage checks all six future steps individually on initial load, successful Move setup completion, failed household validation, preserved status on Back, and clean restart. Progress logic was not altered.

## Consumer language

- **Household:** “Use evidence available on” replaces “Evidence applicability date”. The helper explains applicability and explicitly says this is not the moving date. “Published rent period” replaces “Rent source period”; the helper explains source context under entered rent. Rent-basis guidance distinguishes published evidence from the user's own rent and preserves Edinburgh's limitation.
- **Dates remain separate:** current and destination each own `effectiveOn` and `rentSourceMonth` in the product contract. They can intentionally differ. There is no canonical shared comparison-date field, so neither control is collapsed or auto-filled. A deliberate shared-date/copy interaction could be evaluated in a later UX slice, with explicit treatment of users who need different dates. The single pinned rent-period option still requires selection; automatic release selection is a future contract/UX decision, not a change here.
- **Employment:** “This calculation matches my employment” uses the requested plain-language helper. Native “Employment calculation details” disclosures retain one employee, one employment, Class 1 category A NI and annual-comparison scope. The checkbox maps to exactly the same internal eligibility values. Jurisdiction remains explicit and is not inferred from the city.
- **Take-home:** “Use my actual monthly take-home instead (optional)” explains the actual-net choice and retained gross salary. The destination helper alone includes the salary-preservation warning. Clearing an entry still removes the override through the existing reducer/adapter path.
- **Spending/lifestyle:** shared helper is “Leave blank if unknown. We won’t estimate this automatically.” The requested household-spending note is reused once on each relevant page. Blank, zero and unknown states retain their distinct meaning.
- **Transport:** monthly amounts, explicit zero, no-cost declaration, unknown state and deferred fare selection remain unchanged. Existing Slice 3 spacing and mobile control treatment were retained.

## Review hierarchy

Primary decisions remain prominent in each scenario card: city, counts, bedrooms, rent basis/amount, council authority/band/amount, salary, jurisdiction, actual take-home use and all spending/transport/lifestyle values. Desktop labels and values align side by side; mobile rows stack.

Evidence dates, rent periods, tax year, full employment-scope wording and retained override baselines move to an always-visible “Evidence & calculation details” area. It uses readable 12px supporting text, lighter weight and a separating rule. No row is removed, placed behind a disclosure, or calculated into a new summary total. The original entered values remain visible.

Edit controls now read Edit move, Edit household, Edit housing & council tax, Edit income, Edit everyday spending, Edit transport and Edit lifestyle. Their route/state behavior is unchanged.

## Results refinement

The dynamic complete-result hero now says “Your monthly household costs could be about £X higher/lower”; the no-change version says “Your monthly household costs are about the same”. Partial/limited wording remains the existing product copy. Exact money still comes from the same engine formatter and metric state.

“Monthly buffer after included costs” replaces “Estimated amount left”. Partial buffers retain their explicit incomplete label. Supporting take-home/buffer changes and the three overview metrics retain signed amounts and Increase/Decrease text.

Ranked drivers add visible “Higher cost”/“Lower cost” text beside signed values. The engine's rank/order, bars, zero-change list, partial qualifier and excluded categories are untouched.

The salary panel retains its exact title, required annual salary, target buffer, required net, overshoot, proposed gross and tax jurisdiction. Existing navy styling and responsive spacing already suit this targeted pass; no values or eligibility rules changed.

Essentials & lifestyle is now a subordinate, always-visible subsection of Cost coverage. Category-count explanations, childcare exclusion and lifestyle inclusion remain. Current/destination coverage is paired on desktop and stacked on mobile; evidence dates remain visible. This removes the disconnected equal-weight panel. Source-period and calculation disclosures remain accessible below. Next-action cards gain consistent borders and hover treatment.

## Browser, responsive and accessibility review

All previous responsive checks remain at 1440, 1280, 1024, 768 and 390px. New Manchester–Leeds flows run at 1440 and 390px, asserting no page overflow between steps and at results. Scope disclosures open/close using Enter. Proper labels, checkbox helper association via aria-describedby, descriptive edit controls, visible focus and textual cost-direction cues are checked. Existing table/source keyboard checks, complete/partial states, edit/restart/refresh and Scottish baseline tests remain.

Temporary screenshots `/tmp/ukmr-3a-{household,income,review,results}-{1440,390}.png` capture the reviewed scenario. Desktop review/results and mobile income were visually inspected, alongside the existing Slice 3 responsive review. No screenshot is committed. This is focused browser/agent review, not a full physical-device or assistive-technology certification.

## Manchester–Leeds regression

Uses the supplied one-adult/no-child household, two bedrooms, 16 September 2026 applicability dates, July 2026 published rent, explicit Manchester/Leeds authorities and Band D, rUK 2026/27 employment, no net overrides, and the supplied entered costs. Fixture values exist only in tests, never production defaults.

| Measure | Current | Destination / change |
| --- | --- | --- |
| Monthly costs | £2,314.67 | £2,163.31 |
| Monthly take-home | £3,293.30 | £3,538.12 |
| Monthly buffer | £978.63 | £1,374.81 |
| Cost change | — | −£151.36/month |
| Take-home change | — | +£244.82/month |
| Buffer change | — | +£396.18/month |
| Preservation salary | — | £47,477.35/year |
| Proposed salary | — | £55,000/year |
| Coverage | 8 of 8 | 8 of 8 |

All figures match before and after edits. The product regression asserts both total costs, incomes, buffers, all deltas, preservation/proposed salary and coverage. Browser tests assert the displayed results through the real production journey.

## Remaining decisions

Approved font/artwork assets and owner visual acceptance remain open from Slice 3. Review remains comprehensive and therefore long on mobile, with secondary information always visible as requested. At Slice 3A the breakdown retained its labelled horizontal scroll region; Slice 3B superseded this with mobile category cards and full-width evidence disclosures. A shared-date interaction or fixed-release simplification would need a separately scoped UX/contract decision. No new financial logic is needed for this pass.

## File inventory for this pass

Created:
- `docs/product/slice-3a-ux-review.md`
- `e2e/calculator-ux.spec.ts`
- `tests/product/slice-3a.test.ts`

Modified (including files already carrying Slice 3 changes):
- `docs/product/calculator-journey.md`
- `docs/product/milestone-3-architecture.md`
- `e2e/calculator-journey.spec.ts`
- `e2e/calculator-results.spec.ts`
- `src/components/report/ResultsPage.tsx`
- `src/components/report/results.module.css`
- `src/features/calculator/journey/JourneyPage.tsx`
- `src/features/calculator/journey/journey.module.css`
- `src/product/calculator/copy.ts`
- `src/product/calculator/journey.ts`
- `src/product/calculator/view-model.ts`
- `tests/product/calculator.test.ts`

The pre-existing untracked `visual-usability-audit.md` remains the Slice 3 record. The raw workbook remains excluded from all changes and commits.

## Final validation

- `npm run lint`: passed.
- `npm run typecheck`: passed; repeated after restoring build-generated route-path churn in `next-env.d.ts`.
- `npm test`: 925 tests passed across 22 files (all 924 previous tests plus the new numeric regression).
- `npm run build`: passed; development-only results metadata retains status 404 in production.
- `npm run data:verify`: passed; 32 artifacts, 1191 observed rows and 80 coverage cells verified.
- `npm run test:e2e -- --workers=2`: all 19 tests passed, including all 16 prior cases with revised copy assertions and three new UX/regression cases.
- `git diff --check` and whitespace checks for new files: passed.
- All 32 generated JSON hashes and the workbook hash match the starting baseline. Workbook SHA-256 remains `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`; untracked and untouched.
- No diff in engine, evidence, adapter, composer, reducer or provider. Product changes are copy and review/view presentation only.

Slice 3A is safe to commit together with the preserved Slice 3 work, excluding the raw workbook. No staging or commit was performed. Remaining owner asset/visual/device sign-off does not indicate a numeric regression.
