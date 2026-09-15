# Calculator engine

Pure TypeScript M2 boundary; no React, filesystem, source spreadsheet or ingestion dependency.

- `contracts/`: validated scenario inputs and discriminated output/resolution types.
- `loaders/`: centrally pinned generated releases, immutable validated records and exact queries.
- `resolution/`: override → exact source evidence → structured unresolved.
- `money/`: exact rational pence, explicit period equivalents and display rounding.
- `calculators/`: rent/council-tax proofs and explicit unsupported category interfaces.
- `diagnostics/`: stable codes, severities and categories.
- `comparison/`: M3 interface only.

See [Milestone 2 architecture](../../docs/engine/milestone-2-architecture.md) for the supported scope, precision policy, release configuration, gaps and validation. Full tax/NI arithmetic, household totals/models, comparison and salary preservation remain later slices.
