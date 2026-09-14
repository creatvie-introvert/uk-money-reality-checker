# Production transport fare evidence — Slice 9

Reviewed 14 September 2026 on `rebuild/next-production`, following committed/pushed Slice 8 (`7ba4b1e`). This slice contains **25 selected adult fare facts**, **8 calculated period equivalents**, and four separate development frequency assumptions. It does not establish exhaustive fare coverage or a default fare for any city.

## Source review and retained evidence

The 15 controlled extracts under `src/data/controlled/transport/` are factual transcriptions from current primary pages, not provider exports or an automated website scraper. `scripts/data/transport-reviewed-sources.json` is the explicit manual review ledger. Extraction replays that ledger offline. A new fare review must update the ledger and tests deliberately; generation never fetches the latest website or guesses replacement prices.

| Source family / publisher | Reviewed fare pages | Selected scope |
| --- | --- | --- |
| SRC-TFL / Transport for London | [Bus and tram fares](https://tfl.gov.uk/fares/find-fares/bus-and-tram-fares) | Adult PAYG, caps and Bus & Tram Passes |
| SRC-TFWM / Transport for West Midlands | [1 day bus](https://ticketing.tfwm.org.uk/Home/ShowTicket/63), [1 day network Zones 1-5](https://ticketing.tfwm.org.uk/Home/ShowTicket/38) | Participating bus scheme versus bus/tram/rail product |
| SRC-TFGM / TfGM | [Contactless bus and tram](https://tfgm.com/ways-to-pay/contactless) | Bee buses; separate all-zone bus/Metrolink weekly cap |
| SRC-MCARD / West Yorkshire Ticketing Company, MCard | [Adult tickets](https://www.m-card.co.uk/the-cards/mcard/), [validity conditions](https://www.m-card.co.uk/terms-of-use/) | Countywide bus versus bus and rail zones 1-5 |
| SRC-MERSEYTRAVEL / Merseytravel | [Solo](https://www.merseytravel.gov.uk/tickets-and-pricing/ticket-types/solo-ticket/), [Railpass](https://www.merseytravel.gov.uk/tickets-and-pricing/ticket-types/railpass-ticket/), [Trio](https://www.merseytravel.gov.uk/tickets-and-pricing/ticket-types/trio-ticket/), [Saveaway](https://www.merseytravel.gov.uk/tickets-and-pricing/ticket-types/saveaway-ticket/) | Four distinct ticket families |
| SRC-TRAVELWEST / First Bus Bristol, Bath and the West | [Tap On Tap Off](https://www.firstbus.co.uk/bristol-bath-and-west/tickets/tap-tap) | First Bus Bristol-zone adult caps only |
| SRC-EDINBURGH-TRANSPORT / Lothian and Edinburgh Trams | [Lothian fares](https://www.lothianbuses.com/fares-and-tickets/), [Tram farefinder](https://edinburghtrams.com/tickets/farefinder) | Bus single, City DAY, tram city and airport singles |
| SRC-GLASGOW-TRANSPORT / SPT and First Glasgow | [Subway](https://www.spt.co.uk/tickets/subway-tickets/), [ZoneCard](https://www.spt.co.uk/tickets/zonecard/), [First Glasgow selector](https://www.firstbus.co.uk/greater-glasgow/tickets/ticket-prices) | Subway Smartcard, ZoneCard zone 1, First City Adult FirstDay |

First Glasgow's selector was reviewed with **City / Adult / FirstDay** selected. TfGM's fare-calculation accordions and MCard's adult table were read in the browser. The four Merseytravel pages were read in full through the web reader. No search snippet is used as the authority for a retained amount.

All eight source families remain `PRIMARY_CONTROLLED_IMPORT`, now `POPULATED_PARTIAL`, with HTML access and `METADATA_ONLY` retention. No fare-specific API or redistribution licence was established. TfL's general API does not change this conclusion; OGL is not assumed.

Eight primary pages and four supporting change notices were captured to `/tmp`: their actual SHA-256 values are recorded. Seven primary extracts have no original-byte checksum (Bee, MCard, four Merseytravel pages and First Glasgow); this limitation is explicit. Originals are not copied into Git. The report carries primary snapshot metadata, while supporting notice URLs, checksums and dates remain in each relevant record's QA metadata and controlled extract. Primary manifest snapshot IDs are the snapshots supplying fare amounts.

## Effective dates and validity

`effectiveDateBasis = VERIFIED_CURRENT_AS_OF` means **the fare was verified current on 2026-09-14**. Both `effectiveFrom` and `effectiveTo` equal that date. These are evidence bounds, not a claim that the fare began or expired that day. `verifiedAsOf` makes this explicit. The schema requires that equality and rejects extension of an as-of record into unverified dates. A future review can create a new snapshot; these artifacts must not silently serve future-date fares.

Published change notices are retained separately where available:

- [SPT notice](https://www.spt.co.uk/about-us/news/subway-fares-revised-for-2026/): published 19 December 2025; adult Smartcard change from 5 January 2026.
- [Lothian notice](https://www.lothianbuses.com/news/2026/01/fares-revision/) and [Edinburgh Trams notice](https://edinburghtrams.com/news/changes-tram-fares-2026): published 30 January 2026; revised city fares from 22 February. The airport single remained unchanged; that does not establish its original start date.
- [First Bus change page](https://www.firstbus.co.uk/bristol-bath-and-west/tickets/upcoming-fare-changes) says 4 January 2026; its current Tap On Tap Off table says 1 January. Selected Bristol cap amounts agree. Historical commencement is unresolved; no conflicting historical interval is generated.

Ticket validity is separate from fare-price evidence dates. `validityPeriod`, `validity`, `fareType` and `fareUnit` distinguish a journey, one-hour Hopper transfer window, day ticket, purchased seven-day pass, Monday–Sunday cap, rolling cap week, and annual pass. `GBP/cap` is not `GBP/ticket`. Where a source only states daily validity, no unverified midnight boundary is invented. MCard's seven-day ticket runs through 03:59 at the end of its final operational day.

## City-by-city evidence

All amounts below are observed GBP prices or caps for the specified adult product, not predicted spending.

| City | Products retained | Evidence coverage | Default |
| --- | --- | --- | --- |
| London | Hopper 1.75; daily cap 5.25; Monday–Sunday cap 24.70; 7 Day Bus & Tram Pass 24.70; annual pass 988 | 5 selected TfL bus/tram facts | Unresolved |
| Birmingham | 1 day bus 5.50; 1 day network rail zones 1-5 11.10 | 2 conditional scheme products | Unresolved |
| Manchester | Bee bus daily cap 5; bus weekly cap 20; bus + tram all-zones weekly cap 41 | 3 selected contactless facts | Unresolved |
| Leeds | Countywide bus week 26; countywide bus + rail zones 1-5 week 55.30 | 2 MCard facts | Unresolved |
| Liverpool | Solo all-areas week 23.60; Railpass all-zones week 43.40; Trio all-zones week 50; Saveaway all-areas day 6.80 | 4 separate families | Unresolved |
| Bristol | First Bristol daily cap 6.80; rolling-week cap 28 | 2 operator/zone facts | Unresolved |
| Edinburgh | Lothian SINGLE 2.40; City DAY 6; tram machine city single 2.40; airport single 7.90 | 4 bus/multimodal/tram facts | Unresolved |
| Glasgow | Subway adult Smartcard single 1.80; ZoneCard zone 1 week 31; First City Adult FirstDay 6.60 | 3 distinct networks/products | Unresolved |

`transportCityMappings` indexes eligible products by consumer city without rewriting their published geography. A mapping never establishes that every trip within that city is eligible. Product records preserve issuer (`authorityOrOperator`), operator, network, modes, zones, payment medium, passenger class, airport applicability and conditions. Where airport entitlement was not established, it is explicitly `not_established`.

Every city emits `TRANSPORT_CITY_DEFAULT_PRODUCT_UNRESOLVED`. Birmingham's participating bus scheme and integrated network product are alternatives, not a resolved Birmingham-wide selection. Glasgow zone 1 includes the city centre but not all of Glasgow. First Bus Bristol is not universal Travelwest coverage. Merseytravel Solo is bus-only; standard Railpass is rail-only and is not silently replaced with the online Merseyrail-only variant. Trio and Saveaway include conditional ferry crossings; cruises require supplements, and Saveaway retains its off-peak restrictions. New MetroCard charges are recorded as separate purchase conditions, not added into the fare.

Edinburgh's City DAY includes Lothian day buses, trams excluding Airport, and East Coast/Lothian Country zones A–B; Airlink and special services are excluded. Machine tram singles retain their purchase-day and boarding-window restrictions. Tram-only et app day tickets and online airport discounts are different products and are not substituted. These selected facts do not claim completeness for every mode, ticket, discount or operator.

## Classification, arithmetic and release gates

- Published facts: `OBSERVED_DATA / RELEASE_READY`. Readiness applies to the stated fare fact only.
- Eight purchased weekly/annual derivatives: `CALCULATED / REFERENCE_ONLY`, in `calculated.json`. Seven weekly products use `fareGbp * 52 / 12`; the TfL annual pass uses `fareGbp / 12`. Exact parent record ID, amount, formula, calculation version and source provenance are retained. IEEE-754 arithmetic has no intermediate or storage rounding. These are period equivalents, not published monthly tickets or a usage forecast.
- `transportUsageProfiles` is a strict development fixture containing only the existing **1.5, 3, 5, 6.5 days/week** assumptions, classified `MODELLED_ESTIMATE / DEV_ONLY`. No fare or monetary total is attached. No daily return-journey assumption is made.

Caps are not annualized by this implementation. It does not reproduce the operator's capping system, compare tickets, assume an optimal purchase, or recommend a product. Fare optimization needs separately approved behavioural and compatibility decisions and is deferred.

The transport adapter uses the existing ingestion runner and rejects unreviewed raw values or product semantics. Duplicate identity includes operator, network, source product, modes, scope, payment, passenger, product type, duration, peak conditions and effective period. The production gate reconciles every complete normalized record and its provenance against reviewed facts, requires all 25 selected products, checks snapshot identities and row accounting, and rejects altered mappings. Calculated artifacts reconcile independently against the complete observed parent release. Strict schemas prevent calculated/modelled data or DEV_ONLY profiles entering direct fare evidence.

## Commands and files

```sh
npm run data:transport:extract
npm run data:transport:extract -- --check
# Optional: verify the 12 available captured original files against their checksums.
npm run data:transport:extract -- --check --capture-dir /tmp
npm run data:transport
npm run data:transport -- --check
npm run lint
npm run typecheck
npm test
git diff --check
```

Generated artifacts: `src/data/generated/2026-09-v1/transport/{audit,release,calculated,ingestion-report}.json`. `--check` compares exact serialization bytes and never writes. The report includes every imported row outcome, snapshot metadata, counts, coverage and unresolved city-default diagnostics.

Created: the review ledger, extraction/generation scripts, 15 controlled extracts, transport `sources.ts`, `adapters.ts`, `release.ts`, `conversions.ts`, `profiles.ts`, four generated JSONs, this methodology and `tests/data/transport.test.ts`.

Modified: transport-only portions of canonical records and source catalog, two npm commands, and existing contract/governance tests. Prior generated Slice 3–8 artifacts and the raw workbook are outside this change. No calculator or UI code is changed. Do not commit the raw workbook.

## Validation at completion

- Lint and TypeScript checks passed.
- 471 tests passed across 10 files, including 85 transport tests.
- Both extraction and generation succeeded; both `--check` commands passed.
- All 19 controlled/generated transport files were compared byte-for-byte before and after regeneration: unchanged. The 12 available captured original-source files passed checksum verification.
- All 28 generated Slice 3–8 files matched the pre-slice SHA-256 baseline.
- The raw workbook remained untracked and unchanged (SHA-256 `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`).
- `git diff --check` passed. No commit was made.

Safe to commit as a selected, as-of transport evidence ingestion slice, with unresolved city defaults, historical-date limitations, partial product coverage and reuse uncertainty explicitly retained. This is not approval to use these facts as universal city defaults or beyond their verified evidence date.
