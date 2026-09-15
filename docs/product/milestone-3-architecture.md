# Milestone 3: product boundary and calculator journey

## Scope and references

Slice 1 implemented the pure product pipeline and a development-only React proof. Slice 2 now connects the production seven-step calculator, review/edit flow and in-memory results handoff. See [calculator journey](calculator-journey.md) for current form behavior, validation and privacy. Follow the [locked design handoff](milestone-3-design-handoff.md) and [audited Milestone 2 contracts](../engine/milestone-2-closure.md). Engine truth takes priority over screenshot values and prototype structure. Prototype arithmetic and example results are never imported.

Starting state: `rebuild/next-production`, `c110a843a6d9c1f92d3e587d5cba55e4ccac213a`, matching the live origin branch. Tracked files were clean; only `src/data/raw/ukmr_data_pack_and_source_register_v3_1.xlsx` was untracked. No engine, generated evidence, raw workbook, dependencies or API endpoints are changed by this slice.

## Modules and flow

`form draft → adapter → M2 scenarios → comparison → ranking → eligibility → eligible solver → composer → view model → React`

| Module under `src/product/calculator/` | Responsibility |
| --- | --- |
| `contracts.ts` | Form draft, validated adapter states, product amounts/metrics, breakdown, salary, explanations and issues |
| `adapter.ts` | Strict draft validation and explicit current/destination input mapping |
| `orchestrator.ts` | Engine call order, eligibility gate and composition |
| `composer.ts` | Compact product meanings from domain results; no new financial calculations |
| `view-model.ts` | Presentation strings, states, signed values, coverage text and visual bar widths |
| `copy.ts` | Classification, category, source-release, diagnostic and action labels |
| `formatting.ts` | Exact-money display boundary and purely visual bar scaling |
| `index.ts` | Public product exports |

`ProductCalculatorResult` retains exact Money separately from its display values. It includes two location summaries, three ordered headline metrics, eight breakdown rows, ranked/increase/saving/unchanged/excluded driver views, salary availability, unresolved items, diagnostics and per-category source periods. It does not duplicate full scenario/evidence payloads. The orchestration result additionally retains the adapter result for caller validation; this is not passed to presentation.

## Adapter rules

`buildCalculatorInputsFromForm(unknown)` is pure and returns each side as READY, INCOMPLETE or INVALID. Zod rejects unsupported fields and malformed inputs. If either side is not READY, orchestration returns INPUT_REQUIRED without calculating either scenario. Supported optional absences remain engine gaps, so a structurally valid incomplete comparison can still be evaluated.

- Shared adult/child counts and location/date/bedroom/rent-period fields must be explicit. Numeric money stays decimal text; only count fields convert to numbers before engine schema validation.
- Rent requires an explicit SOURCE or AMOUNT choice. UNKNOWN never triggers an implicit published-rent selection.
- AMOUNT preserves explicit zero where the engine permits it; empty or invalid overrides do not fall through to a baseline. Rent's strictly positive validation remains engine-owned.
- Council authority and band must both be selected, or the user must enter a monthly amount. London borough applicability is never guessed. Missing source selection produces a diagnostic and unresolved engine input.
- Water accepts explicit supported band/services or monthly override. Energy, groceries, essentials and lifestyle require explicit monthly inputs to resolve. Reference data is not a household budget model.
- Transport accepts a selected product, monthly override or explicit NONE. A selected product can retain its override and baseline; UNKNOWN never selects a first/cheapest fare. NONE stays distinct from an entered zero.
- Council/water overrides can retain explicit source selections for baseline explanation. Override provenance is never relabelled as official data.
- Employment scope, tax year, NI category, annual basis and tax jurisdiction are explicit. Blank jurisdiction raises an adapter gap; city never determines taxpayer status. Actual net-income override remains supported, with salary eligibility left to M2.
- Prototype childcare, payroll deductions, property-type assumptions, lifestyle profiles and commute-frequency controls have no active mapping. Strict input validation rejects extra fields rather than letting them contaminate calculations.

## Composer and availability

