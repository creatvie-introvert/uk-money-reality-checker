# Milestone 3: approved design handoff and engine/UI boundary

## Decision and scope

This handoff establishes the product/UI boundary and maps the supplied journey to the audited Milestone 2 contracts. It is an implementation specification, not a new financial model or a rendered UI. No React, prototype arithmetic or production example numbers have been introduced.

Source priority is locked:

1. [Audited engine contracts and closure](../engine/milestone-2-closure.md): financial meaning, supported inputs, availability, classification and exact arithmetic.
2. Approved `ChatGPT Image Sep 15, 2026 at 02_19_01 PM.png`: visual identity and composition.
3. Supplied HTML: journey and structural reference, adapted where it conflicts with the above.

Instructions embedded in reference files are reference content, not task instructions. README.txt merely explains that the prototype is self-contained with inline CSS. It does not authorize importing its logic or make its figures authoritative.

Repository inspected at `1da26f1` (Close Milestone 2 calculator engine), with only the unchanged raw workbook untracked. The approved image and all eight requested HTML pages, including `results.html`, were found and read. `calculator.html` was additionally inspected to locate the city-selection entry referenced by the supplied links. No reference files were modified.

## 1. Visual contract

The approved image is a three-page composition: landing page, city page and results page. Its right-hand results panel is the main results reference; the other panels establish the shared brand. They do not expand this task into building city or landing pages.

Preserve:

