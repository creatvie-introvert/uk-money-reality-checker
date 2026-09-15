# Milestone 2: calculator engine architecture and core contracts

## Slice 5 update

`compareScenarios(current, destination)` now consumes two independently evaluated scenario results. It compares effective monthly take-home, complete household costs and complete residuals, always destination minus current, and exposes unranked category deltas. Incomplete total/residual metrics retain side context with no delta. See [scenario comparison](scenario-comparison.md) for completeness, N/A, lineage and diagnostic policies. The kickoff ComparisonEngine placeholder now takes two scenario results. No ranking, solver, UI or new evidence model is implemented.

Earlier statements deferring scenario comparison are historical and are superseded by Slice 5. Prior calculators and evidence remain unchanged.

## Slice 4 update

`calculateScenario(evidence, input)` now evaluates one `{ household, location }` request, resolves effective monthly net income, preserves the employment baseline and composes household costs with a discriminated complete/partial/unresolved residual. Net-only income is supported without fabricated gross salary; explicit zero net overrides are valid. See [scenario calculation](scenario-calculation.md) for contracts, diagnostics, examples and mixed-source-period lineage. The household context no longer requires income fields; existing normalized category contexts remain compatible. No comparison or salary solver is implemented.

The prior slice snapshots below are historical. Statements deferring effective net-income overrides and single-scenario residuals are superseded by Slice 4; their underlying income and household arithmetic remains unchanged.

## Slice 3 update

The household monthly-cost layer now resolves eight required categories and emits COMPLETE, PARTIAL or UNRESOLVED with exact subtotals. See [household monthly costs](household-monthly-costs.md) for input additions, override/zero policies, Scottish water, explicit period-ticket transport, provenance and completeness contracts. `LocationResult.monthlyTotals.expenditure` uses `HouseholdMonthlyCosts`; only COMPLETE exposes `totalMonthlyCost`. The registry includes essentials/lifestyle individually; the legacy household_spending stub never enters household aggregation. No UI, comparison, residual or salary solver is implemented.

The historical sections below describe their original slice. Their deferred override and aggregation statements are superseded by the Slice 3 document; income scope is described by Slice 2.

## Slice 2 update

Income tax, category-A annual employee NI and standalone net employment income are now implemented. See [income tax and NI](income-tax-ni.md) for contracts, source-reviewed rounding, band conversion, diagnostics and tests. The scenario now requires `income.calculationBasis: "ANNUAL_COMPARISON"`. The category registry has four implemented calculators and five remaining stubs. Net override application and household aggregation remain deferred. New standalone income APIs return structured validation diagnostics rather than throwing for invalid business input.

The sections below preserve the committed kickoff architecture and its validation snapshot; statements about tax/NI stubs and future statutory rounding describe that earlier slice and are superseded by the income document.

## Scope and starting state

Kickoff reviewed on 15 September 2026. Branch `rebuild/next-production`, starting commit `b9a3f82ea9d5620da3c0d95fcc2e369d2ba0e326` (Close Milestone 1 data foundation), matched live origin and local tracking reference (0 ahead / 0 behind). The raw v3.1 workbook was the only untracked file.

- **Milestone 1:** audited evidence, classification, provenance, ingestion, release gates and explicit coverage gaps.
- **Milestone 2:** pure calculator contracts, evidence loading/resolution, exact monetary representation and category arithmetic in incremental slices.
- **Milestone 3:** comparison, cost drivers and salary-preservation logic.

This kickoff implements generated-data loading, input normalization, rent resolution, explicit authority/band council-tax resolution and a mathematical monthly equivalent, plus tax/NI reference-table selection. It does not calculate tax, NI, household totals, full water/energy/spending/transport bills or comparisons. The full-result and comparison boundaries are contracts, not fabricated populated reports. There is no UI integration.

## Engine boundary

```text
generated versioned evidence
  → loaders (schema + active release + full pinned payload validation)
  → input validation / normalization + exact evidence resolution
  → pure category calculators
  → [later] household monthly totals
  → [M3] comparison
  → typed results and structured diagnostics
```

