# Production water tariff ingestion — Slice 7

This release contains 56 manually reviewed official provider tariff facts for the 2026/27 charge year. It implements ingestion and conditional applicability evidence, not a water bill engine, consumption model, address lookup or calculator UI. Slice 6 was committed at `fecb7e3` and the remote-tracking reflog records its push before this work started.

## Evidence and extraction

The checked-in review ledger is `scripts/data/water-reviewed-sources.json`. Seven controlled extracts under `src/data/controlled/water/` contain selected decimal source cells, original units, source table/page references, scope, conditions, excluded content and snapshot metadata. `MANUAL_PRIMARY_SOURCE_CELL_REVIEW` is intentional: the extraction command replays reviewed cells. It does not scrape arbitrary current tariff pages, discover updated rates, or pretend browser-reviewed cells came from an automated PDF parser. A future refresh requires another primary-source review and a new versioned release.

All source pages/documents below were reviewed on 14 September 2026. The recorded review/retrieval checkpoint is 16:29:27 UTC; generation uses that fixed checkpoint, not the wall clock. Publication dates were not independently established and are omitted. The effective charge year is 1 April 2026–31 March 2027. The year-labelled HTML columns are normalized to those charge-year dates; Severn Trent's parent page explicitly confirms the dates and has a separate captured checksum in `periodEvidence`.

