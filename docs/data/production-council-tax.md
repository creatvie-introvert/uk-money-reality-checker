# Slice 4: council-tax direct evidence

This slice adds 56 observed annual council-tax charges for 2026/27: bands A–H for Birmingham, Manchester, Leeds, Liverpool, Bristol, City of Edinburgh and Glasgow City. Valid, complete records form a `DIRECT_EVIDENCE_RELEASE` with `RELEASE_READY` and `OBSERVED_DATA`. No ordinary council-tax reference artifact, runtime loader, calculator, UI, discount calculation or other category is implemented.

## Verified official evidence

[MHCLG Council Tax levels set by local authorities in England 2026 to 2027](https://www.gov.uk/government/statistics/council-tax-levels-set-by-local-authorities-in-england-2026-to-2027) supplies the [Tables 1–9 ODS](https://assets.publishing.service.gov.uk/media/69de1fa63e81003ae0422508/Tables_1-9_2026-27.ods). Table_9 contains **area council tax for a dwelling occupied by two adults**, with bands in columns G–N. Note p says the figures include parish and adult social care precepts. These are area charges, not the billing authority's own component. The extract does not invent a precept breakdown, recompute bands from Band D, or claim that an area figure is the exact bill for every parish/address.

The source's ONS authority codes are preserved exactly:

| Authority | Code | Table_9 row |
| --- | --- | --- |
| Birmingham | E08000025 | 61 |
| Manchester | E08000003 | 39 |
| Leeds | E08000035 | 71 |
| Liverpool | E08000012 | 48 |
| Bristol | E06000023 | 80 |

[Scottish Government Council Tax datasets](https://www.gov.scot/publications/council-tax-datasets/) supplies the linked **Council Tax by band 2026-27** XLSX. The worksheet is `CT by Band, 2026-27`; selected cells are B12:I12 for City of Edinburgh and B22:I22 for Glasgow City. Its footnote excludes water and sewerage. These values are council tax only; no water charges are added or inferred. The source identifies authorities by name and provides no authority-code column. Codes are consequently omitted for the two Scottish authorities, rather than inferred from another source. The raw Glasgow name has a trailing space; the canonical name is whitespace-trimmed and the original is preserved in audit metadata.

Catalogue identities remain `SRC-002` and `SRC-020`. Their snapshot policies are now metadata-only; effective dates and verified OGL v3.0 references are recorded. The official publication pages provide that licence subject to their stated exceptions. No unrelated catalogue entries were changed. Refresh cadence remains unverified.

## Raw source and precision

`src/data/controlled/council-tax/2026-27/` contains two explicitly labelled UKMR-controlled extracts. They are selected cell transcriptions, not original government files or an upstream JSON feed. Each embeds a metadata-only snapshot with the verified official download URL, source ID/format, capture timestamp and **SHA-256 of the actual downloaded original file**. Original spreadsheets were inspected in temporary storage and are not committed. These checksums do not describe the derived JSON files.

The raw numeric text, displayed monetary text, source cell/table, number format and original authority name survive in `qa` on every audit/release record, as well as the raw imported payload and row outcomes. English amounts use the ODS cached displayed text. The Scottish source contains higher-precision numeric values under the exact Excel number format `"£"#,##0.00`. Extraction applies that displayed precision to the stored numbers. It does not derive ratios, evaluate source formulas or choose a new rounding convention. None of the selected Scottish values is an exact half-penny tie; extraction explicitly checks that assumption and fails if future data introduces such a case needing review.

For example, Edinburgh Band B stores `1264.7055555555555` and displays GBP `1264.71`. The canonical numeric annual charge is `1264.71`, and the longer raw string remains intact. Glasgow Band H stores `4179.7000000000007`, displays `4179.70`, and normalizes to the numeric value `4179.7`. The two-decimal string is retained because JSON numbers do not preserve trailing zeroes. The production adapter only parses the reviewed displayed amount; it performs no rounding or council-tax calculation. Release validation reconciles both raw and displayed values to their reviewed source cells.

## Dates and geography

The financial/source year is `2026/27`, effective **1 April 2026 through 31 March 2027 inclusive**. These dates intentionally differ from the personal tax/NI effective period. Capture and logical import timestamps are fixed to this reviewed version and do not claim a fresh retrieval when generation is rerun.

`geography.official` is the authority-level identity: name, code where verified, geography type and source ID. `nation` and `chargeScope` explicitly distinguish English area charges from Scottish council-tax-only charges. The existing `mvpCityId` links the seven reviewed authorities to their corresponding MVP locations. This does not turn a general city label into an arbitrary authority mapping. Missing or mismatched identities are errors; there is no fallback to another authority, nearby council, national average, previous year or zero.

## London: pattern B

No London rows or scalar are generated. The official English table represents individual London authorities; this slice has no approved borough-selection methodology. The release's coverage scope is **SEVEN_REVIEWED_AUTHORITIES**, requiring 56 authority/band combinations. A successful release is not a claim of complete eight-city default coverage.

The ingestion report separately returns `cityDefaultCoverage.status: INCOMPLETE` and `LONDON_CITY_DEFAULT_UNRESOLVED` for `LOC-LON`. This unresolved product dimension is reported separately from errors that block the seven-authority release. Even adding a borough row cannot mark London default coverage complete: an out-of-scope borough is rejected and the London diagnostic remains. There is no borough choice, borough average, Greater London substitution or fabricated zero. Later product UX must establish an explicit address/borough-selection approach and communicate unavailable defaults. This slice implements none of that UX.

## Ingestion and release validation

```text
verified official ODS/XLSX
  → reviewed UKMR selected-cell extract + snapshot metadata
  → raw imported JSON payload
  → England/Scotland production adapter
  → canonical audit records + every accepted/rejected row + diagnostics
  → seven-authority A–H coverage and source/precision reconciliation
  → RELEASE_READY DIRECT_EVIDENCE_RELEASE
```

The only wide-to-long conversion occurs during controlled extraction: one row per selected authority/band cell. Original unselected authorities are deliberately outside the documented extraction scope. Runtime/offline ingestion receives all extract rows and accounts for each; it never silently filters malformed or duplicate rows. A failed ingestion can retain valid audit rows for investigation, but produces no direct release.

The new `councilTaxRecordSchema` extends the canonical record union; generated council-tax manifests use schema version `1.2.0`. Existing tax/NI artifacts and schemas retain their versions. The council schema enforces positive, finite annual charges, two-decimal monetary precision, A–H bands, positive raw values, annual/display agreement, required English authority codes, ordered effective dates and nation/charge-scope consistency.

`validateCouncilTaxCoverage` requires every reviewed authority and band, exact identity and source regime, the 2026/27 period, provenance, unique authority/band/year and record IDs, `OBSERVED_DATA` and `RELEASE_READY`. Missing/duplicate bands and invalid records return explicit diagnostics. The two adapters reject wrong authority codes, unapproved identities, source-table mismatches and non-`RELEASE_READY` imports; they do not promote a source governance label into a release status.

`validateCouncilTaxRelease` is the specialized production gate, including for JSON read back from disk. In addition to the generic direct-evidence manifest count/status/snapshot-ID checks, it reconciles the actual snapshot registry, original-file checksum, source identity, URL, dates, parser/import versions, methodology and source-cell precision. The generic `directEvidenceReleaseSchema` alone does not prove council-tax coverage. No `DEV_ONLY`, `REFERENCE_ONLY`, `BLOCKED_FROM_RELEASE` or `USER_ENTERED` records enter the generated release.

## Reproduction

Run in the project's Node 26 environment:

```sh
npm run data:council-tax
npm run data:council-tax -- --check
```

This writes or verifies three files under `src/data/generated/2026-27-v1/council-tax/`: `audit.json`, `release.json` and `ingestion-report.json`. Generation uses committed extracts only; it makes no live source calls. All validation happens before files are written. Invalid data exits nonzero without replacing prior artifacts; stale existing files do not establish that a failed new build passed. The `--check` mode compares exact bytes without writing. No generic runtime loader is added.

The original-file extraction can also be reproduced with the Python standard library:

```sh
python3 scripts/data/extract-council-tax.py /path/to/Tables_1-9_2026-27.ods /path/to/scottish-council-tax-2026-27.xlsx
```

Both input byte checksums are pinned to this capture; different upstream files require a new source review and capture version rather than reuse of these timestamps/IDs. The script reads spreadsheets and writes only the two controlled JSON files. It never opens the raw UKMR v3.1 workbook.

Remaining limitations are London city-default selection, address/parish-level applicability of English area charges, unverified Scottish codes and future source refreshes. They do not prevent releasing the stated seven-authority evidence scope. Affordability, household adjustments, exemptions, reductions and calculator behavior remain out of scope.
