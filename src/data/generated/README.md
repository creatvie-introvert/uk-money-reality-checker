# Generated data

`2026-27-v1/` contains tax and employee category A NI audit/reference pairs and their complete ingestion report. Every reference record is `REFERENCE_ONLY`. Do not hand-edit generated files.

Regenerate with `npm run data:references`; verify deterministic reproduction with `npm run data:references -- --check`. Source semantics, limitations and the specialized production validation contract are documented in `docs/data/production-tax-ni.md`. Calculator/runtime loaders remain deferred.

`2026-27-v1/council-tax/` contains council-tax audit/direct-release artifacts and an ingestion/coverage report. Regenerate with `npm run data:council-tax`, or compare bytes with `npm run data:council-tax -- --check`. The release covers seven reviewed authorities; the report explicitly leaves London city-default coverage unresolved.

`2026-07-v1/rent/` contains 35 July 2026 ONS PIPR observations in audit/direct-release artifacts and an ingestion/coverage report. Regenerate with `npm run data:rent`, or compare bytes with `npm run data:rent -- --check`. Seven supported geographies are complete; Edinburgh remains explicitly unresolved. See `docs/data/production-rent.md` for the controlled extraction command, geographic applicability and specialized rent release gate.
