# Slice 3: production tax and NI references

This slice provides offline, reproducible 2026/27 reference ingestion. Income Tax and employee Class 1 NI are `REFERENCE_ONLY`: they are statutory reference inputs for later methodology, not observed household costs or calculated liabilities. `OBSERVED_DATA` identifies values transcribed from official publications; it does not classify a person's tax payment. No direct-evidence artifact, calculator, UI or runtime source loader is implemented.

## Source verification and capture

The three approved source identities were inspected on 14 September 2026:

- [SRC-011: HMRC Income Tax rates and allowances](https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past): Personal Allowance and taper rules for both jurisdictions.
- [Supporting HMRC current-rates and allowances guidance](https://www.gov.uk/income-tax-rates/current-rates-and-allowances): linked from the approved HMRC employer guidance, retained under SRC-011 as a separate snapshot. Supplies the explicitly stated zero-allowance point and rUK income-band illustrations. The primary HMRC table labels bands after allowances and says “Over £125,141”; the supporting guide supplies income bands assuming the standard allowance and an additional-rate boundary above £125,140. The extract explicitly uses the supporting guide's values and basis; it does not silently repair the primary table or derive new thresholds.
- [SRC-013: Scottish Government, 2026 to 2027 rates and bands](https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/pages/2026-to-2027/): six Scottish income bands. The page still calls them proposed at capture and is retained as Scottish policy provenance. Current operational confirmation is supplied by [GOV.UK Income Tax in Scotland: Current rates](https://www.gov.uk/scottish-income-tax), which matches all six generated bands, and the Scottish top-rate entry in HMRC employer guidance. The policy page is not used alone as final operational confirmation. HMRC supplies the separate Scottish allowance rules.
- [SRC-012: HMRC Rates and thresholds for employers 2026 to 2027](https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027): Class 1 threshold table and employee category A rate row. The previously unresolved URL is now verified.

Four JSON files in `src/data/controlled/2026-27/` are explicitly labelled **UKMR-controlled extracts**, not official files, HTML snapshots or API responses. Each embeds a Slice 2 `METADATA_ONLY` HTML snapshot with its canonical URL/reference, actual verification timestamp, source ID and non-retention reason. Original HTML was viewed through browser retrieval and not saved in Git. No checksum of unavailable original HTML is claimed. The retained JSON provides deterministic reproduction of the reviewed transcription, not byte-level proof of the original web page. No publication dates or new licence claims were inferred; existing catalogue licence references remain attributed to Batch 4.

`retrievedAt` records the capture session; `importedAt` is the fixed logical import timestamp for version 1. Neither is the publication date or tax effective date. Effective dates are 6 April 2026 through 5 April 2027 inclusive. Rebuilding does not claim a fresh retrieval: timestamps stay fixed, and source refreshes require a new reviewed capture/version.

## Reference semantics and coverage

Income tax contains 15 rules: six for rUK (England, Wales and Northern Ireland) and nine for Scotland. Each jurisdiction requires a Personal Allowance amount, a taper threshold with rate, a separately identified zero-allowance point, and every named band. The zero-point rule adds `personal_allowance_zero_point` to the existing canonical enum rather than overloading a tax band. The artifact schema version is 1.1.0.

Tax amounts are GBP; rates are fractions of one. The taper rate is allowance reduction in GBP per GBP of adjusted net income over the published limit. Its numeric representation is transcribed, never used in arithmetic here. `thresholdBasis` distinguishes allowance amounts, adjusted net income and published income illustrations assuming the standard allowance. Both jurisdictions' band rows use the last basis: income before deducting Personal Allowance, including the allowance in the published income scale. They do not use income-after-allowances bounds. Although the GOV.UK current Scottish table calls its column "Taxable income", it includes an allowance row and explicitly assumes the standard allowance; UKMR preserves that published illustration, not post-allowance band widths. These illustrations are **not executable taxable-income band widths**, particularly while the allowance tapers. Published whole-pound lower/upper bounds are preserved; inclusion flags distinguish finite inclusive bounds from open-ended “over” bounds. A future calculator must deliberately define penny boundaries and allowance handling, not assume these illustrations can be applied as marginal slices.

NI contains nine rules: three bands for each of weekly, monthly and annual periods. The bands are LEL-to-primary-threshold, primary-threshold-to-upper-earnings-limit and above-upper-earnings-limit. Lower and upper threshold values are copied independently from the official period columns, not annualised or divided. Inclusive/exclusive flags preserve the published rate-table semantics. The 0% LEL band is an official value, not a missing-data default; there is no invented below-LEL row. Category A only is intentional MVP reference scope. Other official letters, employer contributions, director assessment methods and other classes are not ingested. Annual threshold references do not imply annual assessment for ordinary employees.

## Offline flow and release gate

```text
controlled extract + metadata-only official snapshot
  → raw imported JSON payload
  → HMRC tax / Scottish tax / HMRC employee NI adapter
  → normalized audit records + every raw row outcome + ingestion diagnostics
  → required-rule coverage + snapshot/provenance reconciliation
  → REFERENCE_ONLY reference artifact
```

`buildProductionReferences` returns audits and diagnostics for invalid rows or missing coverage; rejected input is not silently dropped. A failed ingestion blocks reference generation. Missing rules, duplicate semantic rules/record IDs, wrong years/jurisdictions/classes/categories, missing thresholds/rates, inconsistent NI boundaries, reversed record dates and reversed bounds fail explicitly. Rates and boundary semantics are checked. There are no fallbacks or release-status promotions. Catalogue source status never grants promotion.

`validateProductionReference` is the specialized contract for these artifacts, including when deserialized. It composes the generic reference schema with production coverage and the actual snapshot registry. The generic Slice 2 `referenceArtifactSchema` alone checks format, statuses, manifest counts and referenced IDs, but does not assert this slice's completeness. Production validation also reconciles source identity, URL/reference, retrieval/import metadata, parser version, methodology notes and capture qualifications. It rejects `USER_ENTERED` and any classification except `OBSERVED_DATA` for this scope.

Run `npm run data:references` with the project's Node 26 environment to generate five files under `src/data/generated/2026-27-v1/`: income-tax and national-insurance audit/reference pairs plus `ingestion-report.json`. The report retains raw imported payloads, row outcomes, diagnostics and coverage results. Both datasets are validated in memory before writing any output; a validation failure exits nonzero without replacing generated files. Existing versioned files are not evidence that a failed new build succeeded. `npm run data:references -- --check` checks byte-for-byte reproduction without writing.

The generation script uses Node's TypeScript stripping and a script-local extension resolver; no dependency or application runtime loader is added. Source code imports in the Next.js runtime are unchanged. Generated records must not be hand-edited. Values are tied to the reviewed extracts, tests pin the verified tables, and changes require review and regeneration. Coverage does not prove future legislation or authenticate upstream HTML.

## Deferred work and limitations

Calculator arithmetic, take-home pay, salary preservation and runtime consumption remain later-milestone work. Scottish current operational rates are confirmed by GOV.UK/HMRC; the Scottish Government policy page's proposed label remains an attributed source limitation, not an unresolved operational-rate qualification. The top-boundary presentation inconsistency is resolved as recorded below. Refresh cadence is unknown. These remain reference illustrations; runtime consumption and liability calculations require the later methodology work.

Slice 2 is commit `7c53043`; the local `origin/rebuild/next-production` reflog records an update by push for that commit. A fresh remote network check was unavailable, so this confirmation relies on recorded push evidence. The raw v3.1 workbook is never read by generation and remains untracked. Its pre/post SHA-256 is `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`.

## Locked Scottish boundary reconciliation — 14 September 2026

The user-approved resolution is Advanced through GBP 125140 inclusive and Top above GBP 125140 exclusive. Generated bounds, rates and `thresholdBasis=published_income_with_standard_allowance` are unchanged. Personal Allowance, taper and zero-point rules remain separate. Current GOV.UK Scottish rates confirm the complete generated table:

| Band | Published income bounds (before deducting allowance) | Rate |
| --- | --- | --- |
| Starter | GBP 12571–16537 inclusive | 19% |
| Basic | GBP 16538–29526 inclusive | 20% |
| Intermediate | GBP 29527–43662 inclusive | 21% |
| Higher | GBP 43663–75000 inclusive | 42% |
| Advanced | GBP 75001–125140 inclusive | 45% |
| Top | Above GBP 125140, exclusive lower bound, no upper bound | 48% |

The ordinary difference between these published income bands and the HMRC income-after-allowances presentation is a **basis distinction**, not a source conflict. Those representations are not combined or converted in ingestion. Separately, the [HMRC current-and-previous-years table](https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past) currently places the Scottish advanced-band end at GBP 125140 and describes Top as “Over £125,141”. [GOV.UK current Scottish rates](https://www.gov.uk/scottish-income-tax) and [HMRC employer guidance](https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027) instead give the top boundary above GBP 125140. Under the locked resolution, this is an **official-source presentation inconsistency, not policy-rule ambiguity**. UKMR uses GBP 125140 because it is continuous with the preceding inclusive band and corroborated by both current operational sources. There is no gap at GBP 125141.

The operational pages were reviewed at `2026-09-14T14:41:18Z`. The existing provenance model supports these supporting references through `methodologyNotes` and `limitations`; the controlled Scottish extract now carries the notes, which propagate unchanged into every Scottish band audit/reference record and the ingestion report. They preserve titles, URLs, review time and the resolution. The Scottish Government primary source ID, URL and snapshot remain intact. The original capture/import timestamps are not overwritten by the later review. Additional operational HTML is not retained and no source checksum is claimed. No new source identity, broad public contract rename or runtime loader is needed.

Regression tests verify exclusive/inclusive boundary semantics and membership at GBP 125140, GBP 125140.01 and GBP 125141, and confirm operational notes cannot be removed without failing provenance reconciliation. They perform no liability calculation.
