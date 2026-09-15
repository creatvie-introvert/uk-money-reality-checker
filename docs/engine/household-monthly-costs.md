# Slice 3: household monthly costs

## Scope and starting state

Implemented on `rebuild/next-production` from `0dedc7e2ceb00e75ad3286ef7503326a4b6aaa13` (Build Milestone 2 income tax and NI engine). Live origin and the local tracking branch matched, 0 ahead / 0 behind. The raw v3.1 workbook was the only untracked starting file. No evidence, UI, dependency or income arithmetic changes are part of this slice.

The public API is `calculateHouseholdMonthlyCosts(context)`, using the existing normalized `CategoryCalculatorContext`. It calculates one scenario. `calculateMonthlyCostCategory(context, category)` provides the same individual results as the category registry. `aggregateHouseholdMonthlyCosts(context, results)` sums a complete, unique set of typed category results for that city. No function reads income amounts or calculates residual income, comparison, rankings, affordability or salary preservation.

## Categories and requirements

The fixed required set is rent, council_tax, energy, water, groceries, essentials, lifestyle and transport. Income tax and NI remain deductions within the income engine. The older `household_spending` reference-family stub is retained for compatibility but is **never included** alongside essentials/lifestyle in the household cost set.

Every required category must resolve or have an explicitly supported not-applicable declaration before the result is complete. Only transport currently supports `NOT_APPLICABLE`, through `{ status: "NOT_APPLICABLE", reason: "NO_TRANSPORT_COST" }`. Missing data never supplies that declaration. Housing tenure, exemptions and other applicability paths are not invented.

“Complete” describes resolution of this declared eight-category scope, not verification that user-entered spending is accurate or exhaustive. Overrides are household monthly amounts; they must exclude costs already entered in the other categories. A selected transport ticket represents one chosen adult product, not a headcount-based household travel budget. Additional household travel requires an explicit monthly override.

## Category result contract

`MonthlyCostResult` is a discriminated union with:

- Category, city, status, input used, limitations and structured diagnostics.
- Baseline evidence, record lineage, source IDs and source periods in every state.
- `monthlyAmount` and production classification only for `RESOLVED`.
- `resolutionSource`: `EVIDENCE`, `USER_OVERRIDE` or `CALCULATED_FROM_EVIDENCE` for resolved costs; `NOT_APPLICABLE` for explicit no-cost applicability; absent when unresolved.
- Effective input: observed records, an explicit monthly user amount, or the no-transport declaration.
- Formula/version for a derived monthly amount.
- `canResolveWithUserInput` for explanation and future input flows.

A production `MODEL` resolution source is intentionally not admitted yet. Development frequency profiles and MODELLED_ESTIMATE ancestry cannot enter this production subtotal. Classification is descriptive lineage, not a confidence score.

`baselineEvidence.status = AVAILABLE` means a supported monthly calculation has source evidence. `UNAVAILABLE` can retain reference records: for example national grocery evidence is available for inspection but does not establish a usable household monthly baseline. A resolved override may therefore legitimately retain an unavailable baseline and its original blocking diagnostic. Effective-result diagnostics downgrade that baseline gap to a warning.

## Override precedence and zero handling

Precedence is unchanged: valid explicit monthly override → exact supported evidence/calculation → unresolved. No baseline fact is mutated or fabricated. An invalid override fails validation rather than silently falling back to evidence.

| Category | Input | Explicit £0 allowed? |
| --- | --- | --- |
| Rent | `housing.overrides.rent` | No; supported tenure/free-rent semantics are absent |
| Council tax | `housing.overrides.councilTax` | No; exemption semantics are absent |
| Energy / water | `housing.overrides.energy` / `.water` | No; exempt/included-in-rent semantics are absent |
| Groceries | `spending.groceries` | No; zero household-provision semantics are absent |
| Essentials / lifestyle | `spending.essentials` / `.lifestyle` | Yes; explicit declared zero expenditure |
| Transport | `transport.override` on UNRESOLVED or SELECTED selection | Yes; explicit declared zero expenditure |

All overrides use `{ amountGbp: "123.45", period: "MONTHLY", note?: "..." }`. Zero remains `RESOLVED / USER_ENTERED`; it is distinct from `NOT_APPLICABLE`. A no-transport declaration cannot coexist with a selected product, override or frequency profile.

