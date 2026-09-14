# Production rent ingestion — Milestone 1 Slice 5

This slice emits 35 `OBSERVED_DATA` / `RELEASE_READY` rent observations: overall and four bedroom measures for seven approved consumer locations. Supported-scope coverage is complete; eight-city MVP coverage is explicitly incomplete because Edinburgh remains unresolved. There is no calculator arithmetic or UI integration.

## Official evidence and snapshot

The [ONS PIPR monthly dataset](https://www.ons.gov.uk/economy/inflationandpriceindices/datasets/priceindexofprivaterentsukmonthlypricestatistics), checked 14 September 2026, lists **19 August 2026** as the latest edition, with the next release due 16 September. The selected observation month is **July 2026**, distinct from publication, retrieval and import dates.

The [official XLSX download](https://www.ons.gov.uk/file?uri=%2Feconomy%2Finflationandpriceindices%2Fdatasets%2Fpriceindexofprivaterentsukmonthlypricestatistics%2F19august2026%2Fpriceindexofprivaterentsukmonthlypricestatistics.xlsx) was downloaded to `/tmp/ukmr-ons-pipr-2026-08.xlsx`. Its actual SHA-256 is:

`9e172e7d32a43c8c979a6d394d717d862f66775295f604d2f223b2035374223e`

The versioned controlled extract at `src/data/controlled/rent/2026-07/ons-pipr.json` is labelled **UKMR_CONTROLLED_EXTRACT**, not an official ONS publication. Snapshot retention is `METADATA_ONLY`: the original XLSX stays outside Git; the small extract retains its download URL, checksum, publication/retrieval/import dates, parser/import versions, source sheet, row/cell, literal values, original Excel date serial and official geographic identity. Extraction rejects any different workbook checksum or missing/duplicate required rows. Refreshes require a newly reviewed snapshot/version; the script does not silently select older observations or update itself from the network.

`SRC-001` retains ONS as primary authority, with verified edition/month/monthly cadence and metadata-only policy. The source catalogue's previous unverified-publication/download caveats are replaced by the specific unresolved Edinburgh gap. ONS material is licensed under OGL v3.0 except where otherwise stated.

## Source semantics

Table 1 row 3 provides the source headings; selected monetary columns are H (overall rental price), L (one bed), P (two bed), T (three bed), X (four or more bed). A–D retain time period, area code, area name, region/country. July 2026 is Excel serial `46204`, interpreted using the workbook's 1900 date system. Table 1's indices and percentage changes are not monetary rents.

The workbook Notes (notes 1, 4, 5 and 6) specify non-seasonally-adjusted data, `[x]` = not available, `[z]` = not applicable, and rental prices rounded by ONS to the nearest £1. Normalization preserves the published integer in `valueGbp`, unit `GBP/month`; UKMR introduces no alternative rounding. `sourcePeriod` is a valid `YYYY-MM` month and must match provenance. No daily/effective-date range is inferred from a monthly observation; any effective dates supplied to the canonical provenance contract must be ordered.

Bedroom and property-type measures occupy separate source columns. Absence of both optional dimensions means overall rent. This release selects bedrooms only; no property-type or bedroom × property-type combination is generated. The canonical schema rejects crossed dimensions; the production gate also rejects unreviewed property-type records.

PIPR measures the wider private rental stock, including new and existing tenancies. It is not an asking-rent quote, a new-let-only estimate or a prediction for an individual dwelling. The [August 2026 ONS bulletin](https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/privaterentandhousepricesuk/august2026) describes country collection differences: Scottish data historically predominantly advertised new lets, with existing rents estimated, while achieved-rent collection is increasing. Scottish in-tenancy controls during September 2022–March 2025 can cause overestimation of stock prices. Country comparisons require caution; local estimates can be volatile. These limitations survive in each record's provenance.

The workbook cover still uses “official statistics in development”; the current ONS bulletin says PIPR became official statistics on 20 May 2026. This stale cover wording is recorded as a source limitation rather than silently discarded.

## Geographic applicability

| Consumer mapping | Exact official name | Code | Source level | July source row |
| --- | --- | --- | --- | --- |
| LOC-LON — London | London | E12000007 | Region | 1810 |
| LOC-BIR — Birmingham | Birmingham | E08000025 | Local authority | 36560 |
| LOC-MAN — Manchester | Manchester | E08000003 | Local authority | 33919 |
| LOC-LEE — Leeds | Leeds | E08000035 | Local authority | 37950 |
| LOC-LIV — Liverpool | Liverpool | E08000012 | Local authority | 35170 |
| LOC-BRS — Bristol | Bristol, City of | E06000023 | Local authority | 5285 |
| LOC-GLA — Glasgow | Greater Glasgow | S33000009 | Broad Rental Market Area | 44205 |

London remains a region, never a local-authority observation. Its region/country source field is `[z]`, retained in QA as a not-applicable geographic label; this does not invalidate its numeric rent columns. Greater Glasgow is applicable to the consumer Glasgow location but is **not equal to Glasgow City**. Both distinctions are retained in official geography, QA and provenance methodology.

No exact Edinburgh / City of Edinburgh PIPR row or closer current ONS city rent source has been verified. `EDINBURGH_RENT_SOURCE_UNRESOLVED` is always emitted under `coverage.mvpCoverage`, whose status is `INCOMPLETE`. Edinburgh is excluded only from this explicitly seven-location release-completeness scope; it is never reported complete. There is no Scotland average, another Scottish area, another city, older-month or zero fallback.

## Validation and output

`rent/adapter.ts` uses the shared ingestion runner and snapshot framework. Every selected cell is an input row, producing an accepted audit record or an explicit rejected outcome retaining the raw row. Source monetary `[x]`, `[z]` and blanks produce structured `UNSUPPORTED_SOURCE_VALUE` diagnostics with the source state in the message and raw outcome. Marker/state mismatches and malformed/nonpositive numeric values fail. Required missing states also make coverage fail; no release is emitted. The current 35 monetary cells are numeric, so marker tests use clearly synthetic mutations of the reviewed extract.

`validateRentCoverage` requires all five measures for each approved mapping, July 2026, exact official identity/consumer applicability, positive amounts, provenance, observed classification and release-ready status. It rejects duplicate normalized identities and unsupported geography/dimension substitutions. `validateRentRelease` additionally reconciles every canonical record, value, QA source cell and provenance field to the reviewed extract and the registered actual-checksum snapshot. Consumers of deserialized production rent artifacts must use this specialized gate, not just the generic artifact shape.

The generator validates before writing any file. Failed ingestion or coverage cannot overwrite the successful release. Deterministic metadata, ordering and JSON serialization produce:

- `src/data/generated/2026-07-v1/rent/audit.json`
- `src/data/generated/2026-07-v1/rent/release.json` (`DIRECT_EVIDENCE_RELEASE`, not reference-only)
- `src/data/generated/2026-07-v1/rent/ingestion-report.json` (raw imports/outcomes, row accounting, coverage and diagnostics)

## Reproduction

After downloading the exact official XLSX to `/tmp`:

```sh
npm run data:rent:extract -- /tmp/ukmr-ons-pipr-2026-08.xlsx
npm run data:rent:extract -- /tmp/ukmr-ons-pipr-2026-08.xlsx --check
npm run data:rent
npm run data:rent -- --check
npm run lint
npm run typecheck
npm test
git diff --check
```

Both `--check` modes compare the complete serialized bytes without writing. Tests separately cover exact official values for all 35 selected observations, geography semantics, unsupported substitutions, marker rejection, malformed values, dates, crossed dimensions, duplicates/missing measures, metadata/snapshot tampering, manifest reconciliation, row accounting and all three deterministic artifact bytes. Prior Slice 3/4 generated artifacts and the user's untracked raw workbook must remain unchanged.
