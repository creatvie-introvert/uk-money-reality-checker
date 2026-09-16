# Milestone 3 Slice 3B: final production QA

## Starting state and scope

Branch `rebuild/next-production`, commit `510b8e57d380fd81706e66e872248f3693d7d80b` (`Refine Milestone 3 calculator UX`), matched local and live origin. The only untracked file was the raw workbook. The initial read-only live-origin approval review timed out; one retry succeeded. No staging or commit was performed.

Inspected AGENTS.md, all Milestone 3 product records, the approved screenshot and Slice 3A production captures, the calculator/review/results code, CSS modules, font/asset inventory, production results focus handling and existing Playwright tests. The installed Next.js CSS/font/accessibility guidance had already been read during the preceding slices. No engine, product, financial-state or evidence changes were needed or made.

## Final presentation refinements

- Hero title uses balanced wrapping and a slightly wider text measure, reducing the desktop complete result from three lines to two in the reviewed Manchester–Leeds capture. Wording, mint background and compact comparison inset remain; the inset now has a restrained border. Mobile title sizing adapts down to 320px without shrinking helper text.
- Top cards reserve a consistent desktop label area, align values and keep badges at a consistent position. Mobile cards retain natural label height and stack. The precise buffer label and partial-state qualifications remain unchanged.
- Desktop breakdown amounts remain right aligned; classification badges occupy their own aligned line. Source buttons remain beneath each amount; expanded evidence now spans the table beneath its category.
- At 600px and below, the same table rows become category cards: Category, Current, Destination, Change, with both source disclosures retained. This replaces the old horizontal-scrolling mobile presentation. There is no duplicate dataset or alternate calculation path. Visible scenario labels are decorative to assistive technology because the retained column headers already supply context. Explicit table/rowgroup/row/columnheader/rowheader/cell roles preserve structure when CSS changes display. Chromium's accessibility snapshot confirms this structure and the amounts; Safari/VoiceOver still needs device verification.
- Mobile source controls have at least 44px height. Opening either rent disclosure at 390/320px exposes ONS context without page overflow; switching sides closes the previous side for that category. Source links, dates, notes, limitations and retained baselines are not removed.
- Narrow cost-driver layouts place bars below their label/signed amount; “Higher cost”/“Lower cost”, exact engine order, exclusions and unchanged-cost handling remain. Buffer comparison cards stack on mobile. Salary fact labels align on desktop and stack with natural height on mobile; title, amounts, scope and navy treatment are unchanged.
- Shared single-group review content uses the available grid width. At 320px, edit controls sit below their section heading instead of competing for a narrow row. Primary/secondary review hierarchy and every detail remain visible.
- Form gaps use a consistent 24px rhythm. Repeated border/radius and soft-surface values use existing scoped tokens, with a small shared spacing token. Legend width/line-height and native date-control bounds are explicit. No styling framework or large design-system refactor was introduced.
- Header mobile gaps are slightly tighter. The wordmark, active calculator state and New comparison remain. All seven progress labels stay visible in a wrapped pattern; the 320px version uses tighter gaps/circles. Completion and current-step semantics are unchanged.
- Coverage, essentials/lifestyle, methodology and next-action hierarchy already met the brief and were retained. Native details controls gain a hover underline. No animation was introduced.

## Accessibility findings

A concrete issue was corrected: step validation focused the error summary instead of the first invalid input. It now focuses the first invalid field, preserving the alert summary, field descriptions and summary links. Review-level failures retain summary focus because their invalid fields may be on other routes. Validation conditions and input state are unchanged.

The calculator retains real labels, fieldset legends, required/invalid semantics, linked help/errors, one H1, header/nav/main landmarks, skip links and 44px primary controls. Complete and empty production results focus the H1. No additional results live region was added. Cost-source disclosures use native buttons with aria-expanded/aria-controls and labelled regions. Employment and take-home methodology disclosures retain native details/summary controls. Signs and visible direction text supplement colour. There are no placeholder-only labels or added decorative motion.

Keyboard checks cover skip-to-main, Tab through Move setup controls and Continue, Enter submission, first-invalid focus and visible outline, empty-state Start calculator, source and employment disclosure Enter toggling, review edit controls and existing result navigation flows. Chromium's mobile table accessibility snapshot retains its caption, four column headers, category row headers and cells.

No axe or equivalent audit dependency is installed; no new accessibility dependency was added. These are focused DOM, keyboard, screenshot and contrast checks, not a claim of complete WCAG certification or an actual screen-reader session.

