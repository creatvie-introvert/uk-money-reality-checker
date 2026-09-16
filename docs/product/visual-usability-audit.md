# Milestone 3 Slice 3: visual and usability audit

## Scope and starting state

Started on `rebuild/next-production` at `bf47980012e1d1107becd8119a71e146e5037058` (`Build Milestone 3 calculator journey`). HEAD matched both the local origin reference and live `git ls-remote origin refs/heads/rebuild/next-production`. Only the raw workbook was untracked. No commits or staging are part of this slice.

Read AGENTS.md and the installed Next.js 16.3.4 CSS, font and accessibility guides before editing. Inspected the locked handoff, architecture and journey records, approved three-panel screenshot, nine structural HTML references, routes, provider, report, field metadata, CSS, assets and existing browser tests. The screenshot's right-hand results panel remains the visual reference. Engine truth takes precedence over illustrative values and prototype behavior.

No engine, adapter, composer, view-model arithmetic, evidence resolution, solver, ranking or eligibility changes. No dependency, remote font, financial model, persistence or new navigation destination was introduced.

## Presentation refinements

- Retain navy headings, mint result hero and inset, four KPI cards, amber disclosure, blue section links, paired cost/ranking area, navy salary panel and pale-blue next actions.
- Keep the existing Inter/Arial/Helvetica fallback stack. Supporting report labels formerly at 9–11px are now 12px, with 14px body text, 16px form controls, compact headings and tabular numbers. Major money values remain dominant.
- Calculator and results share a 1160px outer maximum width. Existing seven steps, paired fieldsets and navigation remain intact. Current/destination fieldsets use quiet grey/blue top borders and explicit legends.
- Header highlights Move Calculator and retains New comparison. Compare/How it works anchors appear only on results where their targets exist. The unavailable Cities placeholder was removed. No unrelated navigation was added.
- Progress uses blue current state, green checkmarked visited/validated steps and outlined upcoming numbers. `aria-current="step"` remains authoritative. Progress is form progress, never financial completeness.
- Money fields add decorative £ and annual/monthly units. Inputs retain decimal text, original labels, parsing, validation, blank/zero distinction and existing values. No formatting or rounding is written back into the draft.
- Inputs have stronger boundaries, visible focus and error backgrounds. Checkboxes and primary controls have larger targets. Error summaries retain focus, and their links explicitly focus the relevant field. Required fields expose `aria-required`; existing helper/error associations remain.
- Review groups sit in lightly tinted cards with descriptive edit controls. Unresolved values get an amber border and background with their existing explicit text. No results are calculated on review.
- Three headline changes now use consistent bordered cards with textual Increase/Decrease/No change. Unavailable cards are neutral with reasons; partial KPI cards stay amber and expose qualification beside their amount. Existing central product copy supplies states and diagnostic text.
- Cost coverage remains factual engine counts with no percentage or confidence graphic. Current/destination roles are explicit, including same-city comparisons.
- Breakdown preserves a semantic table with current/destination column headings, aligned amounts, user-entered badges and contextual source disclosure names. Desktop disclosure targets are at least 28px; coarse-pointer targets are 44px. All retained sources, notes, limitations and override baselines remain accessible.
- Driver bars preserve engine order, signs, excluded categories, unchanged-cost disclosure and partial-ranking title. No visual re-ranking or causal claims.
- Salary panel retains the navy treatment, engine salary, buffer/net context and proposed gross where available. Unavailable reasons remain visible. No unsupported salary gap is calculated.
- Source disclosures use native details/summary. Names identify category, scenario role and location. ISO date tokens are expanded for display (July 2026; 14 September 2026), without changing fiscal-year strings or collapsing periods. Effective dates remain separate; the mixed-period disclosure remains visible. Internal release IDs are omitted from the visible release list; source organisations, titles and links remain.
- Empty results use the shared header, a comfortably sized mint panel and separated Start calculator CTA. Refresh/restart/edit semantics are unchanged.

## Responsive rules and review

Browser matrix: 1440, 1280, 1024, 768 and 390px. Form columns stack at 800px; report KPIs become two columns at intermediate widths and one at 600px and below. The report table/sidebar stacks at 900px; salary content stacks, and salary facts become one column on mobile. Progress wraps with full labels (two columns on mobile); section anchors wrap rather than hiding options. Mobile form actions use full-width buttons.