Transport input validation permits a valid override when its selected baseline product is unavailable, wrong-city or outside the recorded date. The category preserves that baseline failure as a warning. Without an override, the existing full-input validator rejects invalid selections; a direct typed category call reports the unsupported selection as unresolved. Malformed direct category inputs throw ZodError, consistent with existing housing resolver contracts; normal application callers use `normalizeCalculatorInput` first.

## Resolution by category

### Rent

Uses the existing city/bedroom/source-month resolver without period conversion. Source rent is `OBSERVED_DATA`, override rent is `USER_ENTERED`. London keeps ONS region E12000007; Glasgow keeps Greater Glasgow S33000009. Edinburgh stays unresolved without an override. Bedroom/property cross-tabs, nearby places, alternative years and national averages are not substituted.

### Council tax

An explicit supported authority/band/date selects the annual source charge. Monthly equivalent is exact annual / 12 and is `CALCULATED`. Authority, band, displayed annual source amount and provenance remain in lineage. London without a borough remains unresolved unless overridden; no borough average is used. Scottish council-tax charges and Scottish water charges remain separate. Discounts, exemptions, parish/address applicability and instalment schedules are not calculated.

Housing implementations were moved unchanged into `calculators/housing.ts`, shared by the public housing functions and household registry, avoiding a runtime circular dependency.

### Water

An explicit Scottish selection is supported for Edinburgh and Glasgow:

```ts
housing: {
  // Other existing housing fields remain required.
  water: {
    billingRegime: "council_tax_band",
    band: "D",
    connectedServices: "combined" // or "clean_water" / "wastewater"
  }
}
```

This declares an unmetered Scottish household and its actual connected services. If a council-tax band is supplied, the two bands must agree. Exactly one Scottish Water record must match service, band, annual unit, standard variant, aggregation role and evidence date. The combined published total is an alternative to the components: it is never added to them. Band D combined £652.32/year becomes £54.36/month. Single-service selections use the corresponding observed charge only. The result is before eligible reductions and is a mathematical equivalent, not an instalment schedule.

Missing Scottish selectors remain unresolved. English tariff evidence without usage, provider/regime and service applicability never becomes a household bill. Birmingham keeps its explicit zone/drainage applicability gap. Bristol's split-provider tariffs do not become a complete monthly bill. Any valid positive monthly water override can resolve the effective amount.

These boundaries and the annual anchor come from the pinned [M1 water methodology](../data/production-water.md) and loaded Scottish Water records; no new live rate or address-default claim is introduced.

### Energy

Default `ENERGY_MODEL_REQUIRED`. No NEED profile selection, household consumption model, city-to-Ofgem region mapping or automatic tariff arithmetic. A valid monthly override resolves the amount. No national or regional evidence is presented as an applicable baseline bill.

### Groceries, essentials and lifestyle

Default `GROCERIES_MODEL_REQUIRED` / `SPENDING_MODEL_REQUIRED`. National Defra and ONS reference records remain visible as unsuitable baseline references. Household size never multiplies them; OECD equivalence and COICOP category mapping are not used. Explicit monthly entries resolve each category independently. There is no extra aggregate `household_spending` cost line.

### Transport

No default product is selected in any city. Exact product ID, city and evidence date must match. Only purchased weekly, monthly or annual tickets with matching source validity periods admit deterministic normalization. The current pinned release contains seven supported weekly tickets and one annual ticket; the monthly branch is ready for a source-supported monthly record but makes no claim that this release contains one.

- Weekly ticket: amount × 52 / 12, not × 4.
- Annual ticket: amount / 12.
- Published monthly ticket: unchanged source monthly price.
- Caps, daily/journey fares and DEV_ONLY frequency profiles: unresolved monthly spending.

A selected ticket's source price remains observed; its annual/weekly monthly equivalent is calculated. Conditions, network, modes, passenger, payment, exclusions and date limitations remain available. There is no route-eligibility determination, household multiplier, extra-fare/card-fee allocation, cap simulation or cheapest-product selection. Overrides can cover actual household transport spending.

Transport fare evidence is bounded to its verified as-of date, 14 September 2026. Ticket duration does not extend that price-evidence interval. A later scenario date requires an evidence refresh or override. These rules preserve the [M1 transport methodology](../data/production-transport.md).

## Exact aggregation and completeness

All arithmetic uses the existing BigInt rational-pence layer. No new money implementation, display rounding, 30-day assumption or consumption model is introduced. `resolvedSubtotalMonthly` sums **only RESOLVED amounts**, including explicitly entered zero.

