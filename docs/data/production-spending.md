# Production grocery and household-spending evidence — Slice 8

Slice 8 imports national expenditure evidence only: 32 Defra Family Food rows and 53 ONS Family Spending rows, with 85 separate calculated monthly equivalents. All records remain `REFERENCE_ONLY`. No household spending model, city budget, Essentials/Lifestyle mapping, transport fare implementation, calculator UI or runtime calculator logic is supplied. Slice 7 commit `359ff80` was present in HEAD and the remote-tracking reflog recorded its push before this work began.

## Sources and periods

| Evidence | Official source | Edition / publication | Selected scope |
|---|---|---|---|
| Defra Family Food | [Current datasets](https://www.gov.uk/government/statistical-data-sets/family-food-datasets), [UK expenditure ODS](https://assets.publishing.service.gov.uk/media/6a350dac25c5199bda117822/UKExp_17Mar26.ods) | FYE 2024; original release 6 November 2025; dataset page updated 19 June 2026 | UK household food and non-alcoholic drink total `cat105`, plus source category/group levels 1–2 within household non-alcoholic rows 16–348 |
| Defra codebank | [FYE 2024 UK expenditure CSV](https://assets.publishing.service.gov.uk/media/68ff9e42d81972ecd2df5dca/Exp_UK_202324.csv) | Source year `202324` | Code identity, description and estimate corroboration for 31 selected ODS rows |
| Defra code definitions | [Official methodology](https://www.gov.uk/government/publications/family-food-methodology), [Food and drink codes PDF](https://assets.publishing.service.gov.uk/media/5a7ecd46ed915d74e62268be/familyfood-method-codes-11dec14.pdf) | 11 December 2014 document still linked by the current methodology page | Definitions distinguishing household supplies from eating out and the nested food categories |
| ONS Family Spending | [Workbook 1 dataset](https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/expenditure/datasets/familyspendingworkbook1detailedexpenditureandtrends), [FYE 2025 XLSX](https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/personalandhouseholdfinances/expenditure/datasets/familyspendingworkbook1detailedexpenditureandtrends/fye2025/workbook1detailedexpenditureandtrends.xlsx) | FYE 2025; published 11 June 2026 | Table A1, all-households average weekly expenditure, top two numbering levels of groups 1–12 |

The current editions differ: **Defra FYE 2024** represents April 2023–March 2024; **ONS FYE 2025** represents April 2024–March 2025. Neither is relabelled as September 2026 expenditure. No inflation adjustment is made. The Defra page's June 2026 dataset update is recorded separately from the November 2025 publication date. The ONS landing-page correction concerns percentage standard errors in FYE 2023/2024, not this selection of FYE 2025 expenditure values.

All four original files were downloaded to `/tmp`, verified on 14 September 2026 and pinned with real SHA-256s in `scripts/data/spending-sources.json`. The fixed retrieval/review checkpoint is `2026-09-14T17:18:07Z`. Raw originals are not checked into Git. Snapshots are `METADATA_ONLY`, with official URLs, formats, checksums and retrieval timestamps. Source licensing is OGL v3.0 except where otherwise stated; the conservative original-file retention policy remains metadata-only.

The two existing source IDs remain `SRC-005` and `SRC-006`. Source catalog governance is separate from record classification: Defra's existing `POPULATED_DEV` label is retained without promoting any former household model. Its reviewed national facts are observed, reference-only evidence. Only those two source catalog entries change in this slice.

## Defra semantics and extraction

`extract-spending.py` reads the original ODS ZIP/XML directly, respecting repeated rows/columns, and reads the official CSV codebank. It verifies all original checksums before writing either extract. This is reproducible extraction from pinned originals, not a hand-entered value ledger. Sheet `expenditure` column `BF` is headed `202324`; the table title states **average pence per person per week**.

Each `grocery_expenditure` record preserves:

- Source category code and label, source code level, and the four native hierarchy-label columns (including their source blanks).
- UK survey population and `FYE 2024`, with no city or UKMR household profile.
- Original decimal pence string, source unit, sheet, row and cell in QA; canonical `weeklyGbp` and `GBP/person/week`.
- ODS provenance and supporting codebank/definition snapshots. Codebank descriptions can differ in wording from published ODS labels; both remain identifiable.

Normalization divides source pence by 100. It expresses the same observed amount in GBP and remains `OBSERVED_DATA`; it does not infer another population or expenditure period. Stored values are not rounded to match headline display values. For example, `cat105` retains source `3229.6704392759402` pence/person/week from `expenditure!BF13`, rather than using the displayed headline £32.30 as a calculation input.

The 31 matched codebank estimates reconcile within `0.00000001` pence, a tolerance for floating-point/decimal serialization only. The source ODS composite `t4` has no matching UK codebank row. Its value is a published ODS observation and remains `OBSERVED_DATA`, explicitly marked `ODS_PUBLISHED_COMPOSITE`; UKMR does not calculate it or substitute another code.

This selection is **32 rows**, not exhaustive food detail. The extraction report accounts for all 355 coded ODS rows: 32 selected and 323 explicitly excluded. Exclusions include lower-level food detail, alcohol and all-purchase/eating-out summaries. Empty historical category cells stay empty in exclusion QA; they do not become zero. The selected food hierarchy includes overlapping aggregate categories, so summing every row would double-count expenditure. No UKMR category sum is emitted.

The national source describes average expenditure per person among surveyed households. It is not a city-specific grocery budget or an observed couple/family-of-three total. No composition breakdown is imported in this slice. Source groups such as “3+ adults” or “2+ children” would not supply a fixed headcount; attempted headcount/profile fields are rejected here. A future composition import must preserve the exact group and cannot multiply its per-person value by an assumed lower bound. Diary under-reporting and sampling uncertainty remain limitations, not adjustments performed by UKMR.

## ONS semantics and hierarchy

The canonical category remains **`coicop_expenditure`**, but A1 states: **“The numbering is sequential, it does not use actual COICOP codes.”** This distinction is represented explicitly:

- `sourceCategoryCode`: the source's sequential identifier.
- `codeSystem = ONS_A1_SEQUENTIAL`.
- `coicopCode`: absent; the schema prevents inserting an A1 sequence as an actual COICOP code.
- `coicopLabel`: source category wording, including any attached source footnote markers and source whitespace.
- `parentSourceCategoryCode` and `hierarchyLevel`: the published top two numbering levels. Every retained subgroup has its retained parent.
- `profile = All households`, UK geography, `FYE 2025` and `GBP/household/week`.

Some source identifier cells are numeric XML values such as `1.1000000000000001`. Extraction preserves that raw value in QA and expresses the source's displayed one-decimal identifier as `1.1`. This formatting repair affects identifiers only; expenditure amounts are not rounded by UKMR.

Sheet `A1`, column `G` contains average weekly expenditure for all households. £73.70/week for `Food & non-alcoholic drinks` is retained as observed household evidence. This is already a source-native household average; it is not derived from Defra's per-person amount or a guessed household size. Parent category amounts are separately published observations and are not replaced with sums of rounded children. Net concepts, such as housing, also require the source notes; no reconciliation assumption forces their components to add as ordinary gross charges.

There are **53 selected rows**, covering the 12 top-level groups and 41 subgroups. The examined groups 1–12 region contains 433 numbered rows/headings: 53 selected and 380 explicitly excluded lower-level rows or repeated continuation headings. Groups 13–14, totals outside the selection, other worksheets, income/composition breakdowns and standard-error columns are not ingested. Suppression markers and bracketed/qualified values in excluded detail stay as source strings in the report. If such a marker enters a selected numeric row, ingestion fails rather than assuming zero.

Source expenditure groups include categories such as transport and housing as part of the national ONS hierarchy. This does not add transport fares, modify the rent/water/energy evidence, or implement those calculator categories.

## Monthly equivalents and classification

Every observed row gets a separate `expenditure_period_conversion` record:

```text
monthlyGbp = observedWeeklyGbp * 52 / 12
valueType = CALCULATED
releaseStatus = REFERENCE_ONLY
calculationVersion = weekly-to-monthly-v1
```

Defra's denominator remains **person** (`GBP/person/month`); ONS's remains **household** (`GBP/household/month`). The derivative preserves the exact observed record ID, category, source period, geography and primary provenance. It does not represent an observed calendar month. The category-specific validator checks both the arithmetic and the full derivative against its exact trusted observed parent; a fake parent ID or internally consistent arithmetic using a different weekly amount fails.

Storage uses JavaScript IEEE-754 numbers without intermediate or final decimal rounding. Original source decimal strings remain in the observed QA. A future display may round to two decimal places, but that display value must never replace the stored input. No `×4` approximation is used.

`OBSERVED_DATA` means the published statistical observation, including a currency-unit normalization. `CALCULATED` means deterministic period arithmetic here. `MODELLED_ESTIMATE` would be required for later category-specific household/profile assumptions; none is produced. The OECD-modified equivalence scale is an income methodology reference and is not used as a grocery or spending multiplier.

## Product views, geography and coverage

No approved Essentials/Lifestyle mapping was found in the existing contracts or supplied brief. Both remain future product views. No source label is replaced with either term, and no mapped aggregate is produced. A later approved mapping must version its source-code membership, preserve source rows, prevent double-counting and classify its aggregate `CALCULATED`. Any additional household-profile inference must be separately justified as `MODELLED_ESTIMATE`.

Coverage is for the **selected national source rows**, not all spending detail and not eight cities. Reports explicitly state:

- `cityCoverage.status = NOT_APPLICABLE`.
- `householdProfileCoverage.status = NOT_ESTABLISHED` and `HOUSEHOLD_SPENDING_MODEL_NOT_IMPLEMENTED`.
- `productMapping.status = NOT_APPROVED` and `ESSENTIALS_LIFESTYLE_MAPPING_NOT_APPROVED`.

Canonical geography has only the official UK scope. City IDs and household multiplier fields are rejected rather than quietly stripped. Coverage checks exact source identity, label, hierarchy, period, units, numeric value, geography, provenance, status, snapshot references, and calculated parent linkage. Duplicate identities are detected even if an attacker changes record IDs. Missing or altered rows block artifacts. Selection accounting and excluded rows are reconciled separately from every accepted/rejected ingestion row.

`validateSpendingArtifact` is the required spending-specific gate for deserialized artifacts. The general `REFERENCE_ARTIFACT` schema alone proves neither source fidelity nor monthly linkage. Supporting codebank/PDF snapshots are preserved and validated through controlled-extract/record QA; manifest snapshot IDs enumerate the primary provenance snapshots referenced by records, consistent with the existing artifact contract.

## Files and commands

New components:

- `scripts/data/spending-sources.json`, `extract-spending.py`, `generate-spending.mjs`.
- `src/data/controlled/spending/defra-fye2024.json` and `ons-fye2025.json`.
- `src/data/ingestion/spending/{sources,adapters,conversions,release}.ts`.
- `tests/data/spending.test.ts`.
- This methodology document and the generated artifacts below.

Narrow existing-file changes: `package.json`, the source catalog, `src/data/schemas/records.ts`, and the data documentation index. There was no existing grocery schema or approved Essentials/Lifestyle schema to reuse. The existing COICOP schema is qualified for the actual A1 code semantics; other category schemas are unchanged.

```sh
npm run data:spending:extract
npm run data:spending
npm run data:spending:extract -- --check
npm run data:spending -- --check
npm run lint
npm run typecheck
npm test
git diff --check
```

Extraction defaults to the pinned filenames under `/tmp`; `--source-dir /path/to/captures` permits another directory. Exact official download URLs and checksums are in the source configuration. Missing or changed originals fail extraction, requiring an explicit new source review. Generation is offline from the checked-in controlled extracts. Both families validate before any generated files are written.

Each directory contains `audit.json`, `reference.json`, `calculated.json`, and `ingestion-report.json`:

- `src/data/generated/fye2024-v1/groceries/`: 32 observed and 32 calculated records.
- `src/data/generated/fye2025-v1/household-spending/`: 53 observed and 53 calculated records.

Observed and calculated files are separate `REFERENCE_ARTIFACT`s. There is no direct release claiming city calculator readiness. Audit files contain the observed rows; reports retain row-level outcomes, explicit source exclusions, coverage, supporting sources and diagnostics. Tests compare every generated file's full UTF-8 serialization and repeated builds. Independent regeneration checks compare both controlled extracts and all eight generated files, and verify pre-slice hashes for prior artifacts and the untouched, untracked raw workbook.

Validation on 14 September 2026: lint, typecheck and all 386 tests passed, including 69 new spending tests. Original-file checksum verification, extraction, generation and both full-byte `--check` commands passed. Both controlled extracts and all eight generated artifacts remained identical after regeneration. The 20 prior Slice 3–7 generated artifacts and raw workbook matched their pre-slice hashes; the workbook remained untracked. All other source catalog entries were unchanged. `git diff --check` passed. No commit was made.