| Provider / source ID | Official evidence | Selected facts | Capture |
|---|---|---:|---|
| Thames / SRC-014 | [2026/27 charges scheme](https://www.thameswater.co.uk/media-library/toecnx2l/charges-scheme-2026-27.pdf), PDF page 26 Tables 1–2, section 6.1.3 | 5 | PDF SHA-256 |
| Severn Trent / SRC-SEVERN-TRENT | [Metered charges](https://www.stwater.co.uk/my-account/our-charges/metered-charges/), zones 1–8; [effective-year confirmation](https://www.stwater.co.uk/my-account/our-charges/) | 5 | HTML SHA-256; separate parent HTML checksum |
| United Utilities / SRC-015 | [2026/27 household metered charges](https://www.unitedutilities.com/my-account/your-bill/our-household-charges-20262027/how-bills-for-households-with-a-meter-are-changing-for-20262027/) | 6 | HTML SHA-256 |
| Yorkshire / SRC-017 | [Customers with a meter](https://www.yorkshirewater.com/bill-account/how-we-work-out-your-bill/customers-with-a-meter/), 2026-27 columns | 6 | HTML SHA-256 |
| Bristol Water / SRC-BRISTOL-WATER | [2026/27 household charges scheme](https://www.bristolwater.co.uk/hubfs/BRL%20Household%20Charges%20Scheme%202026-27.pdf), page 5 section 2, pages 3 and 7–8 | 7 | PDF SHA-256 |
| Wessex / SRC-018 | [Metered charges](https://www.wessexwater.co.uk/bills-and-accounts/our-charges/metered-charges), 2026-27 column and reduced sewerage fixed charge | 3 | Full official page reviewed in Chrome; no exported original bytes/checksum |
| Scottish Water / SRC-010 | [Unmetered charges 2026–27](https://www.scottishwater.co.uk/your-home/your-charges/your-charges-2026-2027/unmetered-charges-2026-2027), full A–H table | 24 | Full official page reviewed in Chrome; no exported original bytes/checksum |

Thames and Bristol PDF tariff tables were also visually checked against rendered pages. Original PDF/HTML captures remain in `/tmp`, outside the repository. Every snapshot is `METADATA_ONLY`; five main snapshots preserve actual SHA-256s of captured bytes. Wessex and Scottish Water HTTP capture attempts were blocked by the providers, but their complete official pages were readable in Chrome. Browser export was unavailable, so neither source receives a fabricated checksum. This limits independent byte-level replay of those two originals, not deterministic replay of the reviewed tariff cells.

Provider reuse/licensing remains **unresolved**. No OGL, API availability or unrestricted raw redistribution is assumed. Catalog entries now identify the verified PDF/HTML endpoint and metadata-only policy. Previously unresolved Bristol/Severn source-governance entries become `POPULATED_PARTIAL` for this reviewed selection; this is separate from city coverage. Existing populated/partial governance labels are otherwise preserved. No original page or document is checked in.

## Contracts and tariff semantics

`providerId` identifies the provider area/brand; `regulatedCompany` identifies the regulated undertaking. Bristol's scheme page 3 states its appointment moved into South West Water on 1 February 2023 with separate Bristol-area price controls. Thus Bristol Water remains the consumer mapping and clean-water tariff identity, with **South West Water Limited (Bristol Water area/brand)** retained as the regulated company. Wessex remains the distinct wastewater provider; the joint billing company is not treated as either service provider.

These fields have independent meanings:

- `billingRegime`: metered volumetric, rateable value, assessed household or council tax band. Split supply is not a regime.
- `serviceComponent`: clean water, wastewater, surface drainage, highway drainage or published combined services total.
- `tariffComponent`: source charge basis, such as fixed/standing, volume, RV multiplier or assessed bedroom charge.
- `geography.official` and `applicability`: the provider's published scope and conditions. Tariff records do not claim an MVP-city observation.
- City mappings: separate reviewed provider/service combinations and required tariff records for a specific conditional path.

Monetary amounts are positive source observations. Units remain `GBP/year`, `GBP/m3`, `pence/m3`, `GBP/GBP-rateable-value/year` or `GBP/additional-bedroom/year`. No pence-to-pound, annual-to-monthly, consumption or bill arithmetic is emitted. Effective dates must be ordered and match provenance. Council-tax-band tariffs require an A–H band. Unknown dimensions, including occupancy model inputs, are rejected.

Tariff identity includes provider, regime, service, tariff component, **variant and council tax band**, plus effective dates. Variant/band are necessary: full versus abated standing charges and Bands A–H are legitimate alternatives, not duplicate identities. Record-ID changes cannot hide a duplicate tariff identity. Full and abated/reduced fixed charges are alternatives; a consumer must not add both. Scottish `combined` records have `aggregationRole = alternative_total` and must not be added to separate water/sewerage components.

Provider-specific scope:

- **Thames:** standard single-household metered charges. Clean fixed £66.87/year and 273.46p/m³; wastewater fixed £128.13/year or £80.43 with surface-water abatement, and 147.21p/m³. Section 6.1.3 uses the same metered volume for wastewater and water: non-return of up to 10% is already reflected in the wastewater rate. No extra deduction is applied here. Bulk-meter, SmartSaver, social and unmetered paths are excluded.
- **Severn Trent:** only zones 1–8 standard water and public-sewer used-water components plus highway standing charge. Direct-to-treatment-works and zones 9–10 alternatives are excluded. Surface drainage may depend on RV/zone or property type and is not selected. These provider-scope facts are release ready; Birmingham applicability is not.
- **United Utilities:** standard metered water, wastewater, surface and highway components. Optional Direct Debit discount is not applied. Published illustrative bills and the supplier occupancy curve are excluded.
- **Yorkshire:** standard metered rates outside York Waterworks, separate foul and highway volumetric components, separate surface standing charge. The source foul basis describes 95% of water used; no adjustment is calculated here. The published combined foul/highway volume total is not duplicated as another additive charge.
- **Bristol Water:** standard domestic clean-water metered, RV and assessed-bedroom components. Assessed charges require an unsuccessful meter fit and the customer's choice of assessed charging; the source's sole-occupant exception is retained. Seasonal trial Appendix III, social tariffs, caravans, sprinklers and non-domestic tariffs are excluded.
- **Wessex:** only metered wastewater components, including the £71 full or £43 reduced annual standing charge and £3.1124/m³. Standing charges include rainwater/highway drainage. Reduced standing requires no rainwater connection from the property. The source's 5% non-return allowance remains a condition, not performed arithmetic. Wessex clean-water rows are deliberately excluded.
- **Scotland:** unmetered connected households, actual council tax band A–H, before eligible discounts/reductions. Scottish metered service is a separate unsupported path.

## Coverage and unresolved applicability

`COMPLETE_FOR_SUPPORTED_PATH` means the tariff evidence required for the stated conditional path is present. It does **not** mean an arbitrary address in the city has that provider, regime, drainage liability or special-tariff eligibility. Every city retains `addressDefaultSelection = NOT_ESTABLISHED`. `validateWaterArtifact` is the category-specific gate for deserialized releases; the generic artifact schema alone does not prove water coverage.

| City | Clean / wastewater mapping | Supported path | Result |
|---|---|---|---|
| London | Thames / Thames | Standard single-household metered; choose drainage option | Complete for supported path |
| Birmingham | Severn Trent / Severn Trent | Zone and drainage selection not established | **Incomplete** |
| Manchester | United Utilities / United Utilities | Standard metered, stated drainage liability | Complete for supported path |
| Leeds | Yorkshire / Yorkshire | Standard metered outside York Waterworks, stated drainage liability | Complete for supported path |
| Liverpool | United Utilities / United Utilities | Standard metered, stated drainage liability | Complete for supported path |
| Bristol | Bristol Water / Wessex | Standard domestic metered, split service, choose drainage option | Complete for supported path |
| Edinburgh | Scottish Water / Scottish Water | Unmetered, council tax bands A–H | Complete for supported path |
| Glasgow | Scottish Water / Scottish Water | Unmetered, council tax bands A–H | Complete for supported path |

Birmingham emits `BIRMINGHAM_WATER_APPLICABILITY_UNRESOLVED` even with all five selected Severn Trent facts present. No charging zone, surface drainage rule, default tariff or zero charge is invented.

Bristol's previous clean-water evidence gap is resolved for its **standard domestic metered path** by the primary 2026/27 Bristol Water scheme. This permits conditional metered evidence completeness alongside Wessex wastewater. Removing either clean component makes coverage incomplete and emits `BRISTOL_CLEAN_WATER_TARIFF_UNRESOLVED`. Removing Wessex wastewater also blocks completion. Bristol RV and assessed paths remain **incomplete**: their retained facts cover clean water only; corresponding wastewater evidence/applicability was not selected. No substitution from Wessex clean water or another provider/city is permitted.

The report separately distinguishes complete ingestion of the 56 selected provider facts from incomplete city/path applicability. Future consumers must inspect `cityCoverage` and conditions, not use the top-level ingestion success flag as calculator readiness.

## Scottish evidence and reference boundaries

All eight source rows are preserved as 24 annual facts: separate water, sewerage and alternative combined totals. Band D is £301.95 water, £350.37 sewerage, **£652.32 combined/year**. The £54.36 monthly arithmetic equivalent is not emitted. No band is represented as a generic average, and no council-tax charge is mixed into the water charge.

No reference-only methodology records or reference artifact are emitted. In particular, the United Utilities occupancy curve is not a billable tariff and is not retained. It cannot be transferred to another provider. Any later cross-provider model would require `UKMR_MODEL_REQUIRED`, `MODELLED_ESTIMATE` and `DEV_ONLY`; none is implemented in this slice.

## Validation and regeneration

```sh
npm run data:water:extract -- --capture-dir /tmp
npm run data:water
npm run data:water:extract -- --check --capture-dir /tmp
npm run data:water -- --check
npm run lint
npm run typecheck
npm test
git diff --check
```

Without `--capture-dir`, extraction performs offline replay from the review ledger. With it, every available captured original (including Severn's period confirmation) must match its actual checksum before any extract is written. Browser-only sources remain explicitly without original-byte verification. `--check` compares full UTF-8 bytes, not merely record counts or hashes.

Outputs under `src/data/generated/2026-27-v1/water/` are `audit.json`, `release.json` (`DIRECT_EVIDENCE_RELEASE`) and `ingestion-report.json`. The report includes every selected input row's accepted/rejected outcome, imports, counts, reconciliation diagnostics and eight city mappings. Excluded source content is explicitly scoped in the ledger, not silently treated as failed/zero tariff rows. Invalid selected rows fail generation; partial accepted rows remain visible in the in-memory audit/report. Malformed extract metadata fails before ingestion.

Tests exercise provider mappings, conditional completeness, all retained regimes, annual Scottish anchors, missing services/components, split providers, identity duplicates, altered periods/units/values/classification/provenance/applicability, unsupported mappings and occupancy inputs, full row accounting, manifest/snapshot reconciliation and deterministic artifact bytes. Prior Slice 3–6 generated artifacts and the raw workbook are checked separately against pre-slice SHA-256 baselines. The workbook must remain untracked, unchanged and outside any future commit.

Validation on 14 September 2026: lint, typecheck and all 317 tests passed (63 water tests). Extraction with captured-source checksum verification, generation and both byte-comparison `--check` commands passed. All 56 selected cells were accepted; none were rejected. Regeneration left all seven extracts and three water artifacts identical. All 17 prior generated artifacts and the raw workbook matched their pre-slice SHA-256s; the workbook remained untracked. Non-water catalog entries were unchanged. `git diff --check` passed. No commit was made.