### Representative contrast ratios

Calculated using the sRGB relative-luminance formula and current CSS token pairs. Gradient checks use the less favourable relevant endpoint.

| Foreground / background | Ratio |
| --- | --- |
| Hero title / darkest mint endpoint | 12.79:1 |
| Hero helper / mint | 7.44:1 |
| Badge text / pale blue | 8.40:1 |
| Primary button white / blue | 5.82:1 |
| Higher-cost red / white | 5.98:1 |
| Lower-cost green / white | 7.03:1 |
| Notice text / amber background | 6.73:1 |
| Salary white / navy | 8.08:1 |
| Salary helper / navy | 6.69:1 |
| Secondary review text / soft surface | 5.68:1 |
| Input boundary / white | 3.26:1 |

## Responsive and screenshot QA

| Width | Outcome |
| --- | --- |
| 1440 / 1280 / 1024 | Existing full journeys, result sections and source disclosures pass. No page overflow or out-of-bounds sections. Desktop table retained; metric labels/values align. |
| 768 | Stacked forms, intermediate KPI grid, report/sidebar and salary stacking pass. Full progress labels remain available. |
| 390 | Complete Manchester–Leeds, review and existing partial/override flows pass. Cost cards expose both locations and provenance without horizontal scrolling. |
| 320 | Additional full Manchester–Leeds journey and keyboard/empty-state test pass. Date/select controls remain inside the form, long labels wrap, edit actions remain reachable, source cards and salary facts fit. |

Captures remain in `/tmp`, never committed: move setup from existing journey tests, household/review/complete results at desktop and 390px, partial desktop results, additional 320px captures, plus close-up 320px rent and salary panels. Main new paths: `/tmp/ukmr-3b-{household,income,review,results}-{1440,390,320}.png`, `/tmp/ukmr-3b-partial-desktop.png`, `/tmp/ukmr-3b-rent-card-320.png`, `/tmp/ukmr-3b-salary-320.png`. Existing start/review capture paths remain `/tmp/ukmr-start-*.png` and `/tmp/ukmr-journey-review-*.png`.

Visually inspected desktop complete results, mobile household/review/results and close-up rent/salary panels against the locked direction and prior captures. The close-ups use an explicitly selected development fixture; the production Manchester–Leeds captures use the real form journey. No fixture values were introduced into production defaults. Tests assert semantics and bounds rather than pixel-perfect screenshot diffs; no heavy visual regression stack was added.

Mobile cost cards intentionally make the report longer, keeping all provenance usable. A very long report is preferable here to clipped monetary columns or hidden source information. The 8px wordmark strapline is retained as brand artwork-style text; helper/disclosure text is at least 12px and inputs 16px.

## Complete and partial truth checks

Manchester–Leeds remains exactly:

| Measure | Current | Destination / change |
| --- | --- | --- |
| Monthly costs | £2,314.67 | £2,163.31 |
| Monthly take-home | £3,293.30 | £3,538.12 |
| Monthly buffer | £978.63 | £1,374.81 |
| Cost change | — | −£151.36/month |
| Take-home change | — | +£244.82/month |
| Buffer change | — | +£396.18/month |
| Preservation salary | — | £47,477.35/year |
| Coverage | 8 of 8 | 8 of 8 |

The existing product regression checks all figures; browser flows verify displayed values at 1440, 1024, 768, 390 and 320px. Partial tests retain qualified hero wording, explained unavailable deltas, factual coverage, unresolved actions and visible unavailable salary. No fake zero or comparison of incomplete cost totals is introduced. Direct/refresh results still offer Start calculator and contain no fixture values.

## Font and asset status

Current stack: `Inter, Arial, Helvetica, sans-serif`; Inter is not bundled or remotely loaded, so the available system fallback renders. The approved screenshot does not establish an exact licensed typeface. No approved font files or verified licensing/source were found. Keep the existing stack until those are supplied.

The header is the existing text wordmark. Repository assets comprise favicon/platform-icon PNGs; no standalone approved skyline/pictogram/logo production library was found. There are no new image references, placeholders, stock images, broken introduced links or arbitrary substitutions. Screenshot-level artwork fidelity remains an asset gap, not a reason to invent imagery.

## Release assessment and remaining sign-off

