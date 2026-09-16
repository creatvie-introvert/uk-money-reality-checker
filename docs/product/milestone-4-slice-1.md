# Milestone 4 Slice 4.1 — public shell and homepage QA

## Outcome

Slice 4.1 is complete and safe for a separately reviewed commit, excluding the raw workbook. Nothing staged, committed, pushed or deployed. See [Milestone 4 architecture](milestone-4-architecture.md) for the route map, layout decisions and deferred work.

The root development demo is replaced with a public homepage. Shared public navigation and footer connect Home, Calculator, Cities, Methodology and Sources. The calculator retains its existing focused shell, avoiding duplicate headers and preserving progress, focus, restart and in-memory behavior. Public styles are scoped CSS modules; no calculator/report styles or root global CSS changed.

## Product and presentation checks

The homepage contains the mint hero and calculator/cities CTAs, four evidence-oriented principles, a three-step explanation, all eight supported city names, category-specific transparency guidance and final calculator invitation. The comparison motif contains labels only, without example financial figures. No savings claims, city ranking, affordability score or acceptance-test output is used as marketing. £0 appears only in the explicit missing-values explanation.

Cities, Methodology and Sources are visibly temporary pages with an incomplete-state notice, routes back home/to the calculator and `noindex, follow` metadata. They expose no unreviewed city statistics, methodology or register. Homepage link context also explains that these public pages are being prepared. Placeholder replacement is required before Milestone 4 closure.

The public header shows all links continuously; mobile uses a consistent three-column grid across two rows. No menu toggle, custom focus management or extra menu state is needed. Native links have at least 44px height. The footer links only to implemented routes and renders the server's UTC year. Privacy and Accessibility links are deferred until those pages exist.

## Responsive and accessibility QA

Automated checks and homepage captures cover 1440, 1280, 1024, 768, 390 and 320px. Header navigation remains visible and in bounds; hero/CTAs, principles, steps, cities, transparency and footer adapt without horizontal page overflow. Tablet stacks the hero; mobile stacks CTA/principle/step cards. Cities use four, two or one columns according to available width. Every placeholder also passes the six-width overflow check.

Screenshots were visually inspected across the six homepage widths, plus all three temporary pages at 320px. Captures: `/tmp/ukmr-4-1-home-{1440,1280,1024,768,390,320}.png` and `/tmp/ukmr-4-1-{cities,methodology,sources}-320.png`. They are temporary QA artifacts, not committed assets. Local Next development badges/compiling indicators in captures are not public product content.

One H1, one main, one header and one footer are asserted on the homepage. Public navigation has an accessible name and aria-current; decorative arrows are hidden from assistive technology. Keyboard tests verify the skip link focuses main, nav links show focus under keyboard interaction, Enter navigates, temporary pages identify their status and footer Calculator returns to the existing journey without a duplicate banner. Existing calculator accessibility/source-disclosure tests still pass.

The initial new focus assertion failed after a preceding mouse click because programmatic focus retained pointer modality; the test now switches back to keyboard modality before checking focus-visible. No application focus workaround was introduced. Mobile navigation was refined from natural wrapping to a consistent grid after screenshot review.

Representative contrast ratios, measured from CSS using sRGB relative luminance:

| Pair | Ratio |
| --- | --- |
| Body / canvas | 17.01:1 |
| Hero title / darkest mint | 12.79:1 |
| Hero helper / darkest mint | 7.44:1 |
| White primary button text / blue | 5.82:1 |
| Muted copy / canvas | 5.97:1 |
| Steps helper / navy | 9.18:1 |
| Footer helper / navy | 11.88:1 |
| Preparation notice text / amber | 6.73:1 |
| Transparency copy / pale blue | 7.80:1 |

All measured text pairs exceed 4.5:1. This is focused Chromium, keyboard, DOM and visual QA; Safari, VoiceOver and physical-device certification remain unverified. Original approved font/artwork and owner visual acceptance remain separate sign-off items.

## Tests and validation

- `npm test`: **935 tests across 23 files pass**, including all ten Milestone 3 closure acceptance cases. No financial test changes.
- `npm run test:e2e -- --workers=2`: **31 tests pass**. All 23 existing calculator browser cases remain; the old root development-shell smoke case now tests homepage-to-calculator entry. Seven added cases cover six homepage widths and keyboard/placeholder navigation.
- `npm run lint`: pass.
- `npm run typecheck`: pass. The first run saw a stale generated route validator referencing the removed root `page.tsx`; Next's production build regenerated route types for `(public)/page.tsx`, after which typecheck passed. Build-generated next-env route-path churn is restored before completion and typecheck rerun.
- `npm run build`: pass, repeated after the final mobile-nav CSS adjustment. Homepage and three temporary pages are static routes; development preview remains production 404.
- `npm run data:verify`: pass, 32 artifacts, 1191 observed rows, 80 coverage cells.
- `git diff --check`: pass; new files checked separately for whitespace.

No public-shell imports of engine/product calculators, generated data or fixtures were found. No analytics, storage, request serialization, API or dependency was added.

## Regression and protected files

The locked Manchester–Leeds case remains: costs £2,314.67 → £2,163.31 (−£151.36/month); take-home £3,293.30 → £3,538.12 (+£244.82/month); buffers £978.63 → £1,374.81 (+£396.18/month); salary preservation £47,477.35/year; 8/8 coverage each. The partial energy/transport case remains truthful with unavailable cost/buffer deltas and salary, while take-home change remains independently available. Source disclosures, override/zero behavior, refresh/restart and privacy checks pass unchanged.

There is no diff in `src/engine`, `src/data`, `src/product`, `src/features/calculator` or `src/components/report`. The only calculator route change is metadata. All 32 generated artifact hashes and workbook hash match the prior baseline. The workbook remains untracked and untouched at SHA-256 `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`.

## Files

Created:
- `src/app/(public)/layout.tsx`
- `src/app/(public)/page.tsx`
- `src/app/(public)/cities/page.tsx`
- `src/app/(public)/methodology/page.tsx`
- `src/app/(public)/sources/page.tsx`
- `src/components/public/PublicHeader.tsx`
- `src/components/public/PublicFooter.tsx`
- `src/components/public/ComingSoonPage.tsx`
- `src/components/public/public.module.css`
- `e2e/public-homepage.spec.ts`
- `docs/product/milestone-4-architecture.md`
- `docs/product/milestone-4-slice-1.md`

Modified: root layout default description, calculator layout metadata, homepage smoke test. Removed: old `src/app/page.tsx`, replaced by the route-group homepage. The unused DevelopmentShell component/legacy scoped CSS remains unmounted; no cleanup outside this slice was attempted.

## Remaining work

No Slice 4.1 blocker found. The temporary public pages, missing original assets and broader device/owner review are explicitly recorded limitations, not completed launch work. Slice 4.2 should implement the supported-city index and carefully scoped city details using reviewed coverage and source limitations. Subsequent slices must replace Methodology/Sources placeholders, add necessary policy/accessibility pages and complete launch review before any production cutover.
