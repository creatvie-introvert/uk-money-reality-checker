# Milestone 3 Slice 2: production calculator journey

## Starting state and scope

Started on `rebuild/next-production` at `b28211f1be2c3ec09d71db0e393d7dcb47996488`, matching the live origin branch. Only the raw workbook was untracked. Follow the [locked design handoff](milestone-3-design-handoff.md), [product architecture](milestone-3-architecture.md) and audited M2 engine. The supplied eight HTML pages were re-audited as structural references; their scripts, persistence and figures are not used.

This slice wires the production journey. It adds no financial model, calculation formula, data ingestion, API, dependency or analytics. The scoped Slice 1 navy/blue/green presentation and paired prototype scenario cards are reused; asset and microspacing sign-off remain later work.

## Routes and state ownership

| Route | Inputs / behavior |
| --- | --- |
| `/calculator` | Current and destination MVP cities, including same-city comparisons |
| `/calculator/household` | Shared adult/child counts; separate bedrooms, applicability dates, rent period/basis, council tax selections/overrides |
| `/calculator/income` | Separate gross salaries, jurisdiction, tax year, explicit employment-scope confirmation and optional actual take-home |
| `/calculator/spending` | Separate grocery, essentials and energy amounts; water selections or monthly bills |
| `/calculator/transport` | Separate unknown, entered monthly total or explicitly no-cost declarations |
| `/calculator/lifestyle` | Separate entered monthly lifestyle amounts or missing values |
| `/calculator/review` | Live move, household, housing/council tax, income, spending, transport and lifestyle input summaries with Edit actions |
| `/calculator/results` | Latest in-memory product result, or safe empty state with Start calculator |

`src/app/calculator/layout.tsx` mounts `JourneyProvider` across these routes. A local context and reducer own **one** canonical `CalculatorFormState`, visited/validated-step metadata, review-edit intent and latest product result/view model. There is no disconnected step-local financial store. React Hook Form is installed but had no existing usage; context + reducer is sufficient without adding another state owner.

The route determines the current step. Back/Continue use explicit routes, not browser history assumptions. Native browser back/forward also retain state within the mounted calculator layout. Unsupported step slugs return 404. Refresh on an input/review route starts from empty inputs; refresh/direct access on results offers Start calculator. Leaving the calculator layout discards its state.

Each draft change invalidates the stored result and the edited step's validation marker. Later inputs remain intact. Restart creates a fresh empty draft and clears result, completion and edit metadata. Pending result submission is ignored if its page unmounts or the user restarts, preventing an older result from restoring cleared state.

## Empty and explicit input semantics

All city/date/count/income selectors begin blank. Cost modes begin UNKNOWN; this does not imply zero, a source choice or a model. Current and destination objects are independently created. Household composition moves together and is not a cost/salary multiplier. Only the engine's adult and child counts are collected; no unsupported child-age model or property-type field is added.

Money remains decimal pound text. The UI never parses monetary values into floats. Clearing a bare optional energy/spending/lifestyle field restores UNKNOWN; entering `0` produces an explicit amount where supported. Selecting an amount mode for rent/council/water/transport requires entering its amount. Switching modes is an explicit user action. Existing valid council/water source selections are retained as baseline context when switching to an override; switching back restores those selections, without inventing a new one.

The product field metadata, `changeField`, empty draft and review presentation live in `src/product/calculator/journey.ts`; reducer and React components live in `src/features/calculator/journey/`. These manipulate the product draft only. The existing adapter remains the sole mapping to M2 inputs.

### Evidence and income choices

- **Rent:** Explicit published-source or monthly override. The July 2026 source-context period and evidence applicability date must be selected/entered separately per side, even with overrides. Edinburgh published rent can remain unresolved without blocking the journey.
- **Council tax:** Explicit authority and band for the seven identities present in the audited release, or a monthly override/unknown. Names are a compact product allowlist verified against the release, with no charge data in the UI. Selecting a city does not select its authority. London has no borough selector or generic charge; use an entered bill or unresolved state.
- **Tax jurisdiction:** Plain-language England/Wales/Northern Ireland and Scottish rate choices, stored as rUK/Scotland. Never inferred from city. A supplied salary without net override requires jurisdiction, tax year and supported-scope confirmation before continuing.
- **Scope:** An explicit checkbox confirms one employee, one employment, category A employee NI and annual comparison. Only that user action fills the corresponding scope/category/basis contract values. Tax year is separately selected. No hidden employment default is added.
- **Actual take-home:** Optional independent monthly override retains supplied gross details. It does not derive gross. The hint explains why destination net override makes salary preservation ineligible. Clearing it removes the override explicitly.
- **Energy/spending/lifestyle:** Own monthly amounts only. Missing costs remain unresolved. No national household budget, consumption, profile or commute-frequency model is applied.
- **Water:** Scottish-city options include an explicit unmetered council-band charge with actual band and connected services. Neither is preselected. The draft contract permits an empty connected-services choice; the adapter omits incomplete selection and reports a gap. The engine still enforces applicability and band consistency. English tariff evidence does not invent a household bill; Birmingham uncertainty remains unresolved without a supported input.
- **Transport:** Monthly total, explicit no-cost declaration, or unknown. Zero and not-applicable remain distinct. Fare-product UI is deliberately deferred; the existing adapter's explicit-product support remains available to other callers.

## Validation and review