No code, numeric or usability launch blocker was found in the exercised Chromium matrix. Safe to commit this scoped slice, excluding the raw workbook. Owner acceptance of the final visual presentation and Safari/VoiceOver/physical-device review remain pre-launch sign-off items; only Chromium binaries are installed in this environment. This report does not claim those checks happened. Approved original font/skyline assets remain a nonblocking fidelity gap unless the owner makes them a launch requirement. Broad browser/assistive-technology certification is outside the verified evidence here.

## Validation and file inventory

All required checks passed: `npm run lint`, `npm run typecheck` (including after restoring generated route-path churn), `npm test` (925 tests across 22 files), `npm run build`, `npm run data:verify` (32 artifacts; 1191 observed rows; 80 coverage cells), `npm run test:e2e -- --workers=2` (23 tests), and `git diff --check`. Slice 3B added the 320px full regression journey and keyboard/empty-state test; its final disclosure correction added 1024px and 768px Manchester–Leeds cases, bringing the Slice 3A baseline of 19 to 23. Existing assertions were extended for mobile source cards, result H1 focus and first-invalid focus. Production metadata confirms the development-only route returns 404.

All 32 generated JSON hashes match the starting baseline. The raw workbook remains untracked and unchanged at SHA-256 `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`. There are no changes in `src/engine`, `src/data` or `src/product`, nor in reducer/provider/result-state behavior. No dependency or lockfile changes. Nothing staged or committed.

Created: `docs/product/milestone-3-final-qa.md`, `src/components/report/CostBreakdown.tsx`, `src/components/report/SourceExplanation.tsx`.

Modified:
- `docs/product/calculator-journey.md`
- `docs/product/milestone-3-architecture.md`
- `docs/product/visual-usability-audit.md`
- `src/components/report/ResultsPage.tsx`
- `src/components/report/results.module.css`
- `src/features/calculator/journey/JourneyPage.tsx`
- `src/features/calculator/journey/journey.module.css`
- `e2e/calculator-journey.spec.ts`
- `e2e/calculator-results.spec.ts`
- `e2e/calculator-ux.spec.ts`


## Final fix: full-width Basis & sources disclosures

The former details element lived inside a single Current/Destination cell of the fixed-layout table, constraining every paragraph to that column. CostBreakdown now keeps a compact comparison row and mounts the selected explanation in an immediately following row with one cell spanning all four columns. Each category is a semantic tbody group; mobile styling makes that group one card, including the full-width evidence section. Fixed table layout preserves the main column widths.

Buttons retain “Basis & sources”, expose aria-expanded and aria-controls, and name the category, scenario role and city. Panel headings explicitly show, for example, “Rent — Current · Manchester” or “Rent — Destination · Leeds”. One side opens per category; categories are independent. Enter opens, Space closes, focus stays on the triggering button, and hidden panels have no mounted source links or evidence content. The visible region follows the category row in DOM reading order.

SourceExplanation extracts the existing renderer and date formatter without changing evidence, classifications, dates, link destinations, baseline qualifications or amounts. Basis, Sources and Limitations headings reflect existing structured fields. Full-width secondary backgrounds, modest padding, a 68ch maximum reading measure, 14px prose, 1.6 line height and spaced bullets keep the source content readable. At mobile widths the text uses the available card width.

The real Manchester–Leeds production journey opens Current Rent, Destination Rent, Current Council tax and Destination entered Groceries at 1440, 1024, 768, 390 and 320px. All 20 close-ups were visually inspected: prose and readable source titles wrap naturally, effective dates and full limitation lists remain present, and both source and entered-baseline contexts remain explicit. Mobile lists are naturally longer but no longer compete with adjacent monetary columns. Captures: `/tmp/ukmr-source-{Rent-current,Rent-destination,Council-tax-current,Groceries-destination}-{1440,1024,768,390,320}.png`.

Browser assertions cover colSpan=4 and available row width, stable header widths, no page/panel overflow, context, keyboard focus, expanded state, closed links and side switching. Existing source selectors were updated for the button/region structure. The first run found one obsolete exact-text selector; after correcting it, all 23 browser tests passed. The full 925-test unit suite and financial regression values remain unchanged. No calculation, engine/product contract, dependency or evidence data changes were needed. This fix is safe to include in the existing Slice 3B commit; nothing is staged or committed. The existing Safari/VoiceOver sign-off limitation still applies.

Closure recheck: the hero-title figure above uses #072626 against the darkest mint gradient endpoint #d4ebe5; the previous 14.07:1 value used a lighter endpoint. It still exceeds the applicable threshold. For the current closure counts and decision, see [Milestone 3 closure audit](milestone-3-closure.md); the validation history above remains the Slice 3B record.