| Completeness | Rule | Monetary output |
| --- | --- | --- |
| COMPLETE | At least one amount resolves; every category resolves or is explicitly N/A | `resolvedSubtotalMonthly` and `totalMonthlyCost` |
| PARTIAL | At least one amount resolves; at least one remains unresolved | `resolvedSubtotalMonthly` only |
| UNRESOLVED | No amount resolves | Neither subtotal nor total |

Only transport can be N/A in this version, so a complete all-N/A scenario cannot arise. N/A alone does not fabricate a zero subtotal.

The contract includes required/included/unresolved/not-applicable category lists and all four category counts. Required count is always eight; resolved + unresolved + not applicable = eight. A `totalMonthlyCost` field is impossible in the PARTIAL/UNRESOLVED TypeScript variants. No completion fraction, confidence score or affordability score is emitted.

Aggregation rejects missing, duplicate, unknown or mixed-city category sets, negative amounts and modelled classifications/ancestry. Unresolved/N/A results cannot carry amounts. `LocationResult.monthlyTotals.expenditure` now uses this richer household contract, while the future net-income boundary retains its previous total contract. Full two-location orchestration and residual calculations remain unimplemented.

### Worked partial example

Manchester, two-bedroom July 2026 rent, declared Manchester Band D council tax, user groceries £300/month:

| Category | Resolution | Monthly amount |
| --- | --- | --- |
| Rent | Observed source | £1,227.00 |
| Council tax | £2,312.04 annual / 12 | £192.67 |
| Groceries | User entered | £300.00 |
| Energy | Model required | Unresolved |
| Water | Usage/applicability required | Unresolved |
| Essentials / lifestyle / transport | Missing declarations/selections | Unresolved |

**Resolved subtotal: £1,719.67; completeness: PARTIAL.** Three categories resolve and five remain unresolved. This is not a complete household cost. The brief's £1,500 rent + £170 council tax + £55 water example similarly produces a £1,725 partial subtotal.

## Diagnostics and provenance

Added codes: `HOUSEHOLD_COST_PARTIAL`, `HOUSEHOLD_COST_UNRESOLVED`, `ENERGY_MODEL_REQUIRED`, `GROCERIES_MODEL_REQUIRED`, `SPENDING_MODEL_REQUIRED`, `WATER_USAGE_REQUIRED`, `WATER_SELECTION_CONFLICT`, `TRANSPORT_PERIOD_UNSUPPORTED`, `TRANSPORT_FREQUENCY_MODEL_UNSUPPORTED`, `TRANSPORT_NOT_APPLICABLE`. Existing Edinburgh, London, Birmingham, water applicability, exact evidence, product-selection and override codes are reused.

Category diagnostics carry category, city, severity and user-input resolvability. Aggregate diagnostics describe partial/no-subtotal state. All immutable source records retain their original provenance, snapshot IDs, source periods and qualifications. The household result carries the active loader release metadata. No source documents or new evidence facts are copied into generated data.

## Tests and remaining work

The household tests exercise housing geography and overrides, annual council tax, all eight Scottish water bands and alternative components, missing/conflicting/stale/ambiguous evidence, English/Birmingham water gaps, no energy model, no household spending multiplication, all-city transport defaults, selected tickets versus caps, DEV_ONLY rejection, category-specific zero rules, explicit N/A, all completeness states, exact rational sums, provenance, immutability and registry parity.

Remaining requirements include approved energy applicability/consumption, metered water usage/service applicability, grocery household profiles, Essentials/Lifestyle category membership, transport household coverage and richer applicability/eligibility handling. User inputs can resolve present amounts; they do not establish those missing models.

Recommended next slice: single-scenario result orchestration and effective net-income override handling, with explicit complete/partial cost compatibility and duplicate-category safeguards. Keep comparison, residual analysis and salary preservation in their planned milestone.

## Validation result

All required checks passed: `npm run lint`, `npm run typecheck`, `npm test` (690 tests across 14 files), `npm run build`, `npm run data:verify` and `git diff --check`. The targeted engine suite passed 213 tests, including all 69 new household cases and all 86 income cases. Existing foundation tests were unchanged and passed.

M1 verification reconciled all 32 artifacts, 1,191 observed rows and 80 coverage cells. Every generated artifact matched its starting SHA-256 hash. The raw workbook stayed unchanged and untracked, SHA-256 `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`. The rent/council-tax function bodies were verified byte-identical after extraction into their shared module. Build-generated `next-env.d.ts` changes were restored and typecheck passed again. No generated data, raw/controlled evidence, income arithmetic, UI or dependency changes were made. No commit was made.