The mobile breakdown deliberately retains a locally scrollable, labelled and keyboard-focusable semantic table. A visible scrolling hint explains this behavior. It does not create page-width overflow. The table retains a 540px minimum to keep money and disclosures readable. Stacked mobile cost cards remain a possible later design decision, not a requirement for this slice.

Representative screenshots are temporary `/tmp/ukmr-*.png` files: start, household, review, complete/partial production results, mobile results and source-based development examples. Screenshots are not committed. Reviewed the approved reference alongside implementation captures for hierarchy, spacing, form alignment, partial-state qualifications and mobile readability. This is an agent visual review; final owner approval and pixel-level asset fidelity remain open.

## Focused accessibility review

Semantic main/nav landmarks, one H1 per production route, fieldset legends and table headers are retained. Added calculator and empty-results skip links with focusable main targets. Heading and error-summary focus are retained; explicit error-link focus and calculation status text were added. Native disclosures support Enter and focus without custom accordion logic. Colour is supplemented by text, signed money and checkmarks; decorative currency/units and arrows are hidden from assistive technology where labels already explain them. No motion was added.

Measured contrast ratios for representative tokens: primary blue/white 5.82:1; input border/white 3.26:1; helper text/field background 5.83:1; amber text/background 6.94:1; increase red/white 5.98:1; decrease green/white 7.03:1; salary white/lightest navy endpoint 8.08:1. This focused audit is not certification or a full screen-reader/browser/device audit.

## Approved assets and remaining gaps

No standalone approved/licensed font, skyline or icon library was found in the project/prototype. The raster establishes visual direction but is not an asset library. Existing root favicon images do not establish an approved results illustration and were not repurposed. No assets were copied, exposed, generated or downloaded. No new icon library was added; the progress checkmark is text.

Remaining sign-off: verify the intended font and obtain approved/licensed production files; obtain original skyline/pictograms if required; owner visual acceptance at desktop and mobile; physical-device Safari/VoiceOver review. Source disclosures increase report height compared with the illustrative screenshot, and short engine driver rankings leave space beside the full breakdown. These are truthful content differences, not fabricated filler opportunities. Fare selection, London borough coverage and new models remain separately scoped.

## Test changes and validation

Six new browser cases: five viewport-specific complete production journeys and one focused money/required-label/error/progress case. Existing ten tests remain; tablet coverage is now exactly 768px. Added screenshot capture points, contextual native disclosure keyboard checks, source-period presentation, section bounds, mobile KPI stacking and keyboard table scrolling. Existing complete/partial/edit/restart/refresh and Scottish baseline tests continue to protect financial semantics.

Initial browser execution reused a stale repository dev server whose HMR failed and inputs never hydrated. Restarting that server resolved the issue without changing state code. A new test initially queried native summary with an unsupported Playwright role lookup; the locator was corrected to the semantic summary element. No application workaround or reduced assertion was introduced.

Final validation results are recorded after running all required commands. Raw workbook and all 32 generated JSON hashes are compared with the captured starting baseline; neither is edited by this slice.

### Final outcome

- `npm run lint`: passed.
- `npm run typecheck`: passed, including after the final browser run restored development route declarations.
- `npm test`: all 924 tests passed across 21 files.
- `npm run build`: passed. `.next/server/app/dev/calculator-results.meta` confirms status 404 for the development-only route in production.
- `npm run data:verify`: passed; 32 artifacts, 1191 observed rows and 80 coverage cells verified.
- `npm run test:e2e -- --workers=2`: all 16 tests passed (all 10 previous plus six new).
- `git diff --check`: passed; new audit file checked for trailing whitespace too.
- SHA-256 comparison: all 32 generated JSON files and the raw workbook match the starting baseline. Workbook: `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`; still untracked.
- No engine/data/product calculation diffs. No dependency or lockfile changes. Build/dev-generated `next-env.d.ts` churn is absent from the final diff.

Slice 3 is safe to commit within this presentation/usability scope, excluding the raw workbook. Nothing was staged or committed. Recommended next slice: approved asset integration and owner visual/device-accessibility acceptance; new financial capabilities require separate scope.