The composer copies only engine-calculated deltas. It does not subtract household subtotals, calculate take-home/residual, sort cost drivers or approximate salaries.

| Product state | Presentation rule |
| --- | --- |
| AVAILABLE metric | Exact value, signed display, direction, both amounts and classification/dependencies |
| PARTIAL / UNAVAILABLE metric | No numeric delta; reason and unresolved dependencies |
| PARTIAL scenario amount | Engine known-cost subtotal/residual, visibly labelled incomplete |
| UNAVAILABLE amount | “Needs input”, never £0 |
| NOT_APPLICABLE cost | Explicit text, no effective numeric amount or invented comparison delta |

Overall COMPLETE means the engine's core comparison is complete. PARTIAL means some comparison/category information is available. LIMITED means no comparable headline/category result is available. Salary eligibility and driver completeness remain independently disclosed: a complete cost/income comparison can still have an unavailable salary result when destination take-home is overridden.

Only a complete household cost comparison permits the numeric move-cost hero. Partial comparisons use qualified copy. A partial buffer is labelled “After known costs — incomplete”; negative complete buffers retain their minus sign and do not receive positive green styling. A true zero change remains visible as no change. Nonzero values below display precision are described as less than one penny rather than zero.

Drivers preserve M2 order, rank, direction, exact impact and classification. Excluded categories never receive bars. Unchanged costs remain in their own disclosure. Bars use exact magnitudes only for a bounded integer percentage; a nonzero impact has at least 1% visible width. This visual minimum never changes displayed or underlying money.

Salary eligibility is called before the solver; INELIGIBLE never invokes the solver. Solved results retain required annual gross, required monthly net, target buffer, destination cost basis, achieved residual, exact overshoot, jurisdiction and search metadata. Proposed destination gross is included when its supported baseline exists. No product-level salary-gap subtraction is introduced. The panel uses “Salary needed to keep the same monthly buffer”, with one-employee/one-employment, Class 1 category A annual-comparison limitations. INELIGIBLE and NO_SOLUTION_WITHIN_BOUNDS stay visible with reasons; the operational search maximum is not a statutory maximum or a capped answer.

## Sources, classifications and actions

OBSERVED_DATA → Official data; CALCULATED → Calculated; USER_ENTERED → Your amount; MODELLED_ESTIMATE → Estimate. The final mapping is ready but this slice does not manufacture modelled output.

Compact explanations retain source organisation, title/link, publication period, effective range when supplied, geography and limitations. Entered amounts preserve baseline explanations, explicitly marked as baseline context. Row details and take-home methodology disclosures expose these without placing provenance payloads in KPI cards.

Source releases retain their own periods: July rent, fiscal-year tax/council/water, quarterly energy, FYE spending and September transport. “Sources use different publication and effective periods” replaces a fabricated universal updated date. Available background releases are labelled as such; they do not necessarily determine entered amounts.

Issues preserve engine code, category, scenario role, severity, action possibility and suggested action. Copy is centrally mapped with original engine text as a fallback. Supported suggestions are ENTER_AMOUNT, SELECT_AUTHORITY, SELECT_BAND, SELECT_TRANSPORT_PRODUCT, SELECT_WATER_OPTION and REVIEW_INPUT. Production result suggestions return to the relevant form step, or review when no category target exists. The development proof keeps suggestions descriptive.

Cost coverage uses engine required/resolved/unresolved/not-applicable counts. It is not confidence or accuracy. An unevaluated scenario has no invented count. There are eight supported categories; childcare is not a ninth zero-cost row. A complete result means complete within that scope, not every possible household expense.

## Client/server and privacy

Shared pure code is safe to call in tests or the client. The preview dynamically imports a product calculator on demand and retains one evidence loader per mounted preview. React invokes the product entry point only; it neither imports generated evidence nor performs financial arithmetic. No API is needed.

Local component state retains only the selected development fixture and latest result for the mounted session. Selecting another fixture clears the old result; navigating away/reloading discards it. No financial query parameters, cookies, browser storage, analytics payloads, logs or server persistence are added. Controls remain disabled before hydration so an early selection cannot silently revert to the initial fixture. Configuration failures get a generic visible error without logging inputs.

