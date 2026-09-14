# Data scripts

`npm run data:references` builds the 2026/27 income-tax and category A employee NI audit/reference artifacts from reviewed UKMR-controlled extracts, offline. `npm run data:references -- --check` verifies existing files byte for byte.

The script runs in the project's Node 26 environment and uses built-in TypeScript stripping with a local import resolver. Both datasets must pass ingestion, coverage and provenance validation before writing files. Failure exits nonzero. See `docs/data/production-tax-ni.md` for scope and source qualifications. No workbook importer or runtime calculator loader is implemented.

`npm run data:council-tax` generates the seven-authority council-tax direct evidence, audit and coverage report; `npm run data:council-tax -- --check` verifies exact reproduction. `extract-council-tax.py` optionally reconstructs controlled JSON from the two checksum-pinned official spreadsheets using the Python standard library. It never reads the raw UKMR workbook. See `docs/data/production-council-tax.md`.