Step validation is scoped to displayed fields and reuses engine scalar schemas for money, counts and dates. Errors have concise product copy, field associations through `aria-describedby`, an invalid state and a focusable error summary. Invalid cities, negative/malformed money, zero in strictly positive categories, impossible counts and missing structural inputs block advancement. Jurisdiction/scope gaps block salary-based entry while actual net overrides and fully unknown income remain supported.

Missing energy, spending, transport, council selections and unresolved evidence do not force fabricated completeness. Selecting published rent for Edinburgh is valid intent and may lead to partial results. Incomplete council/water source selections remain visible in review and become adapter/engine gaps.

Review shows entered inputs and selection labels only, without tax, totals or salary calculations. Each section has a descriptive Edit control. Save and return to review validates that step and preserves later data. The ordinary Back action also preserves state. Progress means visited and validated steps, not financial coverage.

Before submission, `validateJourney` runs all step checks and `buildCalculatorInputsFromForm`. Only then does the existing calculator entry run:

`canonical form → adapter → M2 scenarios/comparison/ranking/eligibility/eligible solver → composer → view model`

The client stores the resulting product result/view model and navigates to results. No low-level calculator is called from a step or the review UI. Product changes are limited to draft validation/presentation and the empty water-services draft case; M2 and financial arithmetic are unchanged.

## Result navigation and privacy

Production results reuse Slice 1 presentation. Adjust inputs returns to review; unresolved-category actions return to the matching step. New comparison clears the canonical state and returns to move setup. The empty results state never calculates with defaults and never imports a fixture.

Financial data stays in client memory only. No financial query strings, localStorage, sessionStorage, cookies, logging, analytics or server APIs are introduced. Navigation requests contain routes, not form payloads. The product calculator/evidence loader is loaded on demand and retained per mounted provider. `/dev/calculator-results` remains separately labelled, development-only and returns 404 in the production build.

## Prototype exclusions and deferred work

Excluded from active inputs: default Manchester/London, two bedrooms/flat, household counts, rent/salary/bill examples, council bands, childcare zero, payroll deductions, generic fare/frequency assumptions, lifestyle profiles, static review results, required preservation salary and arbitrary percentage confidence. Placeholders do not supply financial defaults.

Deferred: full fare-product selection with conditions, London borough coverage/selection, separately approved new financial models, original artwork/font assets, richer source guidance and final visual/accessibility sign-off. No same-salary assumption or automatic copy action was added. The existing foundation landing page is outside this slice; the production journey entry is `/calculator`.

## Validation evidence

- New reducer/product tests cover empty state, separate sides, preservation across edit, zero versus empty, restart, invalidation, baseline retention, scalar errors, explicit jurisdiction, optional gaps, Edinburgh rent, unselected water services and review values.
- Complete browser journey produces a +£600 monthly cost change and +£486.48 take-home change, complete cost coverage and an available salary panel.
- Partial browser journey leaves destination energy and transport blank: 6 of 8 categories resolved, qualified hero, no cost/buffer delta and an unavailable salary result.
- Review edit changes destination rent from £1,800 to £1,900; the result changes from +£600 to +£700 monthly cost while lifestyle entries remain intact.
- Browser coverage includes Back/Continue, review Edit, edit after results, native back/forward, restart, direct results access, refresh, error focus and no browser storage/query persistence.
- Desktop 1440px, tablet 820px and mobile 390px checks found no page-width overflow. Form labels, fieldsets, one H1, current-step semantics, focus styling, heading/error focus and keyboard-operable controls are implemented. This is focused functional testing, not a claim of a full assistive-technology audit.

Final checks passed: lint, typecheck, 924 unit tests across 21 files (all prior 908 plus 16 new), all 10 browser tests (five new journey tests), production build, data:verify and whitespace checks including new files. Two existing solver tests timed out when run concurrently with the production build; the entire suite passed when rerun alone, without changing tests or timeout limits. The final build was also run separately.

Production prerender metadata confirms `/dev/calculator-results` has status 404. All 32 generated JSON artifact hashes and the raw workbook hash match the starting baseline. Workbook SHA-256: `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`. Build-generated `next-env.d.ts` path changes were restored and typecheck rerun. Nothing was staged or committed; the workbook remains untracked and must not be included in a commit.

## Slice 3 usability refinement

The shared shell now aligns with the results content width. Current/destination fieldsets have restrained grey/blue borders; validated progress steps use checkmarks while preserving current-step semantics. Money inputs display £ and period units around unchanged decimal-text values. Required semantics, stronger input boundaries, explicit error-link focus, skip navigation and calculation status improve keyboard and assistive-technology access.

Review groups have consistent cards and explicit amber unresolved values. Form columns stack at 800px, full progress labels wrap at small widths, and mobile Back/Continue controls span the available width. Results retain edit/restart/refresh behavior, with a clearer empty state and native source disclosures. See [Slice 3 visual and usability audit](visual-usability-audit.md) for the viewport matrix, validation evidence and remaining asset/owner sign-off items.

## Slice 3A terminology and review hierarchy

Household evidence controls now use “Use evidence available on” and “Published rent period”, retaining separate explicit selections per scenario. Employment confirmation uses plain language with Class 1 category A/annual scope in a native disclosure. Actual monthly take-home guidance and spending/lifestyle helpers are clearer; input and eligibility semantics are unchanged.

Review prioritizes user decisions and places technical evidence/calculation context in an always-visible secondary area. Edit controls use concise descriptive labels. Clean-session progress tests confirm future steps stay upcoming and Back preserves validated status; no progress-state change was necessary. See [Slice 3A UX review](slice-3a-ux-review.md) for decisions, accessibility coverage and Manchester–Leeds regression evidence.