## First UI proof

- Run `npm run dev`; visit `/dev/calculator-results`; choose a labelled fixture and press **Calculate preview**. Fixtures live only in `src/features/calculator/development/fixtures.ts`. All result numbers are computed at runtime.
- `/dev/calculator-results` returns 404 outside development; confirmed in production prerender metadata.
- `/calculator/results` renders the latest in-memory production calculation, or offers Start calculator when no result exists. It never consumes development fixtures.
- `ResultsPage` accepts only the view model. It preserves the approved mint summary, four KPIs, notice/tab strip, cost table plus ranked bars, dark-blue salary panel, coverage/methodology and next-action grouping. Additional qualification serves real engine states.
- Keyboard focus, table labels, details disclosures, textual status and signed changes are present. Mobile cards stack and the table scrolls within its labelled region. No page-width overflow at 390px in browser testing.
- The screenshot's separate skyline artwork and verifiable font file were not supplied. The proof uses the documented Inter/system fallback and leaves artwork integration open. This is the first integration, not a claim of completed pixel-level visual sign-off. City/search experiences remain deferred; the full landing/city experience is outside this slice.

### Representative runtime results

These are generated from explicit development inputs, not production defaults:

| Result | Complete rUK fixture | Same fixture with destination water unknown |
| --- | --- | --- |
| Cost change | +£725.33/month | Unavailable; no partial-subtotal delta |
| Take-home change | +£486.48/month | +£486.48/month |
| Buffer change | −£238.85/month | Unavailable |
| Destination costs | £2,870/month | £2,815 known costs, incomplete |
| Destination buffer | £909.78/month | £964.78 after known costs, incomplete |
| Salary | £64,941.66/year | Unavailable: destination costs incomplete |
| Destination coverage | 8 of 8 resolved | 7 of 8 resolved; water excluded from ranking |

Display rounds to the nearest penny, half away from zero, only through the engine money formatter. Exact rational values remain separate and feed all calculations. No rounded value is returned to the engine.

## Slice 1 audit and validation history

Legacy audit found no active calculator arithmetic in the app shell to remove. External HTML remains reference-only. No affordability score, prototype city fallback, static result numbers or spending profiles are introduced. The existing root development shell is unchanged.

Product tests cover all eight Milestone 2 acceptance fixtures through the new pipeline, adapter gaps/invalids/zero, eligibility call order, complete/partial/limited/no-change states, overrides with baselines, negative buffer styling metadata, source periods, no-solution bounds, exact formatting and deterministic output. Playwright covers complete headline/source, partial/water/solver unavailable, override mobile layout and the empty production entry. Existing engine and root-route tests remain in the suite.

Validation for this slice: lint, typecheck, complete Vitest suite, production build, data:verify, Playwright and diff whitespace checks. Artifact hashes are compared to the starting 32-file baseline; the raw workbook remains untracked with SHA-256 `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`.

Recorded outcome: all checks passed; 908 Vitest tests across 20 files (38 new product tests plus all 870 prior tests), and 5 Playwright tests (4 new plus the existing shell smoke test). All 32 generated artifact hashes and the workbook hash match the starting baseline. The build-generated `next-env.d.ts` path churn was restored and typecheck passed afterward. Nothing was staged or committed.

Slice 2 implements the journey with a calculator-scoped context and reducer; React Hook Form was installed but unused, so no second form store was added. Fare-product and London borough selection remain deferred; monthly overrides and unresolved paths are available. Recommended next slice: production usability and approved visual/asset sign-off, including clearer evidence-scope guidance and source explanations. New financial models require separate approval.

## Slice 2 production integration

The calculator layout owns one in-memory draft and result. Routes collect the same product form contract; `journey.ts` owns empty-state construction, field descriptions, scoped validation and review labels. `validateJourney` calls the existing adapter, then the existing product orchestration remains the sole calculation entry. The only adapter contract extension permits an explicitly unselected Scottish water service in a draft, which remains unresolved and never receives a default. See [the journey implementation record](calculator-journey.md) for details and validation.
