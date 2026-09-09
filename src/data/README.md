# Data layer

This commit is the contract-foundation slice of Milestone 1. Importers, generated release datasets and typed runtime loaders are subsequent M1 work.

Milestone 1 separates three artifact concepts:

- audit artifacts retain `RELEASE_READY`, `DEV_ONLY`, `BLOCKED_FROM_RELEASE` and `REFERENCE_ONLY` records;
- direct evidence releases contain only `RELEASE_READY` records;
- reference artifacts contain only `REFERENCE_ONLY` records and are loaded through separate methodology APIs.

Source snapshots may be retained or represented by source metadata and checksums when licensing or storage rules prevent repository retention. No live upstream source is a runtime dependency.

Artifact parsing validates manifest record counts and source snapshot references. The artifact manifest's `releaseId` is the authoritative release-level identifier; records do not require a per-record release identifier.