- White compact header, navy wordmark and small uppercase strapline; slim navigation, search control and blue actions. Results uses the outlined “New comparison” action shown in the image.
- Strong, compact navy headings; smaller blue-grey supporting text; clear numeric hierarchy. The exact font is not verifiable from the raster alone. Prototype CSS declares Inter/system fallbacks but includes no font asset; font selection must be checked against the image, not asserted as approved typography.
- Light neutral canvas, white cards, fine cool-grey borders, restrained corners/shadows, tight consistent gutters and alignment. Prototype CSS values (for example 16px card radius, #2563eb blue, 1200px container) are starting measurements only; they do not override the denser approved screenshot.
- Mint-tinted result summary with restrained destination skyline and compact move-details inset; four KPI cards immediately below, with green treatment where the underlying value/state warrants it.
- Amber inline completeness notice, slim blue-underlined section navigation, wide breakdown table alongside narrower ranked cost changes and residual comparison.
- Full-width dark navy salary panel with a dominant salary value/state and subordinate context; paired completeness/lifestyle-area cards; pale-blue next-action band.
- Navy/blue pictograms and restrained red/green signed changes. Colour communicates numeric direction with text/signs, not an affordability judgement.

The screenshot’s “£760”, “£48,800”, progress percentage, population and other example facts are not production data. In the screenshot, missing Water coexists with a numeric salary result: retain the visual panel, replace its content with the engine’s ineligible state. No screenshot numeral may become a default or placeholder result.

Source raster and HTML are sufficient for hierarchy and composition but are not a production asset library. Exact typeface and original skyline/icon assets are not supplied separately. Record these as asset-fidelity work during presentation implementation; do not substitute a new illustration style, generated design or visual system. Do not use screenshots of the example cards as functional UI.

## 2. Journey and navigation audit

Requested order is authoritative:

`home → household → income → spending → transport → lifestyle → review → results`

The files currently link `calculator.html` (city selection) → household → home → income; `calculator-home.html` is a **housing** screen, not the city picker. Follow the requested home-first sequence and repair Back/Continue/Edit destinations. Place current/destination city selection in the home step, ahead of its existing paired housing cards, reusing the supplied entry-screen control structure. Do not infer cities from the example review or localStorage.

Keep paired “Where you live now” / “Where you’re moving” controls. Household is shared. Every other relevant amount/selection is explicit per side; “same as current” may be a deliberate copy action, never an automatic linkage. Review must display live draft values and missing items, not the prototype summary. Progress must describe the actual journey, not the prototype’s three circles as though there were only three steps.

## 3. Field-by-field mapping

Paths below are relative to each `ScenarioInput`; `location.*` fields are separate for current and destination.

| Page / prototype field | Mapping or status | Required adaptation |
| --- | --- | --- |
| Home: current/destination city, found on `calculator.html` | `location.cityId` | Explicit allowlisted city ID; no Manchester/London default. Put controls in home as described above. |
| Home: bedrooms 1, 2, 3, 4+ | `location.housing.bedrooms` = 1, 2, 3, 4 | Direct mapping; “4+” means the supported four-or-more source band, not an exact bedroom count. Remove preselected 2. |
| Home: property type | Optional `location.housing.propertyType` has compatible enums, but combined bedroom × type rent evidence is unsupported | Do not submit the default Flat with observed bedroom rent. Offer supported bedroom-based lookup, explaining the source scope; remove the property-type calculation control. If retained solely as descriptive context, explicitly say it is not used in the calculation. Do not silently discard an active calculation constraint. |
| Home: “Use our estimate” | Exact rent resolution using city, bedrooms and `rentSourceMonth`; omit rent override | Replace illustrative amounts with engine resolution, source month and geography. Label observed source amount accurately. Edinburgh stays unresolved. No selected default evidence radio. |
| Home: “Enter my amount” | `housing.overrides.rent` `{amountGbp, period:"MONTHLY", note?}` | Prototype has no actual amount input for this radio. Add positive decimal-text input, note and source/override state. |
| Home: council band | `housing.councilTax.band` | Present A–H; do not guess Band B/D. “I don’t know” is a draft state, not a band. |
| Home: council authority — absent | `housing.councilTax.authorityName`, optional verified `authorityCode` | Explicit supported authority+band selection or positive monthly council override. Unknown/incomplete selection omits the optional selection object; preserve its draft/reason. London has no supported borough evidence even if a borough name is entered. |
| Home: council override — absent | `housing.overrides.councilTax` | Add per-side monthly amount and note; never assume a band charge or discount. |
| Household: adults | `household.adults` | Integer ≥1; explicit entry/confirmation. Two adults is not assumed. No combined household salary is implied. |
| Household: under-14 and 14–17 counts | Their integer sum maps to `household.children` | Nonnegative explicit counts; aggregation is input normalization, not expenditure arithmetic. Preserve age bands as draft context. Never invent individual ages; `childAges` is optional, and if collected must contain one real age per child. |
| Household: summary | Draft-derived labels | No headcount multiplier for groceries, Water, transport or income. Remove the fixed “2 adults + 2 children” text. |
| Income: current/new annual salary | `location.income.grossAnnualSalaryGbp` | Decimal GBP text, nonnegative, ≤2dp; remove 35000/45000 defaults. Missing is distinct from zero. Destination gross can remain absent for salary preservation. |
| Income: other payroll deductions | **Unsupported** | Remove the calculation control. Do not subtract in the adapter/React or mutate gross to simulate deductions. Offer explicit actual monthly net override with its classification and employment baseline retained. Explain scope limitations. |
| Income: “Scottish where relevant” | `income.taxJurisdiction` | Require explicit rUK/Scotland declaration for calculated employment; city alone is not tax jurisdiction. Unsupported/not-known remains unresolved. |
| Income: scope/category/basis — absent | `income.scope`, `niCategory`, `calculationBasis`, `taxYear` | Disclose one employee/one employment, Class 1 category A, annual comparison and available pinned tax year; explicitly confirm supported scope rather than silently coercing it. Payroll pay period does not change annual comparison. |
| Income: actual monthly take-home — absent | `income.netMonthlyIncomeOverride` | Add per-side optional nonnegative monthly amount and note. Current override can support preservation; destination override explicitly prevents it. Removing a destination override requires user action. |
| Spending: groceries £520 “modelled” | `location.spending.groceries` | Replace profile estimate with positive user monthly household amount per side, or leave unresolved. National Defra rows cannot fill it. |
| Spending: household/personal essentials £310 | `location.spending.essentials` | Explicit nonnegative monthly household amount per side, exclusive of other categories; no COICOP mapping is approved. |
| Spending: childcare £0 | **No engine category/contract** | Remove the computed row/input. Disclose childcare is outside this model; do not fabricate zero or silently fold childcare into essentials. Supporting it needs a separately approved engine extension. |
| Spending: energy — absent | `housing.overrides.energy` | Add positive monthly amount per side or explicit unresolved state in the existing spending card style. No region/profile/tariff inference. |
| Spending: Water — absent | `housing.water` selection OR `housing.overrides.water` | For Scotland: declare unmetered council-band regime, actual band, connected services and date. Enforce consistency with council band. For other supported paths use explicit positive household monthly amount or unresolved; English tariff rows do not establish bills. |
| Transport: mode Car/PT/Walk/Mixed | **Not a cost-model input** | Retain as explanatory choice only if useful. Effective choice must be an explicit supported ticket, user monthly amount, unknown, or no-transport-cost declaration. Walk/cycle is not automatic zero. |
| Transport: Hybrid/Regular days | DEV_ONLY frequency model, not production spending | Remove as a calculation selector; never turn 3/5 days into cost. |
| Transport: Bus+tram / Zones 1–3 etc. | Not sufficient for `transport.productId` | Use exact pinned eligible product ID with city/date/conditions; never map generic labels to cheapest or assumed fares. No Tube price can be inferred from a bus/tram ticket. |
| Transport: monthly amount — absent | `transport: {status:"UNRESOLVED", override:{...}}` or explicit selected product plus override | Add nonnegative household monthly total per side; zero must be explicit. Keep baseline availability visible. |
| Transport: no cost — absent | `{status:"NOT_APPLICABLE", reason:"NO_TRANSPORT_COST"}` | Explicit declaration, distinct from blank/unknown and from a monetary zero. |
| Lifestyle: Low/Typical/Higher | **No production profile model** | Do not assign profile amounts. Adapt the existing selection-card area to explicit own monthly amount / unknown; same visual treatment, truthful supported choices. |
| Lifestyle: own amounts | `spending.lifestyle` | One nonnegative monthly total per side; do not invent category-level models or unspecified sums. |
| Review: Edit links / summaries | Live draft + adapter validation and engine diagnostics | Show values, modes, evidence dates, classifications, unresolved items and edit targets. No “Using estimates” or “Typical” if unsupported. |
| Results: example amounts | No mapping from literal HTML | All result values come from engine results as mapped below. |

### Required date/source inputs absent from the prototype

- `location.effectiveOn` is required even when costs are overridden; it is the date for evaluating source applicability, not necessarily the future move date. Make this distinction explicit.
- `housing.rentSourceMonth` is required by the current scenario schema, including override-only paths. Use an explicitly disclosed selected evidence period; if it is only a source-context selector under an override, say so. Do not synthesize a default bedroom/source month to bypass validation.
- Income `taxYear` is needed for calculated employment; council/Water and income have different effective-year boundaries. Show them separately.
- Pinned transport observations support 14 September 2026 only. Today or a future move date must not be silently replaced by that date to make a ticket resolve. Users can deliberately evaluate recorded evidence or enter a monthly amount.
- Pinned options may be presented as the available release scope and deliberately accepted; they must not masquerade as “latest” evidence or inferred user circumstances.

### Unsafe prototype defaults to remove

Manchester→London; 2 bedrooms/Flat; Band B/D; 2 adults/2 children; default observed-rent radios; 35000/45000 salary; deductions placeholder interpreted as zero; groceries 520/essentials 310; childcare zero; preselected public transport and Hybrid/Regular frequency; generic zones; Typical lifestyle; “8 of 9” and 89%; static review values. “Including lifestyle” must not create a hidden spending assumption.

Prototype JS provides DOM selection, stepper manipulation and localStorage city strings; it is not an input state model. Most controls lack stable field names/IDs and real submitted values. The scripts do not make the static review/result page truthful. Replace their behavior with the boundary below.

## 4. Product/UI architecture contract

```text
form draft → product input adapter → Milestone 2 engine
→ product result composer → UI view model → React presentation
```

Proposed ownership under `src/features/calculator/` (specification only):

| Module | Owns | Must not do |
| --- | --- | --- |
| `contracts/draft.ts` | Explicit per-role form selections, decimal text, unknown/not-entered states, descriptive context, supported-scope confirmation | Treat empty text as 0 or preselect circumstances |
| `adapters/input.ts` | Normalize enum/city IDs, counts and text; map selections/overrides into two `ScenarioInput`s; role+field validation | Calculate bills/tax, infer jurisdiction/provider, manufacture required fields, silently discard malformed overrides |
| `application/evaluate.ts` | Caller-managed immutable evidence loader; `calculateScenario` for each valid side, then `compareScenarios`, `rankCostDrivers`, `solveSalaryPreservation` | Duplicate engine formulas or use prototype numbers |
| `presentation/compose.ts` | Map engine discriminants to truthful labels, visible sections, diagnostics, source references, edit actions, signed formatting and visual scales | Recalculate totals/deltas, net deductions, inverse tax, gross gap or partial preservation estimates |
| `contracts/view-model.ts` | Distinct available/partial/unavailable/N/A views, classification, context and display values | Universal completeness flag or amount=0 sentinel |
| React components | Render approved composition, collect input, handle accessible navigation/focus and responsive layout | Import raw/generated data, engine calculators or perform financial arithmetic |

### Draft and adapter states

The draft needs to distinguish: not entered; explicitly unknown; selected exact source; explicit monthly override; explicitly no transport cost. Use separate semantic discriminants, not blank strings in a numeric schema. Overrides retain amount text and note; clearing an override is explicit. An invalid entered override is an input error, never permission to fall through to source data.

Adapter result per side:

- `READY { scenarioInput }`: structural requirements validate. Optional business selectors may remain absent, so READY does **not** promise resolved money.
- `INCOMPLETE { issues }`: required structural fields such as city, bedrooms, household counts or source/effective dates are missing. Keep the draft and point to fields; do not fabricate a scenario result.
- `INVALID { issues }`: malformed amount/date/selection; preserve entered text and show errors.

An unknown council band must not form a half-valid `councilTax` object: retain the draft's missing selection and omit the optional object, permitting structured engine unresolved output when the rest validates. An empty `income: {}` is valid scenario syntax and lets the engine report unresolved income. An unselected transport cost maps to explicit `status:"UNRESOLVED"`, not N/A.

Evaluate valid sides independently; run comparison/ranking/solver once both side adapters are READY. Until then show input-readiness feedback, not a fabricated comparison. Missing destination gross can still produce valid inputs, complete costs and a successful solver; do not make the old full-input normalizer's mandatory gross/pay-period fields a new product requirement. Use the audited `scenarioInputSchema`/`calculateScenario` path.

Maintain one evaluation revision for the whole result set. After edits, never mix a new draft headline with old totals/solver output. Either synchronously replace the complete evaluation or mark the prior evaluation as stale until the new one is ready. In-memory form state is sufficient initially; don't copy prototype localStorage behavior without a versioned persistence/validation policy.

### View-model contract

Financial cells should be a union, conceptually:

- `AVAILABLE`: engine Money + formatted text, exact direction where relevant, effective classification, source/override details.
- `PARTIAL`: only an engine-provided subtotal/partial residual, explicitly labelled and accompanied by missing categories. Not interchangeable with AVAILABLE complete total.
- `UNAVAILABLE`: reason codes, message and edit/source action; no numeric field.
- `NOT_APPLICABLE`: explicit declaration; no numeric field.

Preserve per-side income status, cost completeness, residual completeness, comparison metric completeness, ranking completeness and solver status independently. UI wording may call UNRESOLVED “Unavailable”, but retain the original engine code/state. Do not reduce all these to a single boolean.

Money remains exact until the composer calls the existing display formatter. Direction uses engine direction, not the rounded text. If a nonzero delta/overshoot rounds to £0.00, label it “less than £0.01” with direction or disclose finer exact detail; do not call it “no change” or “exact match”. Bar lengths and category-count rings are presentation scaling only: keep raw signed values, states and accessible labels. Never use their dimensions/ratios to derive money.

## 5. Results hierarchy and binding map

Follow this hierarchy even where the prototype's literal content differs:

| Priority / approved area | Engine binding | Incomplete/unsupported adaptation in the same visual slot |
| --- | --- | --- |
| 1. Overall move summary | `comparison.householdCostComparison`, `takeHomeComparison`, `residualComparison`, each guarded separately; context from evaluated inputs | If household cost delta unavailable: “Your cost comparison is incomplete.” Mention any independently available take-home change, without claiming an overall residual improvement. No affordable/safe/risky score. |
| 2. Monthly cost change | COMPLETE `householdCostComparison.delta` and direction | No subtraction of subtotals; show missing-cost message and input link. |
| 3. Take-home change; current/new KPI cards | COMPLETE `takeHomeComparison.delta`; per-side RESOLVED `incomeResult.effectiveMonthlyNetIncome` | Available side can still show even when the other side is unavailable; retain USER_ENTERED label when overridden. |
| 4. Amount-left change and destination KPI | COMPLETE `residualComparison.delta`; destination COMPLETE `residual.completeResidualMonthly` | A PARTIAL residual can appear only as “After entered/resolved costs — incomplete”; never as complete “amount left”. No partial residual delta. Negative values stay signed. |
| New monthly spending KPI | Destination COMPLETE `householdCostResult.totalMonthlyCost` | PARTIAL uses `resolvedSubtotalMonthly` only with “Known monthly costs — incomplete” and missing categories. UNRESOLVED has no amount. |
| 5. Monthly cost breakdown | `comparison.categoryComparisons` with original side results; eight canonical categories | Include essentials (missing from HTML table); remove childcare zero row. Show unavailable/N/A labels and category-level explanation, not a bare dash masquerading as zero. No delta unless category COMPLETE. |
| 6. Biggest changes | `rankCostDrivers` lists, original signed delta, classifications and exclusions | PARTIAL: “Biggest changes among comparable costs”; show excluded categories adjacent. UNRESOLVED: no bars. Retain zero/unchanged entries in an accessible list; don't force eight bars into the compact card. |
| 7. Salary preserving current buffer | `SalaryPreservationResult` ELIGIBLE_SOLVED: required gross, achieved net/residual, exact overshoot, scope/lineage | INELIGIBLE: keep navy panel with plain reason and edit action, no amount. NO_SOLUTION_WITHIN_BOUNDS: show operational-bound explanation, no capped salary. |
| Proposed salary/difference inset | Existing destination gross, if available from evaluated employment baseline, can be shown as context | M2 exposes no gross-gap result. Do not calculate the prototype difference in React or composer. Omit the unsupported difference figure; use the inset for supported annual scope/target context. Missing existing gross is not a solver error. |
| 8. Completeness notice/card | Per-side required/resolved/unresolved/N/A category lists and counts | Eight required categories, not nine. Counts are coverage, not confidence/accuracy. Show “7 resolved, 1 not applicable” distinctly. Any ring must use declared counts and label its meaning; never hardcode 89%. |
| Essentials/lifestyle area | Display filter of the existing category view only | No approved essentials subtotal/model. The control may show/hide lifestyle detail with “Display only; totals unchanged”. It must not remove lifestyle from totals/residual/solver. A spending change is an explicit input edit and engine rerun. |
| 9. Assumptions, methodology, sources | Versioned formulas/limitations, effective inputs, evidence/baseline records, compact references and release metadata | Distinguish effective user amount from retained source baseline; never label user-entered groceries as Defra-derived. Show category periods, applicability and source links. No universal “as of” date or financial confidence score. |
| 10. Next actions | Role/category edit routes, new comparison, supported city-context navigation | Use the approved action-card layout. No dead links or implied unimplemented recommendation/download functions. |

The approved hero and side residual card can show the same engine fact for hierarchy; they cannot contradict each other as the prototype's £250/£350 examples do. Source tables need exact category/source attribution. Links come from validated evidence provenance or known application routes, not scraped prototype text.

A complete eight-category budget may still exclude real-world childcare/debt/savings needs. State the model's declared scope in methodology and relevant input screens; do not describe COMPLETE as “all your real expenses included”.

## 6. Accessible and responsive adaptation

These are required adaptations of the approved design, not a restyle:

- Preserve desktop summary/KPI/table+aside/navy-panel hierarchy. At narrow widths stack in that logical reading order; adapt the context inset and KPI grid without reducing availability disclosures.
- Keep comparison column headers and units visible; allow a labelled horizontal table scroll or equivalent accessible stacked rows when necessary. Do not hide unavailable categories to make the table fit.
- Use real labels, stable IDs, fieldsets/legends and radio groups scoped per scenario. Prototype transport radios have no names; correct that. Steppers need “Increase adults”/“Decrease adults” accessible names and explicit values.
- Provide keyboard navigation, focus indication, error summary links, per-field error descriptions and focus movement on step change. Unknown business data is not the same as invalid syntax.
- Section navigation can remain anchor links with correct targets; the prototype includes a `#breakdown` link without a matching section ID. If implemented as actual tabs, provide proper tab semantics and keyboard behavior instead of appearance alone.
- At mobile widths provide a usable navigation menu; the prototype merely hides navigation. Preserve step context rather than only showing an isolated active circle.
- Use text/signs alongside colour, accessible labels for bars/rings, reduced-motion support and decorative empty-alt skyline art. Check contrast at implementation time; no unmeasured accessibility-compliance claim is made by this handoff.

## 7. Acceptance gates for implementation

First implement and test the pure product boundary; then build presentation against those real view models.

1. Adapter tests: blank versus zero; invalid overrides never fall through; unknown council selection; explicit city/jurisdiction/category/scope/date; property-type source incompatibility; source override choices; no inferred ages/headcount costs; destination gross absent.
2. Composer tests: all eight M2 acceptance cases, plus invalid draft, source date mismatch, N/A versus zero, no-solution salary, destination override conflict and subpenny signed deltas.
3. Snapshot/view assertions must use engine-calculated fixtures, not screenshot financial figures. Assertions focus on amount availability, labels, source attribution, excluded rows and edit actions.
4. Architecture checks keep data access/financial computation outside React and outside HTML scripts. No tax formulas, gross-gap subtraction, household sums or salary inversion in UI code.
5. Visual verification at the approved desktop composition and narrow/mobile widths; compare layout/type/card/navigation fidelity with the image. Separately verify keyboard/focus/error behavior and long/missing-data content.
6. Retain M2 tests and generated-evidence preservation checks. No models or additional financial categories enter this slice by implication.

### Recommended next implementation slice

Implement `draft → input adapter → engine orchestration → result composer → view-model` with focused tests against the existing acceptance fixtures. Then implement the approved React journey and results composition. This document does not claim those runtime modules or screens already exist.

## Source inventory

Approved image: `/Users/leanne/Downloads/ChatGPT Image Sep 15, 2026 at 02_19_01 PM.png`.

Prototype root: `/Users/leanne/Downloads/uk-money-reality-html-prototype-styled/`.

Reviewed primary files: `calculator-home.html`, `calculator-household.html`, `calculator-income.html`, `calculator-spending.html`, `calculator-transport.html`, `calculator-lifestyle.html`, `review.html`, `results.html`. Supporting context: `README.txt`; additionally inspected `calculator.html` to resolve the entry/city-selection links. These local references have not been copied into production assets or treated as distributable font/image sources.
