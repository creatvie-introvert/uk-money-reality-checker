# Source catalogue reconciliation

The user-supplied “Milestone 1 Slice 2 Reconciliation Pass: Source Catalogue Verification”, Batches 1–4, is the authoritative research record for this pass. This ledger records its application without a new source audit, source fetch or workbook modification. All 26 entries were updated because each previously carried a blanket missing-audit note. Existing IDs and source-governance labels remain unchanged.

## Entry decisions

| Source ID | Source | Reconciliation |
| --- | --- | --- |
| SRC-001 | ONS PIPR | XLSX controlled import; no verified PIPR API. Locked geography codes and Edinburgh/Greater Glasgow limitations preserved. ONS OGL qualification recorded. |
| SRC-002 | MHCLG council tax | ODS; 2026/27. Bristol Table 9 gap resolved. London remains individual authorities, with no invented scalar. |
| SRC-020 | Scottish Government council tax | XLSX; 2026/27 City of Edinburgh and Glasgow City schedules verified. Raw precision and official two-decimal monetary display remain distinct. |
| SRC-003 | DESNZ NEED | XLSX/ODS reference input. Joint geography/occupancy gaps and vocabulary differences recorded. Existing UKMR profiles remain MODELLED_ESTIMATE / DEV_ONLY. |
| SRC-OFGEM-REGIONAL | Ofgem regional price cap | HTML/table-export route, exact export unresolved. Postcode-boundary evidence required; no city-only substitution, static resource/API claim or OGL assumption. |
| SRC-014 | Thames Water | London clean and wastewater mapping verified; provider-specific reuse unresolved. |
| SRC-SEVERN-TRENT | Severn Trent | Birmingham tariff source gap resolved; zone/regime mapping still requires validation before RELEASE_READY. |
| SRC-015 | United Utilities | Manchester/Liverpool clean and wastewater. Occupancy curve is supplier-specific; transfer remains modelled and DEV_ONLY. |
| SRC-017 | Yorkshire Water | Leeds clean and wastewater; tariff components/regimes remain separate. |
| SRC-BRISTOL-WATER | Bristol Water | Bristol clean water; complete current tariff evidence still unverified. Complete Bristol water remains BLOCKED_FROM_RELEASE. |
| SRC-018 | Wessex Water | Current Bristol wastewater evidence available. Does not resolve Bristol clean water; POPULATED_PARTIAL governance retained. |
| SRC-010 | Scottish Water | Edinburgh/Glasgow; unmetered Council Tax band regime distinct from metered. General April–March period is not converted into invented effective dates. |
| SRC-005 | Defra Family Food | ODS + CSV codebank; qualified OGL v3.0. Per-person/week source input, calculated conversion and potentially modelled household mapping remain distinct. Open-ended groups receive no invented people counts. |
| SRC-006 | ONS Family Spending | FYE 2025 XLSX; qualified OGL v3.0. Category corrected from essentials_lifestyle to coicop_expenditure. UKMR views/mappings remain later methodology. |
| SRC-TFL | TfL | Controlled fare import; a general API platform does not verify a fare endpoint. |
| SRC-TFWM | TfWM / Swift / operators | Authority identity expanded. No universal Birmingham fare set; operator/integrated products and DEV_ONLY behavioural profiles remain distinct. |
| SRC-TFGM | TfGM / Bee Network | Controlled import; complete integrated fare evidence remains partly unresolved. |
| SRC-MCARD | West Yorkshire / MCard / operators | Operator identity included; operator fares remain separate from multi-operator products. |
| SRC-MERSEYTRAVEL | Merseytravel | Solo, Railpass, Trio and Saveaway named and kept separate. |
| SRC-TRAVELWEST | Travelwest / First Bus / relevant operators | First Bus is not a universal West of England integrated fare. |
| SRC-EDINBURGH-TRANSPORT | Lothian / Edinburgh Trams | Bus/tram/city/airport/network products remain separate. |
| SRC-GLASGOW-TRANSPORT | SPT / First Bus / ZoneCard | Generic Glasgow operator placeholder replaced with audited identities; Subway, First Bus and ZoneCard systems remain separate. |
| SRC-011 | HMRC income tax | HTML reference, OGL v3.0, rUK 2026/27 effective 2026-04-06 to 2027-04-05; no API claim. |
| SRC-013 | Scottish Government income tax | HTML reference, OGL v3.0; HMRC allowance/taper dependency explicit. No unverified dates copied from rUK. |
| SRC-012 | HMRC NI | Publication corrected to Rates and thresholds for employers 2026/27. HTML current route; historical ODS recorded only in notes. Class 1 category dimension preserved; A is a later scenario assumption. Generic previous URL removed pending exact audited publication URL. |
| SRC-HOUSEHOLD-EQUIVALENCE | ONS reference for OECD-modified scale | Income-equivalence reference only. Audit weights recorded in notes, with no automatic application to spending, water or energy. Existing ONS methodology reference retained. |

