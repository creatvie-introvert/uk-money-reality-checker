# Production energy ingestion — Milestone 1 Slice 6

Energy consumption and prices have separate production artifact families. NEED produces observed `REFERENCE_ONLY` records. Ofgem produces observed `RELEASE_READY` regional price records. Neither supplies a city-level household energy model. No bills, affordability calculations, UI or runtime calculator loading are implemented.

## DESNZ NEED evidence and selection

The [official NEED 2026 consumption release](https://www.gov.uk/government/statistics/national-energy-efficiency-data-framework-need-consumption-data-tables-2026), published 11 June 2026, supplies the multiple-attribute workbooks for [England/Wales](https://assets.publishing.service.gov.uk/media/6a282785ade52dc08822182a/Consumption_multiple_attributes_EW_2024.xlsx) and [Scotland](https://assets.publishing.service.gov.uk/media/6a282784db0592d809052b17/Consumption_multiple_attributes_Scotland_2024.xlsx). Both were downloaded to `/tmp` and inspected without modification. Their cover sheets name June 2027 as the next update. The publication page provides OGL v3.0 except where otherwise stated; this is recorded for DESNZ only.

The actual original-file SHA-256 values are:

| Workbook | SHA-256 |
| --- | --- |
| England/Wales | `3aff5f35cb4757aa30855d3a6f8c085e3b80b1ca854b500b7ffb51a2a904a084` |
| Scotland | `2296529b99c4f3142c6cb7dbe5850b1418b2f145598f74a557287d861ff7900e` |

The controlled extracts retain **2024 source-year** rows. This is not calendar-year consumption: the workbook cover defines gas year 2024 as mid-May 2024 to mid-May 2025 and electricity year 2024 as February 2024 to January 2025. UKMR does not invent precise daily boundaries for the approximate gas period. Source year and publication/retrieval/import dates remain distinct.

The source Table sheet has 7,368 England/Wales and 659 Scottish rows for 2024. This slice retains a bounded, explicitly **partial joint-table selection**, not every combination and not a representative household sample. Selection proceeds in published row order, retaining the first row for each source region/property-type pairing and the first rows needed to cover remaining native dimension values. The reviewed row numbers, vocabulary and original checksums are pinned in `scripts/data/energy-sources.json`.

The result is 82 England/Wales profiles and 18 Scottish profiles. These give 648 and 136 applicable fuel/statistic observations respectively: **784 references**. A selection used to exercise the source dimensions must not become an implicit default profile, household estimate, city estimate or category-harmonization model.

`src/data/controlled/energy/need-*-2024.json` retains the full selected source rows, including literal numeric precision and `[no data]` cells, alongside unpivoted observations with sheet/row/cell/heading references. Snapshots are metadata-only for the original workbooks; only labelled UKMR-controlled extracts enter Git. The source register's historical `MODELLED` governance label for `SRC-003` remains unchanged. It does not change the classification of these observed reference inputs or promote any previous modelled UKMR profiles.

## NEED dimensions, units and limitations

Each reference preserves native property type, property age, bedrooms, gas-present flag, electricity type, sample count, fuel, statistic, source geography and year. Annual consumption is positive `kWh/year`. Mean, lower quartile, median and upper quartile are separate source observations. Sample count is the workbook's `Number in sample` for the profile, not an invented fuel-specific count. Published numeric precision is preserved as literal QA text and parsed as a finite number, without a new rounding rule.

England/Wales rows retain the workbook's region code/name. Wales is represented as a country; English regions remain regions. Scotland is national `Scotland`, with no fabricated code or sub-national applicability.

| Dimension | England/Wales examples | Scottish examples |
| --- | --- | --- |
| Flats | Converted flat; Purpose built flat | Flat |
| Terraces | End terrace; Mid terrace | Terraced |
| Age | Pre 1919; 1919 - 1944; 2012 onwards | Up to 1870; 1871 - 1919; 2010 onwards |

All native categories, including Scottish `Unknown` values, remain distinct. There is no adult occupancy, household composition, heating type or city field at this joint dimensionality. Other NEED tables have different dimensions; this slice does not join them to manufacture household combinations. Any future common category mapping must be a separately reviewed methodology/model layer.

The workbook covers explain matched-meter eligibility, exclusion of imputed consumption, consumption eligibility ranges and exclusion of categories with fewer than 30 households. `[no data]` means no matched gas consumption data for profiles without gas meters. Those cells remain in the controlled profile context and are explicitly outside applicable gas-statistic coverage; they never become numeric zero. If a required observation carries a marker or invalid/nonpositive value, ingestion rejects it and no successful reference artifact is emitted.

## Ofgem evidence and capture

The [official regional price-cap page](https://www.ofgem.gov.uk/information-consumers/energy-advice-households/energy-price-cap-unit-rates-and-standing-charges) was captured on 14 September 2026. It embeds public Everviz tables, with actual JSON data within their injection scripts. Snapshots identify the actual embedded captures as `JAVASCRIPT`, while catalogue access remains the official HTML page. Extraction parses the JSON text without executing the scripts. The official page links each captured embed, establishing its source relationship. The exact embed URLs, versions and actual captured-byte checksums are pinned in `energy-sources.json`; each controlled extract has its own registered snapshot, plus the official page URL/checksum.

This is a verified capture route, **not a stable public API or durable static export contract**. Reuse/licensing remains unresolved. Neither the complete Ofgem page nor the scripts are retained in Git. Metadata-only snapshots explain the non-retention reason; labelled UKMR-controlled extracts retain only selected rate facts and provenance. No Ofgem OGL permission is asserted. `SRC-OFGEM-REGIONAL` now has `POPULATED_PARTIAL` governance status for the reviewed regional evidence; this does not resolve city applicability or licensing.

The page mixes current and forthcoming quarter headings. Every captured table explicitly labels both July–September 2026 and October–December 2026 columns. This release selects only **1 July–30 September 2026**, the effective quarter at retrieval, using those column headings rather than a surrounding section heading. The forthcoming quarter and Great Britain averages are excluded; the latter are explicitly listed in each extract's excluded-source-row metadata.

Nine table captures supply 14 regions each: **126 price records** covering Direct Debit, standard credit and prepayment meter, each with gas, single-rate electricity and multi-rate electricity. Each record pairs the same row's unit rate and standing charge. Gas has no electricity tariff type. Multi-rate is the source's published combined cap measure; it does not provide separate peak/off-peak rates and must not be used as an individual Economy 7 time-of-day rate.

Ofgem publishes the selected charges in pence with two decimal places. Normalization converts pence to GBP, using decimal text to avoid an additional rounding operation: `unitRateGbpPerKwh` and `standingChargeGbpPerDay`. The raw strings, column labels, table title/id and row are retained. Rates are used as published; no VAT adjustment or bill arithmetic is performed. Price `rateBasis` explicitly says `published_cap_rate`.

## City/region handling

Ofgem's region lookup is postcode-based; authoritative postcode/DNO boundary evidence is needed before assigning consumer locations. A source region named London is not permission to assign `LOC-LON`. The canonical energy geography schema deliberately has no MVP-city field and rejects one if supplied. The same applies to NEED reference geography.

Regional price completeness and city applicability are separate. `ENERGY_CITY_REGION_MAPPING_UNRESOLVED` is emitted in price coverage, whose city status remains `UNRESOLVED`. NEED city coverage is `NOT_APPLICABLE`, with a diagnostic explaining the absent joint dimensions. There are no city averages, regional substitutions or postcode guesses.

## Production gates and artifacts

The adapters use the shared ingestion runner. Each unpivoted NEED observation and regional Ofgem row has an accepted/rejected outcome retaining its raw input; counts reconcile without silent drops. Strict row and canonical energy schemas reject invented dimensions, unsupported fuel/statistic/tariff combinations, malformed values and dates. The source-native NEED vocabularies are validated separately by source nation group.

`validateEnergyCoverage` requires the complete reviewed selection, exact geography/year/dimensions, values, classification, QA and provenance. Missing/duplicate observations or altered source cells fail. `validateEnergyArtifact` also enforces the correct artifact family and the registered actual-checksum snapshot metadata. Use this specialized gate when loading deserialized energy artifacts; generic artifact shape validation alone is insufficient.

All six outputs are deterministic and versioned:

- `src/data/generated/2024-v1/energy-consumption/audit.json`
- `src/data/generated/2024-v1/energy-consumption/reference.json`
- `src/data/generated/2024-v1/energy-consumption/ingestion-report.json`
- `src/data/generated/2026-q3-v1/energy-prices/audit.json`
- `src/data/generated/2026-q3-v1/energy-prices/release.json`
- `src/data/generated/2026-q3-v1/energy-prices/ingestion-report.json`

Both families must validate successfully before the generator writes either. Reports include the imports, source outcomes, coverage scope, accounting and unresolved-city diagnostics. Deterministic output uses fixed snapshot/import/generation metadata and stable ordering. No reference-only rows enter the direct price release.

## Reproduction and remaining limitations

Download the two official workbooks and nine exact embedded scripts named in `scripts/data/energy-sources.json` to the `/tmp/ukmr-*` filenames used by the extraction script, together with the official Ofgem page. All downloads are read-only source captures. These mutable sources may later change; a checksum mismatch requires a new source review, not disabling verification.

```sh
npm run data:energy:extract
npm run data:energy:extract -- --check
npm run data:energy
npm run data:energy -- --check
npm run lint
npm run typecheck
npm test
git diff --check
```

`--source-dir` allows an alternate directory containing the same named captures. Extraction and generation `--check` modes compare full serialized bytes without writing. Tests cover both NEED source vocabularies, native geography/dimensions, applicable fuels/statistics, source markers, invalid values, Ofgem's 14 regions and nine combinations, tariff semantics, dates, duplicate/missing rows, raw row accounting, source/snapshot tampering, forbidden city mappings, artifact families and all six output bytes.

Remaining issues are explicit: the full NEED joint tables are only partially retained; household/adult-occupancy/city model dimensions are unavailable here; Ofgem city-region mapping and reuse/licensing remain unresolved; an enduring export/API mechanism and precise source publication timestamp are not established. These limitations do not change the observed nature of the retained references or regional rate facts. Earlier Slice 3–5 generated artifacts and the user's untracked raw workbook remain outside this slice's changes.
