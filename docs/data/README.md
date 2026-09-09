# Data boundary

UKMR Data Pack v3.1 is the approved baseline. The local workbook is intentionally untracked and must not be committed or modified by this slice.

Data work must preserve provenance, source and effective dates, value status and original values when user overrides are applied. Missing data must remain missing; it must not be replaced with zero, a national average, another city's value or an arbitrary default.

## Source catalogue and verification

`src/data/provenance/catalog.ts` is the canonical catalogue location. It contains the 26 source definitions requested for Slice 2. Existing numbered source identities and governance statuses come from the workbook's `Source_Register`. Additional source identities come from the Slice 2 brief; metadata and use notes are reconciled against the supplied Batch 1–4 research record. New descriptive IDs do not replace existing register IDs. In particular, regional Ofgem evidence has a separate identity from the register's national-average source.

The supplied Batch 1–4 findings are the authoritative research record for this reconciliation. See `source-catalogue-reconciliation.md` for the entry-level decisions and remaining unknowns. Existing reference URLs are retained where their source identity remains appropriate, without asserting a verified current download endpoint. The old generic NI URL was removed when the audited publication was corrected to HMRC Rates and thresholds for employers 2026/27. Only verified access formats, licences and dates are populated; publication dates and refresh cadences remain absent because the supplied findings do not establish them.

`accessMechanisms` and `sourceStatus` may be absent when unresolved, with a required explanation in `unresolvedMetadata`. Other optional metadata remains absent when unverified. `rawSnapshotPolicy: PENDING_REVIEW` expresses an unresolved retention decision and grants no redistribution permission. Catalogue entries are source definitions, not permission to publish records. Optional `sourceReference`, `suitability` and effective-date fields preserve audited metadata without duplicating release status. Source suitability describes how evidence may be used; it never authorizes record promotion.

Source-register governance labels such as `POPULATED`, `MODELLED`, `POPULATED_DEV`, `CONFLICT_REVIEW` and `POPULATED_PARTIAL` remain separate from the unchanged four-value release-status enum. Governance labels do not promote a record's release status. Transport entries now name the authorities and product systems identified by Batch 3. Exact product URLs and formats remain unresolved where that audit does not identify them; product systems must remain separate in future adapters.

## Offline ingestion

The flow is:

```text
source catalogue → snapshot metadata → raw imported payload
  → category adapter → normalized audit records + row outcomes + diagnostics
```

A retained snapshot requires a local reference, checksum, retrieval timestamp and source format. The reference may point outside Git. A metadata-only snapshot requires a source URL or reference, retrieval timestamp, format and reason for non-retention; its checksum is optional. The framework records metadata and never fetches, reads, writes or redistributes source files. Checksums are supplied by the acquisition process; the framework does not claim to verify file bytes.

An import supplies raw `unknown` payload, import time/version and an explicit release status. An adapter declares its ID/version, source identity, category, accepted formats, input row schema and category-specific output schema. The foundation supports one input row producing one record or one explicit rejection. Adapters needing one-to-many expansion require a later, explicit row-accounting design. The source-by-source review in `source-catalogue-reconciliation.md` identifies likely wide-table expansion needs; the framework is unchanged in this pass.

`runIngestion` validates metadata, source identity, source format, every parsed row and every normalized record. It rejects release-status changes, category changes, mismatched snapshot provenance and modelled values from an adapter not declared as `MODEL`. An adapter must preserve source meaning and geography, never fill gaps, substitute another area or national averages, or silently synthesize values. Semantic mappings require adapter-specific review and tests; generic schema checks cannot establish their correctness.

Every parsed row has an outcome retaining the original raw value. Duplicate source identifiers are rejected for every occurrence. Rejected rows carry structured diagnostics; accepted and rejected counts sum to the input row count. A payload parse failure leaves the input row count unknown (`null`), rather than reporting zero. A run with any diagnostic is `FAILED`, even when some valid audit records are retained for investigation. These partial results are not a release. Unresolved or conflict-review source governance blocks ingestion.

Diagnostics distinguish source parse failure, missing required field, unsupported value, duplicate identifier, invalid date, invalid numeric value, geography mapping failure and source review required. Adapter errors become explicit rejected outcomes. Payload parsers must expose all rows; the framework cannot recover rows silently discarded inside an adapter's own parser, so this is an adapter review requirement.

The only proof adapter is a synthetic JSON tax-reference fixture under `tests/data/fixtures`. Its shape and numeric values are test data, not an HMRC API, downloaded source or executable tax calculation. Release generation, production importers, runtime loaders and calculator logic are later work.
