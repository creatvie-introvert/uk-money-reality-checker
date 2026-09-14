# Data layer

Milestone 1 contains the canonical record contracts, source catalogue and offline ingestion framework. Slice 3 adds production tax/NI adapters and versioned reference artifacts. Typed runtime loaders remain deferred.

Milestone 1 separates three artifact concepts:

- audit artifacts retain `RELEASE_READY`, `DEV_ONLY`, `BLOCKED_FROM_RELEASE` and `REFERENCE_ONLY` records;
- direct evidence releases contain only `RELEASE_READY` records;
- reference artifacts contain only `REFERENCE_ONLY` records and are loaded through separate methodology APIs.

Source snapshots may be retained or represented by source metadata and checksums when licensing or storage rules prevent repository retention. No live upstream source is a runtime dependency.

Artifact parsing validates manifest record counts and source snapshot references. The artifact manifest's `releaseId` is the authoritative release-level identifier; records do not require a per-record release identifier.

The ingestion flow is source catalogue → snapshot metadata → raw imported payload → category adapter → normalized audit records and diagnostics. The catalogue describes upstream evidence; adapters normalize it into the existing category-specific schemas. Tax/NI reference generation is implemented in Slice 3; calculator logic follows in M2.

See `docs/data/README.md` for source verification limits, snapshot retention, row accounting and adapter responsibilities. The synthetic fixture remains under `tests/data/fixtures`; production adapters are under `src/data/ingestion/production`. See `docs/data/production-tax-ni.md` for generation and source qualifications.

Slice 4 adds council-tax controlled extracts and production adapters under `ingestion/council-tax`, producing seven-authority direct evidence. London city-default coverage remains explicitly unresolved. See `docs/data/production-council-tax.md`.