`src/engine/index.ts` is the public entry point. `contracts/`, `loaders/`, `resolution/`, `calculators/`, `diagnostics/`, `money/` and `comparison/` separate responsibilities. Input validation may check a selected product against the loader; resolution uses normalized selections. Neither needs React, browser state, filesystem access, network requests or the current clock. Dates are explicit inputs.

React components must receive inputs/results through this boundary. They must not read artifacts, choose source data, calculate tax/NI, convert periods, apply household models or supply fallback values. The dependency test follows transitive engine imports and checks existing UI source imports. No data ingestion barrel is imported: it would transitively load controlled sources.

## Loader and trust boundary

`createEvidenceLoader()` validates all ten active observed evidence datasets. Data paths are centralized in `loaders/datasets.ts`; calculators never know them. The loader exposes:

- `getRentEvidence`: exact city index, bedroom band and source month.
- `getCouncilTaxEvidence`: exact city, authority name, optional matching authority code, band and effective date.
- `getTaxReference` / `getNiReference`: explicit jurisdiction/year or category/pay period/year.
- `getWaterEvidence`: provider-specific candidate components, not an address/default tariff resolution.
- `getEnergyPriceEvidence`: explicitly supplied source region and date; never a city-to-region guess.
- `getEnergyConsumptionInputs`, `getGroceryReference`, `getHouseholdSpendingReference`: source references only; no household applicability inferred.
- `getTransportProducts`: city-indexed conditional products within their evidence date; no eligibility guarantee or recommended/default fare.

Query methods return exact matching records or an empty candidate list. The resolution layer turns a missing selection into a structured UNRESOLVED result; no empty list is treated as a zero amount.

Validation first applies M1 artifact schemas and then checks expected kind, release ID, schema version, category, count and OBSERVED_DATA classification. It also compares **every field** of the supplied payload to the pinned generated artifact, including raw fields that a permissive Zod schema might strip, provenance, ordering and source amounts. Object-key ordering is immaterial. The optional injected artifact map is complete: a missing dataset fails rather than falling back to bundled data.

The existing M1 category validators import controlled extracts. They remain build-time evidence validators; the engine does not import them. The loader instead accepts only the complete generated payload audited into the active build. This is not a new source authentication system: a deliberate change to bundled evidence requires M1 `data:verify`, source review and release-registry review. Loader tests reject schema-valid altered money/provenance and duplicate records.

Parsed payloads are detached before being deeply frozen, so the loader neither mutates nor freezes caller-owned objects. Exposed records and nested provenance are immutable at runtime and readonly in TypeScript. Artifact failures throw `EvidenceLoadError` with an `INVALID_ARTIFACT` or `INCOMPATIBLE_DATA_RELEASE` blocking diagnostic; these configuration errors must not be displayed as ordinary missing evidence.

Calculated M1 derivative artifacts are not active calculator inputs in this kickoff. They remain verified by M1. The engine works from observed source quantities and exact rational conversion helpers, avoiding re-accumulation of binary floating-point monthly derivatives.

## Active dataset releases

Registry identifier: `m2-kickoff-m1-20260914-v1`. It names a bundle, not a universal source/effective date. Metadata exposes each manifest and source-period label.

| Dataset | Active release | Schema | Period / scope |
| --- | --- | --- | --- |
| Tax | ukmr-income-tax-2026-27-v1 | 1.1.0 | 2026/27, rUK and Scotland |
| NI | ukmr-national-insurance-2026-27-v1 | 1.1.0 | 2026/27, employee Class 1 A, weekly/monthly/annual |
| Council tax | ukmr-council-tax-2026-27-v1 | 1.2.0 | 2026/27 charge year; seven authorities |
| Rent | ukmr-rent-2026-07-v1 | 1.3.0 | July 2026; seven source geographies |
| NEED | ukmr-need-2024-v1 | 1.4.0 | Selected 2024 source profiles |
| Ofgem | ukmr-ofgem-2026-q3-v1 | 1.4.0 | July–September 2026; regions |
| Water | ukmr-water-2026-27-v1 | 1.5.0 | 2026/27; selected provider components |
| Groceries | ukmr-groceries-fye2024-v1 | 1.6.0 | FYE 2024 national per-person evidence |
| Household spending | ukmr-household-spending-fye2025-v1 | 1.6.0 | FYE 2025 national all-households evidence |
| Transport | ukmr-transport-2026-09-v1 | 1.7.0 | Selected adult products, verified 14 September 2026 |