The existing separation of regional Ofgem from national averages, retained governance labels, Bristol provider split and supplier-specific occupancy evidence was already correct. No entry was wholly unchanged. No incorrect affirmative API or provider-licence claim existed to remove; the prior missing-audit blanket statements were replaced by specific findings and remaining uncertainties.

## Metadata boundaries

- `suitability` is separate from both `sourceStatus` and record release status. Groceries use REFERENCE_INPUT at catalogue level, with observed-source suitability explained by record layer; ONS COICOP observations use OBSERVED_SOURCE_INPUT. Neither class creates calculator-ready data.
- Existing source-register governance labels are preserved, including MODELLED, POPULATED_DEV and POPULATED_PARTIAL. The audits do not assign new governance labels to the additional source definitions, so those statuses remain absent with explanations.
- Optional access metadata remains necessary. Batch 2 says HTML and/or PDFs are typical water mechanisms, without verifying each provider's exact mechanism. Batch 3 does not establish product-specific formats. These entries do not assert HTML/PDF/API/CSV/JSON availability individually. The known mechanism descriptions remain in their notes.
- Ofgem HTML is verified, but its export method, stable resource, boundary mapping and reuse permission remain unresolved. Provider/operator reuse also remains unresolved. No OGL is assumed for those sources, or for MHCLG, DESNZ and Scottish council tax where the supplied audits do not establish it.
- OGL v3.0 is recorded for audited HMRC/Scottish income tax and NI, and with the “unless otherwise stated” qualification for ONS/Defra material. Raw retention policies remain PENDING_REVIEW; a generic licence statement does not inspect all material in a future snapshot.
- Publication dates and refresh cadence remain absent for all entries. The audited rUK effective dates are the only exact effective dates added. General annual periods, historical workbook dates and source periods are not substituted for publication/effective dates.
- Existing URLs remain references, not promises of stable current downloads. Exact missing URLs are not invented; `sourceReference` identifies the corresponding batch and source. Transport titles describe the audited product families, not an invented document edition or combined universal fare publication.

The only schema additions are optional suitability, source reference and effective dates, with an ordering check for those new dates. These fields were missing from the catalogue despite being needed to preserve verified findings. The pre-existing optional access/status change remains justified; unresolved values still require an explanation. No ingestion contracts, release-status enums or canonical record categories were changed.

## Future one-to-many normalization

The existing one-row-to-one-record framework is unchanged. The following are adapter-design implications of the researched dimensions, not claims that every physical source row has a particular layout:

- Council tax band tables may require one authority row to become multiple band records. Scottish schedules may also require separate service components.
- NEED distributions may require multiple fuel/statistic observations from one combination of dimensions. PIPR may require period/measure columns to be unpivoted; absent bedroom/property crosses must never be manufactured.
- Ofgem tables may require separate unit-rate and standing-charge records by fuel/payment/tariff/period. Water schedules may require separate fixed, volumetric, clean-water and wastewater components.
- Defra/ONS expenditure tables may require household-group/quintile/period columns to be unpivoted into source observations.
- Transport product tables may require separate ticket, passenger, zone or validity variants. The audited product systems must not be merged during expansion.
- Tax/NI tables may require band/category/threshold/rate columns to be normalized separately. Equivalence methodology tables may require separate household-member classes if represented as records later.

Future adapters must inspect actual source layout before choosing row boundaries. Any one-to-many extension needs explicit source-row lineage, output counts and rejection accounting. It must not use expansion to create missing observations, defaults, behavioural profiles or modelled values implicitly.
