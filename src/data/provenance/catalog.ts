import { sourceCatalogSchema } from "./source-catalog";

// Reconciled against the user-supplied Batch 1–4 research record.
// Existing IDs and source-register governance labels are preserved; research
// suitability and record release status are separate concepts.
// See docs/data/source-catalogue-reconciliation.md for the evidence ledger.
export const sourceCatalog = sourceCatalogSchema.parse([
  {
    "sourceId": "SRC-001",
    "category": "rent",
    "organisation": "ONS",
    "publicationTitle": "Price Index of Private Rents",
    "sourceUrl": "https://www.ons.gov.uk/economy/inflationandpriceindices/datasets/priceindexofprivaterentsukmonthlypricestatistics",
    "sourceStatus": "POPULATED",
    "authority": "PRIMARY",
    "sourceReference": "ONS 19 August 2026 edition; Table 1; controlled July 2026 cell extract",
    "publicationDate": "2026-08-19",
    "sourcePeriod": "2026-07",
    "refreshCadence": "Monthly; next release 16 September 2026 (verified 14 September 2026)",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "METADATA_ONLY",
    "useNote": "Official XLSX controlled import. PIPR-specific API not verified; general ONS API availability is not evidence of a PIPR endpoint. Wider rental stock, not asking rents. London is region E12000007. Birmingham E08000025; Manchester E08000003; Leeds E08000035; Liverpool E08000012; Bristol E06000023. No direct Edinburgh/City of Edinburgh row or closer current ONS city source was identified. Greater Glasgow S33000009 must not be relabelled Glasgow City. Arbitrary bedroom × property-type crosses are unavailable; Scottish source characteristics differ.",
    "unresolvedMetadata": [
      "Edinburgh rent source remains unresolved; no fallback is approved."
    ],
    "accessMechanisms": [
      "XLSX"
    ],
    "licenceReference": "OGL v3.0 unless otherwise stated (ONS material; Batch 2)"
  },
  {
    "sourceId": "SRC-002",
    "category": "council_tax",
    "organisation": "MHCLG",
    "publicationTitle": "Council tax levels set by local authorities in England 2026/27",
    "sourceUrl": "https://www.gov.uk/government/statistics/council-tax-levels-set-by-local-authorities-in-england-2026-to-2027",
    "sourceStatus": "POPULATED",
    "authority": "PRIMARY",
    "sourceReference": "Batch 1 — COUNCIL TAX — ENGLAND",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "METADATA_ONLY",
    "useNote": "Official ODS controlled import. Verified authority codes: Birmingham E08000025, Manchester E08000003, Leeds E08000035, Liverpool E08000012, Bristol E06000023. Current Table 9 resolves the previous Bristol coverage gap. London is represented by individual authorities; no source-supported single London scalar or invented average. Slice 4: official file inspected 2026-09-14; controlled cell extracts retain actual original-file SHA-256, source raw precision and displayed monetary values. See docs/data/production-council-tax.md.",
    "unresolvedMetadata": [
      "Refresh cadence not verified."
    ],
    "accessMechanisms": [
      "ODS"
    ],
    "sourcePeriod": "2026/27",
    "effectiveFrom": "2026-04-01",
    "effectiveTo": "2027-03-31",
    "licenceReference": "Open Government Licence v3.0, except where otherwise stated (official publication page verified 2026-09-14)"
  },
  {
    "sourceId": "SRC-020",
    "category": "council_tax",
    "organisation": "Scottish Government",
    "publicationTitle": "Council Tax datasets",
    "sourceUrl": "https://www.gov.scot/publications/council-tax-datasets/",
    "sourceStatus": "POPULATED",
    "authority": "PRIMARY",
    "sourceReference": "Batch 1 — COUNCIL TAX — SCOTLAND",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "METADATA_ONLY",
    "useNote": "Official XLSX controlled import verifies current City of Edinburgh and Glasgow City 2026/27 schedules. Retain ratio-derived raw precision for audit; normalized amounts follow the official two-decimal pounds/pence display without a different invented rounding rule. Slice 4: official file inspected 2026-09-14; controlled cell extracts retain actual original-file SHA-256, source raw precision and displayed monetary values. See docs/data/production-council-tax.md.",
    "unresolvedMetadata": [
      "Refresh cadence not verified."
    ],
    "accessMechanisms": [
      "XLSX"
    ],
    "sourcePeriod": "2026/27",
    "effectiveFrom": "2026-04-01",
    "effectiveTo": "2027-03-31",
    "licenceReference": "Open Government Licence v3.0, except where otherwise stated (official publication page verified 2026-09-14)"
  },
  {
    "sourceId": "SRC-003",
    "category": "energy_consumption",
    "organisation": "DESNZ",
    "publicationTitle": "NEED consumption data tables 2026",
    "sourceUrl": "https://www.gov.uk/government/statistics/national-energy-efficiency-data-framework-need-consumption-data-tables-2026",
    "sourceStatus": "MODELLED",
    "authority": "PRIMARY",
    "sourceReference": "NEED 2026 multiple-attribute workbooks; selected 2024 rows",
    "publicationDate": "2026-06-11",
    "sourcePeriod": "2024",
    "refreshCadence": "Annual; workbook next update June 2027",
    "licenceReference": "Open Government Licence v3.0 except where otherwise stated; GOV.UK publication checked 2026-09-14",
    "suitability": "REFERENCE_INPUT",
    "rawSnapshotPolicy": "METADATA_ONLY",
    "useNote": "England/Wales multiple-attribute tables include region, property type, property age, bedrooms, gas present, electricity type and gas/electricity distributions. No adult-occupancy dimension or city/local-authority field exists at that joint dimensionality. Scotland has no sub-national geography at that joint dimensionality; property/age vocabularies differ. Existing UKMR profiles remain MODELLED_ESTIMATE and DEV_ONLY. MODELLED is the retained source-register governance label, not a promotion or a claim that source observations are modelled.",
    "unresolvedMetadata": [
      "Full joint-table coverage is outside the controlled selection; no city/adult-occupancy model is provided."
    ],
    "accessMechanisms": [
      "XLSX",
      "ODS"
    ]
  },
  {
    "sourceId": "SRC-OFGEM-REGIONAL",
    "category": "energy_price",
    "organisation": "Ofgem",
    "publicationTitle": "Regional price-cap unit rates and standing charges",
    "authority": "PRIMARY",
    "sourceReference": "Nine regional tables embedded by the official Ofgem page; July–September 2026 columns",
    "sourceUrl": "https://www.ofgem.gov.uk/information-consumers/energy-advice-households/energy-price-cap-unit-rates-and-standing-charges",
    "sourceStatus": "POPULATED_PARTIAL",
    "sourcePeriod": "2026-Q3",
    "effectiveFrom": "2026-07-01",
    "effectiveTo": "2026-09-30",
    "licenceReference": "UNRESOLVED — no OGL assumption; raw captures not retained in Git",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "METADATA_ONLY",
    "useNote": "Regional unit rates and standing charges vary by fuel, payment method, tariff type and effective period. Selection is fundamentally postcode-based; Ofgem references NESO DNO boundaries and OS Code-Point Open. No city-only mappings without authoritative postcode-boundary evidence. Official HTML embeds nine public Everviz tables; exact embedded capture URLs and checksums verified 2026-09-14. These mutable embeds are not a stable API. Do not substitute SRC-004 national-average evidence or assume raw files are redistributable.",
    "unresolvedMetadata": [
      "Publication date and refresh cadence were not verified in Batch 1–4.",
      "Exact table export mechanism and stable download resource remain unresolved.",
      "Reuse/licensing remains unresolved; do not assume OGL.",
      "Authoritative postcode-boundary mapping remains required.",
      "City applicability remains unresolved despite complete retained regional rows."
    ],
    "accessMechanisms": [
      "HTML"
    ]
  },
  {
    "sourceId": "SRC-014",
    "category": "water",
    "organisation": "Thames Water",
    "publicationTitle": "Thames Water: household charges 2026/27",
    "sourceUrl": "https://www.thameswater.co.uk/media-library/toecnx2l/charges-scheme-2026-27.pdf",
    "sourceStatus": "POPULATED",
    "authority": "PRIMARY",
    "sourceReference": "Batch 2 — WATER: Thames Water",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "METADATA_ONLY",
    "useNote": "Slice 7 reviewed provider tariff facts; city eligibility is separate. Confirm both service providers and standard single-household metered tariff; bulk meters, SmartSaver and social tariffs excluded. Full and surface-water-abated wastewater fixed charges are alternatives.",
    "unresolvedMetadata": [
      "Publication date not independently verified; charge year/effective dates retained.",
      "Provider-specific reuse/licensing unresolved. Only controlled tariff facts retained."
    ],
    "sourcePeriod": "2026/27",
    "effectiveFrom": "2026-04-01",
    "effectiveTo": "2027-03-31",
    "accessMechanisms": [
      "PDF"
    ],
    "licenceReference": "UNRESOLVED: provider-specific reuse/redistribution; no OGL assumption"
  },
  {
    "sourceId": "SRC-SEVERN-TRENT",
    "category": "water",
    "organisation": "Severn Trent",
    "publicationTitle": "Severn Trent: household charges 2026/27",
    "authority": "PRIMARY",
    "sourceReference": "Batch 2 — WATER: Severn Trent",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "METADATA_ONLY",
    "useNote": "Slice 7 reviewed provider tariff facts; city eligibility is separate. Zone 1–8 and public sewer connection must be confirmed. Surface drainage tariff not selected: rateable-value zone or property-type basis unresolved. BIRMINGHAM_WATER_APPLICABILITY_UNRESOLVED: no city-default zone or drainage selection.",
    "unresolvedMetadata": [
      "Publication date not independently verified; charge year/effective dates retained.",
      "Provider-specific reuse/licensing unresolved. Only controlled tariff facts retained.",
      "Birmingham charging zone and surface drainage basis unresolved."
    ],
    "sourceUrl": "https://www.stwater.co.uk/my-account/our-charges/metered-charges/",
    "sourcePeriod": "2026/27",
    "effectiveFrom": "2026-04-01",
    "effectiveTo": "2027-03-31",
    "accessMechanisms": [
      "HTML"
    ],
    "licenceReference": "UNRESOLVED: provider-specific reuse/redistribution; no OGL assumption",
    "sourceStatus": "POPULATED_PARTIAL"
  },
  {
    "sourceId": "SRC-015",
    "category": "water",
    "organisation": "United Utilities",
    "publicationTitle": "United Utilities: household charges 2026/27",
    "sourceUrl": "https://www.unitedutilities.com/my-account/your-bill/our-household-charges-20262027/how-bills-for-households-with-a-meter-are-changing-for-20262027/",
    "sourceStatus": "POPULATED",
    "authority": "PRIMARY",
    "sourceReference": "Batch 2 — WATER: United Utilities",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "METADATA_ONLY",
    "useNote": "Slice 7 reviewed provider tariff facts; city eligibility is separate. Confirm both services, standard metered tariff and drainage liability. Charges before any optional Direct Debit discount; source occupancy curve excluded and non-transferable.",
    "unresolvedMetadata": [
      "Publication date not independently verified; charge year/effective dates retained.",
      "Provider-specific reuse/licensing unresolved. Only controlled tariff facts retained."
    ],
    "sourcePeriod": "2026/27",
    "effectiveFrom": "2026-04-01",
    "effectiveTo": "2027-03-31",
    "accessMechanisms": [
      "HTML"
    ],
    "licenceReference": "UNRESOLVED: provider-specific reuse/redistribution; no OGL assumption"
  },
  {
    "sourceId": "SRC-017",
    "category": "water",
    "organisation": "Yorkshire Water",
    "publicationTitle": "Yorkshire Water: household charges 2026/27",
    "sourceUrl": "https://www.yorkshirewater.com/bill-account/how-we-work-out-your-bill/customers-with-a-meter/",
    "sourceStatus": "POPULATED",
    "authority": "PRIMARY",
    "sourceReference": "Batch 2 — WATER: Yorkshire Water",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "METADATA_ONLY",
    "useNote": "Slice 7 reviewed provider tariff facts; city eligibility is separate. Confirm standard metered tariff, both services and surface-water drainage liability; York Waterworks rates excluded. Foul sewerage source basis is 95% of water supplied; no consumption adjustment calculated here.",
    "unresolvedMetadata": [
      "Publication date not independently verified; charge year/effective dates retained.",
      "Provider-specific reuse/licensing unresolved. Only controlled tariff facts retained."
    ],
    "sourcePeriod": "2026/27",
    "effectiveFrom": "2026-04-01",
    "effectiveTo": "2027-03-31",
    "accessMechanisms": [
      "HTML"
    ],
    "licenceReference": "UNRESOLVED: provider-specific reuse/redistribution; no OGL assumption"
  },
  {
    "sourceId": "SRC-BRISTOL-WATER",
    "category": "water",
    "organisation": "Bristol Water",
    "publicationTitle": "Bristol Water: household charges 2026/27",
    "authority": "PRIMARY",
    "sourceReference": "Batch 2 — WATER: Bristol Water",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "METADATA_ONLY",
    "useNote": "Slice 7 reviewed provider tariff facts; city eligibility is separate. Confirm Bristol Water supply area and standard domestic tariff. Appendix III seasonal tariff trial, social tariffs and non-domestic premises excluded. Assessed tariff only where a meter cannot be fitted and customer elects assessed charges; source bedroom rules apply. Wessex is the separate wastewater provider; neither company is substituted for the other. Regulated company: South West Water Limited, Bristol Water area/brand; appointment changed 1 February 2023 (scheme page 3).",
    "unresolvedMetadata": [
      "Publication date not independently verified; charge year/effective dates retained.",
      "Provider-specific reuse/licensing unresolved. Only controlled tariff facts retained."
    ],
    "sourceUrl": "https://www.bristolwater.co.uk/hubfs/BRL%20Household%20Charges%20Scheme%202026-27.pdf",
    "sourcePeriod": "2026/27",
    "effectiveFrom": "2026-04-01",
    "effectiveTo": "2027-03-31",
    "accessMechanisms": [
      "PDF"
    ],
    "licenceReference": "UNRESOLVED: provider-specific reuse/redistribution; no OGL assumption",
    "sourceStatus": "POPULATED_PARTIAL"
  },
  {
    "sourceId": "SRC-018",
    "category": "water",
    "organisation": "Wessex Water",
    "publicationTitle": "Wessex Water: household charges 2026/27",
    "sourceUrl": "https://www.wessexwater.co.uk/bills-and-accounts/our-charges/metered-charges",
    "sourceStatus": "POPULATED_PARTIAL",
    "authority": "PRIMARY",
    "sourceReference": "Batch 2 — WATER: Wessex Water",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "METADATA_ONLY",
    "useNote": "Slice 7 reviewed provider tariff facts; city eligibility is separate. Wastewater only in this selection; Wessex clean-water table deliberately excluded. Standing charge includes rainwater and highway drainage. Full and reduced are alternatives. Source allows 5% non-return to sewer; retained as a source condition, no calculation.",
    "unresolvedMetadata": [
      "Publication date not independently verified; charge year/effective dates retained.",
      "Provider-specific reuse/licensing unresolved. Only controlled tariff facts retained."
    ],
    "sourcePeriod": "2026/27",
    "effectiveFrom": "2026-04-01",
    "effectiveTo": "2027-03-31",
    "accessMechanisms": [
      "HTML"
    ],
    "licenceReference": "UNRESOLVED: provider-specific reuse/redistribution; no OGL assumption"
  },
  {
    "sourceId": "SRC-010",
    "category": "water",
    "organisation": "Scottish Water",
    "publicationTitle": "Scottish Water: household charges 2026/27",
    "sourceUrl": "https://www.scottishwater.co.uk/your-home/your-charges/your-charges-2026-2027/unmetered-charges-2026-2027",
    "sourceStatus": "POPULATED",
    "authority": "PRIMARY",
    "sourceReference": "Batch 2 — WATER: Scottish Water",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "METADATA_ONLY",
    "useNote": "Slice 7 reviewed provider tariff facts; city eligibility is separate. Select actual council tax band and connected services; annual charges before eligible discounts/reductions. Combined total is an alternative published total, never an additional bill component. Scottish metered households are a separate unsupported path.",
    "unresolvedMetadata": [
      "Publication date not independently verified; charge year/effective dates retained.",
      "Provider-specific reuse/licensing unresolved. Only controlled tariff facts retained."
    ],
    "sourcePeriod": "2026/27",
    "effectiveFrom": "2026-04-01",
    "effectiveTo": "2027-03-31",
    "accessMechanisms": [
      "HTML"
    ],
    "licenceReference": "UNRESOLVED: provider-specific reuse/redistribution; no OGL assumption"
  },
  {
    "sourceId": "SRC-005",
    "category": "groceries",
    "organisation": "Defra",
    "publicationTitle": "Family Food household composition expenditure",
    "sourceUrl": "https://www.gov.uk/government/statistical-data-sets/family-food-datasets",
    "sourceStatus": "POPULATED_DEV",
    "authority": "PRIMARY",
    "sourceReference": "Batch 2 — GROCERIES",
    "suitability": "REFERENCE_INPUT",
    "rawSnapshotPolicy": "PENDING_REVIEW",
    "useNote": "ODS expenditure data plus CSV codebank. Source expenditure is observed per-person/per-week input; suitability depends on record layer. Weekly-to-monthly conversion is CALCULATED; household-profile mapping may be MODELLED_ESTIMATE. Never invent people counts for open-ended household groups; unsupported open-ended totals remain blocked.",
    "unresolvedMetadata": [
      "Publication date and refresh cadence were not verified in Batch 1–4.",
      "Current source edition/period was not identified by the supplied audit.",
      "Existing reference URL retained from Slice 2; Batch 1–4 did not verify this exact URL as a current download endpoint."
    ],
    "accessMechanisms": [
      "ODS",
      "CSV"
    ],
    "licenceReference": "OGL v3.0 unless otherwise stated (Batch 2)"
  },
  {
    "sourceId": "SRC-006",
    "category": "coicop_expenditure",
    "organisation": "ONS",
    "publicationTitle": "Family Spending FYE 2025 — Workbook 1",
    "sourceUrl": "https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/expenditure/datasets/familyspendingworkbook1detailedexpenditureandtrends",
    "sourceStatus": "POPULATED",
    "authority": "PRIMARY",
    "sourceReference": "Batch 2 — ESSENTIALS / LIFESTYLE",
    "suitability": "OBSERVED_SOURCE_INPUT",
    "rawSnapshotPolicy": "PENDING_REVIEW",
    "useNote": "Source-level COICOP expenditure rows are OBSERVED_DATA. Period conversion and category summation are CALCULATED. UKMR household-profile mapping may be MODELLED_ESTIMATE. Essentials/lifestyle are later UKMR views and mappings, not native observed ONS categories.",
    "unresolvedMetadata": [
      "Publication date and refresh cadence were not verified in Batch 1–4.",
      "Existing reference URL retained from Slice 2; Batch 1–4 did not verify this exact URL as a current download endpoint."
    ],
    "sourcePeriod": "FYE 2025",
    "accessMechanisms": [
      "XLSX"
    ],
    "licenceReference": "OGL v3.0 unless otherwise stated (Batch 2)"
  },
  {
    "sourceId": "SRC-TFL",
    "category": "transport",
    "organisation": "TfL",
    "publicationTitle": "TfL fare products",
    "authority": "PRIMARY",
    "sourceReference": "Batch 3 — TfL",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "PENDING_REVIEW",
    "useNote": "General open-data/API platform confirmed, but fare-product-specific API/resource not verified. Keep PRIMARY_CONTROLLED_IMPORT; do not infer PRIMARY_AUTOMATED from the Unified API. Published products are OBSERVED_DATA; monthly equivalents/repeated travel arithmetic are CALCULATED. Occasional/hybrid/regular/frequent profiles remain MODELLED_ESTIMATE / DEV_ONLY until approved. Preserve operator network, authority area, zone or region; MVP-city applicability is a separate mapping. No universal UK transport API.",
    "unresolvedMetadata": [
      "Publication date and refresh cadence were not verified in Batch 1–4.",
      "Exact product URLs, access formats and source-governance status were not verified in Batch 3.",
      "Operator-specific reuse/licensing remains unresolved; do not assume OGL.",
      "Exact source URL remains unresolved; the audit source reference identifies the evidence."
    ]
  },
  {
    "sourceId": "SRC-TFWM",
    "category": "transport",
    "organisation": "TfWM / Swift / operators",
    "publicationTitle": "West Midlands fare products",
    "authority": "PRIMARY",
    "sourceReference": "Batch 3 — TfWM / Swift / operators",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "PENDING_REVIEW",
    "useNote": "Current products exist, but no universal Birmingham fare set is established. Do not substitute an operator fare for another operator or integrated product. Behavioural profiles remain unresolved and existing profile rows remain DEV_ONLY. Published products are OBSERVED_DATA; monthly equivalents/repeated travel arithmetic are CALCULATED. Occasional/hybrid/regular/frequent profiles remain MODELLED_ESTIMATE / DEV_ONLY until approved. Preserve operator network, authority area, zone or region; MVP-city applicability is a separate mapping. No universal UK transport API.",
    "unresolvedMetadata": [
      "Publication date and refresh cadence were not verified in Batch 1–4.",
      "Exact product URLs, access formats and source-governance status were not verified in Batch 3.",
      "Operator-specific reuse/licensing remains unresolved; do not assume OGL.",
      "Exact source URL remains unresolved; the audit source reference identifies the evidence."
    ]
  },
  {
    "sourceId": "SRC-TFGM",
    "category": "transport",
    "organisation": "TfGM / Bee Network",
    "publicationTitle": "Bee Network fare products",
    "authority": "PRIMARY",
    "sourceReference": "Batch 3 — TfGM / Bee Network",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "PENDING_REVIEW",
    "useNote": "Complete current integrated fare evidence remains partly unresolved. Published products are OBSERVED_DATA; monthly equivalents/repeated travel arithmetic are CALCULATED. Occasional/hybrid/regular/frequent profiles remain MODELLED_ESTIMATE / DEV_ONLY until approved. Preserve operator network, authority area, zone or region; MVP-city applicability is a separate mapping. No universal UK transport API.",
    "unresolvedMetadata": [
      "Publication date and refresh cadence were not verified in Batch 1–4.",
      "Exact product URLs, access formats and source-governance status were not verified in Batch 3.",
      "Operator-specific reuse/licensing remains unresolved; do not assume OGL.",
      "Exact source URL remains unresolved; the audit source reference identifies the evidence."
    ]
  },
  {
    "sourceId": "SRC-MCARD",
    "category": "transport",
    "organisation": "West Yorkshire / MCard / operators",
    "publicationTitle": "MCard and West Yorkshire operator fare products",
    "authority": "PRIMARY",
    "sourceReference": "Batch 3 — West Yorkshire / MCard / operators",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "PENDING_REVIEW",
    "useNote": "Keep operator fares separate from MCard multi-operator products. Published products are OBSERVED_DATA; monthly equivalents/repeated travel arithmetic are CALCULATED. Occasional/hybrid/regular/frequent profiles remain MODELLED_ESTIMATE / DEV_ONLY until approved. Preserve operator network, authority area, zone or region; MVP-city applicability is a separate mapping. No universal UK transport API.",
    "unresolvedMetadata": [
      "Publication date and refresh cadence were not verified in Batch 1–4.",
      "Exact product URLs, access formats and source-governance status were not verified in Batch 3.",
      "Operator-specific reuse/licensing remains unresolved; do not assume OGL.",
      "Exact source URL remains unresolved; the audit source reference identifies the evidence."
    ]
  },
  {
    "sourceId": "SRC-MERSEYTRAVEL",
    "category": "transport",
    "organisation": "Merseytravel",
    "publicationTitle": "Solo / Railpass / Trio / Saveaway fare products",
    "authority": "PRIMARY",
    "sourceReference": "Batch 3 — Merseytravel",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "PENDING_REVIEW",
    "useNote": "Keep Solo, Railpass, Trio and Saveaway separate. Published products are OBSERVED_DATA; monthly equivalents/repeated travel arithmetic are CALCULATED. Occasional/hybrid/regular/frequent profiles remain MODELLED_ESTIMATE / DEV_ONLY until approved. Preserve operator network, authority area, zone or region; MVP-city applicability is a separate mapping. No universal UK transport API.",
    "unresolvedMetadata": [
      "Publication date and refresh cadence were not verified in Batch 1–4.",
      "Exact product URLs, access formats and source-governance status were not verified in Batch 3.",
      "Operator-specific reuse/licensing remains unresolved; do not assume OGL.",
      "Exact source URL remains unresolved; the audit source reference identifies the evidence."
    ]
  },
  {
    "sourceId": "SRC-TRAVELWEST",
    "category": "transport",
    "organisation": "Travelwest / First Bus / relevant operators",
    "publicationTitle": "West of England operator fare products",
    "authority": "PRIMARY",
    "sourceReference": "Batch 3 — Travelwest / First Bus / relevant operators",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "PENDING_REVIEW",
    "useNote": "First Bus products are not universal West of England integrated fares. Published products are OBSERVED_DATA; monthly equivalents/repeated travel arithmetic are CALCULATED. Occasional/hybrid/regular/frequent profiles remain MODELLED_ESTIMATE / DEV_ONLY until approved. Preserve operator network, authority area, zone or region; MVP-city applicability is a separate mapping. No universal UK transport API.",
    "unresolvedMetadata": [
      "Publication date and refresh cadence were not verified in Batch 1–4.",
      "Exact product URLs, access formats and source-governance status were not verified in Batch 3.",
      "Operator-specific reuse/licensing remains unresolved; do not assume OGL.",
      "Exact source URL remains unresolved; the audit source reference identifies the evidence."
    ]
  },
  {
    "sourceId": "SRC-EDINBURGH-TRANSPORT",
    "category": "transport",
    "organisation": "Lothian / Edinburgh Trams",
    "publicationTitle": "Lothian and Edinburgh Trams fare products",
    "authority": "PRIMARY",
    "sourceReference": "Batch 3 — Lothian / Edinburgh Trams",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "PENDING_REVIEW",
    "useNote": "Keep bus, tram and city/airport/network products separate. Published products are OBSERVED_DATA; monthly equivalents/repeated travel arithmetic are CALCULATED. Occasional/hybrid/regular/frequent profiles remain MODELLED_ESTIMATE / DEV_ONLY until approved. Preserve operator network, authority area, zone or region; MVP-city applicability is a separate mapping. No universal UK transport API.",
    "unresolvedMetadata": [
      "Publication date and refresh cadence were not verified in Batch 1–4.",
      "Exact product URLs, access formats and source-governance status were not verified in Batch 3.",
      "Operator-specific reuse/licensing remains unresolved; do not assume OGL.",
      "Exact source URL remains unresolved; the audit source reference identifies the evidence."
    ]
  },
  {
    "sourceId": "SRC-GLASGOW-TRANSPORT",
    "category": "transport",
    "organisation": "SPT / First Bus / ZoneCard",
    "publicationTitle": "Subway / First Bus / ZoneCard fare products",
    "authority": "PRIMARY",
    "sourceReference": "Batch 3 — SPT / First Bus / ZoneCard",
    "suitability": "PRIMARY_CONTROLLED_IMPORT",
    "rawSnapshotPolicy": "PENDING_REVIEW",
    "useNote": "Keep Subway, First Bus and ZoneCard product systems separate. Published products are OBSERVED_DATA; monthly equivalents/repeated travel arithmetic are CALCULATED. Occasional/hybrid/regular/frequent profiles remain MODELLED_ESTIMATE / DEV_ONLY until approved. Preserve operator network, authority area, zone or region; MVP-city applicability is a separate mapping. No universal UK transport API.",
    "unresolvedMetadata": [
      "Publication date and refresh cadence were not verified in Batch 1–4.",
      "Exact product URLs, access formats and source-governance status were not verified in Batch 3.",
      "Operator-specific reuse/licensing remains unresolved; do not assume OGL.",
      "Exact source URL remains unresolved; the audit source reference identifies the evidence."
    ]
  },
  {
    "sourceId": "SRC-011",
    "category": "income_tax",
    "organisation": "HMRC",
    "publicationTitle": "Income Tax rates and allowances",
    "sourceUrl": "https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past",
    "sourceStatus": "POPULATED",
    "authority": "PRIMARY",
    "sourceReference": "Batch 4 — INCOME TAX — rUK",
    "suitability": "REFERENCE_INPUT",
    "rawSnapshotPolicy": "METADATA_ONLY",
    "useNote": "rUK jurisdiction, tax year 2026/27. HTML reference input; no verified API. Tax arithmetic is later CALCULATED logic. Slice 3: verified official HTML on 2026-09-14; see docs/data/production-tax-ni.md for controlled extracts, linked HMRC allowance clarification and scope limitations.",
    "unresolvedMetadata": [
      "Refresh cadence not verified."
    ],
    "accessMechanisms": [
      "HTML"
    ],
    "sourcePeriod": "2026/27",
    "effectiveFrom": "2026-04-06",
    "effectiveTo": "2027-04-05",
    "licenceReference": "OGL v3.0 (Batch 4)"
  },
  {
    "sourceId": "SRC-013",
    "category": "income_tax",
    "organisation": "Scottish Government",
    "publicationTitle": "Scottish Income Tax rates and bands",
    "sourceUrl": "https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/pages/2026-to-2027/",
    "sourceStatus": "POPULATED",
    "authority": "PRIMARY",
    "sourceReference": "Batch 4 — INCOME TAX — SCOTLAND",
    "suitability": "REFERENCE_INPUT",
    "rawSnapshotPolicy": "METADATA_ONLY",
    "useNote": "Scotland jurisdiction. Scottish Government rates/bands require the HMRC Personal Allowance/taper reference (SRC-011). HTML reference input; no verified API. Tax arithmetic is later CALCULATED logic. Slice 3: verified official HTML on 2026-09-14; see docs/data/production-tax-ni.md for controlled extracts, linked HMRC allowance clarification and scope limitations. Scottish Government remains policy provenance. Current operational confirmation reviewed on 2026-09-14: https://www.gov.uk/scottish-income-tax confirms all six bands; https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027 corroborates the Scottish top rate above GBP 125140. The locked UKMR resolution treats Over GBP 125141 in the historical/current HMRC table as a presentation inconsistency; retain the continuous GBP 125140 boundary.",
    "unresolvedMetadata": [
      "Refresh cadence not verified.",
      "Scottish policy page still says proposed; current operational confirmation is separately recorded in useNote and controlled-extract methodologyNotes."
    ],
    "accessMechanisms": [
      "HTML"
    ],
    "licenceReference": "OGL v3.0 (Batch 4)",
    "sourcePeriod": "2026/27",
    "effectiveFrom": "2026-04-06",
    "effectiveTo": "2027-04-05"
  },
  {
    "sourceId": "SRC-012",
    "category": "national_insurance",
    "organisation": "HMRC",
    "publicationTitle": "Rates and thresholds for employers 2026/27",
    "sourceStatus": "POPULATED",
    "authority": "PRIMARY",
    "sourceReference": "Batch 4 — HMRC Rates and thresholds for employers 2026/27",
    "suitability": "REFERENCE_INPUT",
    "rawSnapshotPolicy": "METADATA_ONLY",
    "useNote": "Class 1 reference data must preserve the official category dimension. Other official category letters remain outside the intentional Slice 3 category A MVP scope. Current mechanism is HTML; historical ODS exists but is not asserted as the current source format. Slice 3: verified official HTML on 2026-09-14; see docs/data/production-tax-ni.md for controlled extracts, linked HMRC allowance clarification and scope limitations. Category A only is the intentional Slice 3 MVP reference scope.",
    "unresolvedMetadata": [
      "Refresh cadence not verified."
    ],
    "sourcePeriod": "2026/27",
    "accessMechanisms": [
      "HTML"
    ],
    "licenceReference": "OGL v3.0 (Batch 4)",
    "sourceUrl": "https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027",
    "effectiveFrom": "2026-04-06",
    "effectiveTo": "2027-04-05"
  },
  {
    "sourceId": "SRC-HOUSEHOLD-EQUIVALENCE",
    "category": "household_equivalence",
    "organisation": "ONS",
    "publicationTitle": "Chapter 3: Equivalised income",
    "sourceUrl": "https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/incomeandwealth/compendium/familyspending/2015/chapter3equivalisedincome",
    "authority": "PRIMARY",
    "sourceReference": "Batch 4 — OECD-modified equivalence scale used in UK income-distribution methodology",
    "suitability": "REFERENCE_INPUT",
    "rawSnapshotPolicy": "PENDING_REVIEW",
    "useNote": "ONS methodology reference for the OECD-modified scale. Batch 4 specifies first adult 1.0, additional adult/person age 14+ 0.5, child under 14 0.3. Reference methodology for income equivalence/living-standard comparison only. Do not automatically apply these weights to groceries, essentials, lifestyle, water or energy. No calculator implementation is supplied.",
    "unresolvedMetadata": [
      "Publication date and refresh cadence were not verified in Batch 1–4.",
      "Source-governance status was not assigned by the audit; source discovery does not imply release readiness.",
      "Existing reference URL retained from Slice 2; Batch 1–4 did not verify this exact URL as a current download endpoint."
    ],
    "accessMechanisms": [
      "HTML"
    ],
    "licenceReference": "OGL v3.0 unless otherwise stated (ONS material; Batch 2)"
  }
]);