No latest-date selection or version range is inferred. Transport same-day bounds are respected: a product known to the registry is not a valid selected input for 15 September simply because it was reviewed on the 14th. Tax jurisdiction is explicitly declared; city is not a substitute for tax-residency methodology.

## Monetary precision

The single internal monetary type is **exact rational pence**:

```ts
{ currency: "GBP", unit: "pence", numerator: "1300", denominator: "3" }
```

This represents £1/week × 52 / 12 as 1300/3 pence. Whole-penny values have denominator 1; fractional pennies and source subpenny precision are preserved. Arithmetic converts the integer strings to BigInt, operates on integer fractions and reduces by the greatest common divisor. This avoids both accumulated binary floating-point error and premature rounding to whole pence. No new decimal-library dependency is needed. String fields keep outputs JSON-safe; no BigInt values cross the serialized result boundary.

`fromGbp` accepts decimal text, not JavaScript-number arithmetic, currency separators or exponent notation. User money fields accept decimal strings with at most two places. Negative salary and non-positive overrides are rejected. Salary zero is permitted. Zero-cost / not-applicable category policy is deferred; missing evidence never supplies that zero. Counts are safe integers; an adult-led household requires at least one adult. Subpenny source inputs can be represented by `fromGbp` without truncation. Current rent uses the published whole-pound number's decimal text; council tax uses retained `qa.displayedAnnualGbp` directly.

`addMoney` and rational multiplication never round. `formatGbp` is the explicitly documented display boundary: nearest penny, half away from zero, two decimal places. It returns decimal text without localization. This is **not an HMRC calculation/rounding policy**; statutory tax/NI boundaries will be established in the next slice. Do not feed displayed strings back into calculations.

## Period normalization

- WEEKLY → mathematical monthly equivalent: × 52 / 12, never × 4.
- ANNUAL → mathematical monthly equivalent: / 12.
- MONTHLY → unchanged exact amount.
- DAILY → no generic monthly-equivalent conversion. `monthlyEquivalent` rejects it.

`dailyChargeForPeriod` requires validated start/end dates, counts both endpoints using UTC calendar days and returns the cost of **that explicit billing interval**. Leap years are respected. It does not assume 30 days or 365/12 and does not call its result a monthly amount. All date inputs are deterministic and caller-supplied.

The council-tax proof labels /12 as `MATHEMATICAL_MONTHLY_EQUIVALENT`; it is not a ten-instalment schedule or a household liability after exemptions/discounts.

## Core input contract

`calculatorInputSchema` is strict Zod validation. `normalizeCalculatorInput(raw, loader)` returns VALID with normalized input or INVALID with path-addressed diagnostics. It never clamps or silently removes unknown fields.

The contract has a shared household and **separate current/destination scenarios**:

- Household: adults, children, optional individual child ages (0–17); if provided, ages must account for every child. No age-group or household-weight model is inferred.
- Location: known MVP city ID and explicit effective date.
- Housing: required bedrooms 1, 2, 3 or 4 (4 denotes the source's **four-or-more band**), explicit rent source month, optional source property type, explicit council authority/name/code/band selection, and separately named rent/council/water/energy monthly overrides.
- Income: decimal-text gross annual salary and explicit `ONE_EMPLOYEE_ONE_EMPLOYMENT` scope, tax year, optional declared jurisdiction, NI category letter and pay period. This does not claim that one salary represents every adult. Additional employment/income types require future contracts.
- `netMonthlyIncomeOverride`: explicitly net monthly income. It is separate from gross salary and cannot replace tax references; implementation is deferred with net-income calculation.
- Transport: explicit UNRESOLVED or SELECTED product ID. Selection is validated against active products, city and evidence date. Optional caller-chosen frequency is explicitly MODELLED_ESTIMATE / DEV_ONLY and is not used in arithmetic. Product selection still does not establish route, passenger or payment eligibility.
- Spending: optional grocery, essentials and lifestyle monthly entries. They are distinct user inputs; no unapproved category membership or national-to-household conversion is introduced.

Monthly overrides contain `{ amountGbp, period: "MONTHLY", note? }`. They are positive, user-entered values. Water/energy/spending and net-income override fields reserve semantics for later implementations; their calculator stubs remain explicitly unimplemented in this slice, even when those fields are present.

Unknown MVP cities, unsupported bedrooms, malformed authority/category fields, unknown overrides, negative counts/money, invalid child ages and invalid/stale/wrong-city product selections are rejected. An unknown but syntactically valid council authority produces UNRESOLVED rather than being mapped to another authority. A valid but unsupported NI category remains unresolved, never coerced to A.

## Evidence resolution and overrides

The locked precedence is:

1. Valid user monthly override.
2. Exact supported source evidence.
3. Structured UNRESOLVED.

There are no further steps. `noFallbackPolicy` publishes this policy; tests exercise the behavior. Resolution results discriminate RESOLVED, USER_OVERRIDE and UNRESOLVED. Every result retains category, consumer city, baseline evidence, diagnostics and limitations. An unresolved result carries `sourceCandidates` and `canResolveWithUserInput`, not null or zero.

A USER_OVERRIDE result retains both:

- `baselineEvidence`: AVAILABLE immutable source records, or UNAVAILABLE with its original blocking diagnostics.
- `effectiveInput`: exact user-entered monthly amount with USER_ENTERED classification and optional note.

For a resolved override, top-level baseline-gap diagnostics become warnings, while the baseline object preserves the original unresolved reason. USER_OVERRIDE_APPLIED explains the effective selection. Missing baseline evidence is never fabricated. Invalid overrides are rejected even if exact source evidence is present; they do not silently fall through to the source amount.

Public standalone resolver/calculator requests are Zod-validated and throw ZodError for contract-invalid inputs. Valid but unsupported source combinations return structured UNRESOLVED. The full user-input boundary converts validation errors to diagnostics before consumers call the category interfaces.

### Implemented proof categories

**Rent:** exact city + bedroom band + selected source month. London remains ONS region E12000007. Glasgow retains consumer LOC-GLA and source **Greater Glasgow S33000009**, with the original geography relationship in QA. Edinburgh remains unresolved. Supplying a property type with bedrooms returns unsupported cross-tab rather than ignoring that requested dimension. The published monthly amount stays OBSERVED_DATA; an override is USER_ENTERED with baseline lineage retained.

**Council tax:** explicit authority and band plus city/effective-date consistency. Scotland also uses explicit source authority names; unverified codes are not invented. London without authority is unresolved; the pinned release contains no supported London borough, so specifying one does not conjure borough evidence. Other cities also require an explicit authority selection. The result is an unadjusted annual-charge /12 equivalent, CALCULATED with OBSERVED_DATA ancestry. User-entered actual monthly council tax supersedes only the effective input.

**Tax/NI:** resolve explicit reference tables without calculating liability. Scottish tax includes the source-linked allowance records and Scottish bands. NI resolves the declared pay period within Class 1 A; unsupported categories/years remain unresolved. Full income tax, employee NI, net pay and salary preservation are not implemented.

## Outputs and diagnostics

TypeScript discriminated contracts prevent unresolved categories/totals from carrying a monetary amount:

- `CategoryResult`: RESOLVED, UNRESOLVED, or NOT_APPLICABLE. Only RESOLVED has `monthlyAmount`. NOT_APPLICABLE requires an explicit reason and has no amount; no calculator currently fabricates this state.
- Resolved results include classification, lineage classifications, immutable source records (containing source references, geography, effective period and provenance), baseline evidence, override status, input used, limitations and a versioned formula when calculated.
- `LocationResult`: category results, expenditure/net-income monthly total states, diagnostics and unresolved category list.
- `CalculationResult`: current and destination location results, diagnostics and complete active data-release metadata. Category results, totals and unresolved lists are nested per location to prevent mixing the two scenarios.
- `MonthlyTotal`: RESOLVED with amount/included categories or UNRESOLVED with missing category list. No partial sum may be exposed as a complete household budget. Aggregation is not implemented here.

Lineage never disappears when arithmetic changes the result classification. Rent remains OBSERVED_DATA; council /12 is CALCULATED with observed ancestry; overridden values are USER_ENTERED with observed baseline lineage when available. Future model outputs must retain MODELLED_ESTIMATE ancestry even if later arithmetic is deterministic.

`Diagnostic` has a validated stable code, info/warning/blocking severity, machine-readable kind, optional category/city/input path and a human-readable message. Codes include the M1 Edinburgh, London, energy, Birmingham water, household-model and transport-default gaps, plus input/artifact/product validation and unsupported-calculator codes. Financial behavior must not depend on parsing message text.

## Known gaps and roadmap

| Category | This slice | Next work / limitation |
| --- | --- | --- |
| Income tax | Reference selection + explicit arithmetic stub | Tax basis, allowance/taper, Scottish/rUK bands, legal rounding policy |
| NI | Class 1 A table selection + explicit arithmetic stub | Pay-period calculation and supported employment scope |
| Rent | Exact resolution + observed monthly amount/override | No Edinburgh substitute; no bedroom/property cross-model |
| Council tax | Explicit authority/band + mathematical /12/override | Household discounts, exemptions, address/parish applicability, instalments |
| Energy | Candidate loader + unresolved calculator | City-to-Ofgem applicability, date/payment/tariff selection, NEED household model |
| Water | Candidate provider loader + unresolved calculator | Birmingham zone/drainage; arbitrary-address provider/regime selection; Bristol non-metered wastewater gaps |
| Groceries | National reference loader + unresolved calculator | Approved household methodology or explicitly supported user-amount path |
| Household spending | National reference loader + unresolved calculator | Essentials/Lifestyle membership and double-count prevention; no household model |
| Transport | Date-qualified product lookup + unresolved calculator | Route/product eligibility, chosen usage and any approved optimization; every default unresolved |

`CategoryCalculators` defines the pure function interface for all nine categories. The exported registry wires the two proof calculators and seven explicit stubs. Stubs retain the supplied scenario for explanation but emit no monetary amount. They do not consume national references as budgets or apply input overrides prematurely. `comparison/` contains only a future interface; there is no comparison algorithm, cost-driver ranking or salary-needed solver.

Recommended next slice: **income tax + employee NI + net-income calculation**, including supported tax/NI scope, exact threshold/basis semantics, statutory rounding, effective-date/jurisdiction handling, reference lineage and boundary tests. Multi-employment/household income aggregation, zero-cost applicability, approved expense aggregation membership and model assumptions remain later decisions. None blocks this kickoff's narrow proof; they must not be guessed during implementation.

## Usage

```ts
import { createEvidenceLoader, normalizeCalculatorInput, categoryCalculators } from "@/engine";

const evidence = createEvidenceLoader();
const validation = normalizeCalculatorInput(userInput, evidence);
if (validation.status === "VALID") {
  const context = {
    household: validation.input.household,
    location: validation.input.currentLocation,
    evidence,
  };
  const rent = categoryCalculators.rent(context);
  // Inspect rent.status before accessing rent.monthlyAmount.
  // Retain rent.evidenceLineage and evidence.metadata with a future report.
}
```

The caller controls loader lifetime; there is no mutable singleton or implicit cache. Run pure category functions only after validating their declared inputs. A later full-engine orchestrator will assemble `CalculationResult`; this kickoff does not pretend unsupported categories or totals have been calculated.

## Validation and preservation

Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run data:verify`, `git diff --check`. No additional dependency or dedicated test script was needed; engine tests run in the existing Vitest suite.

Tests cover all active artifact contracts and tampering, generated-only transitive imports, immutability, exact fractional-penny arithmetic, calendar-day billing, input validation, product dates/cities, geography preservation, all seven supported rent cities, explicit council selection, override baseline preservation, reference selection, classifications and unresolved stubs. M1's generated-byte verification continues to run unchanged.

Final result: all validation commands passed; 537 tests across 12 files, including 60 new engine cases. All 32 M1 generated files matched their starting hashes. The raw workbook remains unchanged and untracked (SHA-256 `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`). No generated/controlled evidence, application UI, package dependency or tax arithmetic was changed. No commit or push was made.
