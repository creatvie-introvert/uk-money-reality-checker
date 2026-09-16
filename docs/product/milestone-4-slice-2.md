# Milestone 4 Slice 4.2 — Supported cities and evidence pages

## Outcome and starting state

Implemented the production city index and eight evidence-aware city pages. No household totals, price tables, affordability claims or rankings are published. No financial behaviour, calculator code, data generation or evidence resolution changed. Nothing was staged, committed, pushed or deployed.

Started on `rebuild/next-production` at `01cdc5c` (`Build Milestone 4 public product shell`). Origin was fetched successfully and HEAD matched `origin/rebuild/next-production`, 0 ahead / 0 behind. The only initial untracked file was `src/data/raw/ukmr_data_pack_and_source_register_v3_1.xlsx`. AGENTS.md, installed Next.js static-params/metadata/notFound guidance, Milestone 1 closure/source boundaries, typed production loaders, generated evidence, existing public pages and calculator acceptance tests informed the implementation.

## Files

Created:

- `src/product/cities/registry.ts` — typed city registry, evidence projection, coverage and metadata.
- `src/app/(public)/cities/[slug]/page.tsx` — shared dynamic route, eight static params, metadata and unsupported-slug handling.
- `src/components/cities/CityPage.tsx` — shared server-rendered city template.
- `src/components/cities/cities.module.css` — scoped city layouts using the existing public palette/type stack.
- `tests/product/cities.test.ts` — 23 city registry and release-safety tests.
- `e2e/city-pages.spec.ts` — 15 browser tests: eight city facts, six responsive cases, unsupported-slug case.
- This report.

Modified:

- `src/app/(public)/cities/page.tsx` — replaces noindex placeholder with supported-city index.
- `src/app/(public)/page.tsx` — central city definitions, actual detail links, removes preparation copy.
- `e2e/public-homepage.spec.ts` — correct detail destinations, retains unfinished Methodology/Sources checks.
- `docs/product/milestone-4-architecture.md` — current routes, evidence access and deferred work.

## Registry and route strategy

One registry defines canonical slugs, display names, nation, calculator city IDs, concise coverage summaries and audited service mappings. Exact lookup rejects aliases, case variants and unsupported cities. Next.js `generateStaticParams` lists exactly London, Birmingham, Manchester, Leeds, Liverpool, Bristol, Edinburgh and Glasgow; promise params are awaited and unsupported slugs call `notFound()` in both page and metadata paths. The production build prerenders all eight.

`buildCityPages` passes the eight required production families through existing `validateDataset`. The gate validates schema/release/classification and compares every field with the pinned generated payload. Test overrides have no bypass: invalid, absent, truncated, mutated, blocked or development payloads throw. There is no catch-to-default path.

Records are selected by exact city ID, released transport applicability or audited water provider IDs. The public projection only permits publisher, title, source URL, source period, optional effective bounds and a public evidence/reference label. It never exports record amounts, calculated derivatives, QA payloads or raw workbook content. The registry contains the interpretation; React only presents it. Static summaries derive from the audited Milestone 1 facts. Changes to releases or city mappings require a reviewed registry update.

## Index and common page structure

The index gives all eight cities equal cards in the established MVP order. Each has nation, factual coverage summary, a descriptive Explore link and an accessible city-specific Compare link. There is no numeric cost total, ordering by affordability, score or unsupported ninth city. Homepage cards now link to the matching canonical routes.

Each city uses accessible breadcrumbs, one H1, nation and evidence context, safe calculator CTA, eight-category anchor summary, category evidence sections, income-tax note, evidence-period limitations and final calculator/all-cities links. Source links and effective periods sit in native disclosures; essential limitations remain visible without opening them.

Coverage states:

| State | Meaning |
| --- | --- |
| Published evidence available | Evidence exists for the stated scope; user selection and suitability still matter. |
| Supported with conditions | Applicable band, authority, billing/service or product conditions are required. It is not an automatic bill. |
| Evidence gap | No exact released evidence for the stated use. No substitute or numeric fallback. |
| Requires your amount | The current calculator needs the user's household amount. |
| Reference evidence only | Source context exists but does not become a personalised city budget. |

States are textual, not colour-only, and are not calculator completion counts.

## City-specific evidence matrix

| City | Rent scope | Council tax / water / transport boundary |
| --- | --- | --- |
| London | ONS London region E12000007 | No generic council-tax scalar or released borough schedule; authority required. Thames Water with billing/usage conditions. Selected TfL bus/tram scope. |
| Birmingham | E08000025 | Birmingham authority and explicit band. Severn Trent zone/drainage applicability remains unresolved. West Midlands products; no Bee Network substitution. |
| Manchester | E08000003 | Manchester authority/band. United Utilities with conditions. Selected Bee Network evidence, no assumed commute cost. |
| Leeds | E08000035 | Leeds authority/band. Yorkshire Water with conditions. Selected MCard evidence. |
| Liverpool | E08000012 | Liverpool authority/band. United Utilities with conditions. Selected Merseytravel products. |
| Bristol | E06000023 | Bristol authority/band. Bristol Water clean supply and Wessex Water wastewater remain separate. Selected First Bus Bristol evidence. |
| Edinburgh | Exact PIPR city row absent | Explicit rent gap; no substitute. Scottish authority schedule and actual band. Scottish Water supported unmetered paths. Lothian/Edinburgh Trams evidence. |
| Glasgow | Greater Glasgow S33000009, broad rental market area | Explicitly distinct from Glasgow City council-tax authority. Scottish schedule and actual band. Scottish Water supported unmetered paths. First Glasgow/SPT product scopes. |

Council-tax authority codes are shown only when supplied by the released record. Scottish schedules currently provide authority names without codes; no replacement code is invented. No Band D default or example amount is shown.

## Category and period handling

- Rent: bedroom-based availability, exact source geography, July 2026 rental-stock context, geography and Scottish advertised-let limitations. Edinburgh has no rent source disclosure because there is no matching record. No headline average rent is published.
- Council tax: authority and actual band required; English precept/two-adult basis and Scottish structural distinction described. Evidence period 2026/27; recorded bounds 1 April 2026–31 March 2027.
- Energy: Ofgem regional price evidence and NEED reference material are distinguished. No approved city-to-region mapping or household bill model. The calculator asks for a monthly amount. Ofgem Q3 2026 and NEED 2024 periods stay separate; no later-quarter assumption.
- Water: audited service mappings, regime/usage/eligibility requirements and actual Scottish council-tax band. No automatic English city bill, no collapsed Bristol provider, no unresolved Birmingham path presented as resolved. Tariff period 2026/27 with recorded effective bounds. No annual/monthly numeric conversion occurs.
- Groceries: Defra Family Food FYE 2024 reference only; no city household model or multiplier. Essentials and lifestyle: user-entered, ONS Family Spending FYE 2025 reference only; no automatic category mapping or overlapping-category sum.
- Transport: released network/product scopes only. Personal monthly cost entered separately; fare selection deferred. Observations verified 14 September 2026 have same-day bounds and explicitly do not establish later-date fares. No modelled frequency, default product or cheapest-fare selection.
- Tax: both Scottish and rUK paths described; taxpayer status is user-confirmed, never legally inferred from city.

Per-category source periods are always visible. Disclosures retain each selected source's recorded publisher/title/URL, classification and effective bounds, deduplicated without merging distinct sources. There is no misleading global city-update date. Public context summarises relevant audited applicability limitations; it is not the full source register or a republication of provider tariff tables. Existing unresolved provider/operator/Ofgem reuse rights and source-refresh requirements remain unchanged.

## Calculator and metadata boundary

All city CTAs use exactly `/calculator`. They do not preselect a location, change existing state, add query parameters or put household/financial data in URLs. Users choose both cities in the existing form. Future explicit city preselection needs a separate UX design.

The index and every city have unique factual titles and descriptions, without noindex. Unknown cities return 404/noindex. Methodology and Sources remain visibly unfinished and noindex, and city links acknowledge that status. No canonical deployment domain, alias, redirect, structured financial claim or analytics is introduced.

## Accessibility and responsive review

Chromium checks cover all eight city facts, headings, breadcrumbs, active navigation, metadata, calculator links and keyboard source disclosures. Native summaries open with Enter, close with Space and show focus outlines. Index cards have labelled articles and city-specific accessible comparison names. Existing skip-link and public navigation tests pass.

Index plus London, Bristol, Edinburgh and Glasgow were checked at 1440, 1280, 1024, 768, 390 and 320px. Every disclosure was opened at each width to test long source names and dates. No page or link/summary horizontal overflow was found. City cards stack to one column; coverage goes from four to two to one; evidence sections stack on smaller screens; CTA and breadcrumb text wrap. The existing calculator responsive matrix also passes.

Full-page screenshots were reviewed for the requested desktop index/London/Bristol/Edinburgh/Glasgow and mobile index/England/Scotland cases. Visual review caught a missing optional Scottish authority-code display before completion; the projection now omits absent codes and both unit/browser assertions reject leaked `undefined` text. Screenshots were recaptured after the fix. Existing mint/navy/blue styling, aligned sections, readable provider distinctions and mobile stacks are retained. Browser testing is Chromium, not a claim of independent screen-reader or cross-browser certification.

Screenshots are temporary, outside Git:

- `/tmp/ukmr-4-2-cities-1440.png`
- `/tmp/ukmr-4-2-london-1440.png`
- `/tmp/ukmr-4-2-bristol-1440.png`
- `/tmp/ukmr-4-2-edinburgh-1440.png`
- `/tmp/ukmr-4-2-glasgow-1440.png`
- `/tmp/ukmr-4-2-cities-390.png`
- `/tmp/ukmr-4-2-london-390.png` and `bristol-390.png`
- `/tmp/ukmr-4-2-edinburgh-390.png` and `glasgow-390.png`

## Validation and regression

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 958 passed across 24 files (935 existing + 23 city tests).
- `npm run build`: passed; all eight city routes prerendered.
- `npm run data:verify`: passed; all 32 artifacts, 1,191 observed rows and 80 coverage cells verified.
- `git diff --check`: passed.
- `npm run test:e2e -- --workers=2`: 46 passed (31 existing + 15 city tests).
- Release-safety tests reject BLOCKED_FROM_RELEASE, DEV_ONLY, modelled transport, changed geography, truncated data and explicit missing payloads. Public source projection excludes numeric record fields. City rendered-copy assertions reject evaluative ranking claims and fabricated currency amounts.
- SHA-256 comparison against the pre-existing protected baseline: all 32 generated artifacts unchanged; raw workbook unchanged and still untracked. Workbook SHA-256: `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`.

Manchester → Leeds acceptance remains exact:

| Output | Current | Destination / change |
| --- | --- | --- |
| Monthly costs | £2,314.67 | £2,163.31; −£151.36 |
| Take-home | £3,293.30 | £3,538.12; +£244.82 |
| Monthly buffer | £978.63 | £1,374.81; +£396.18 |
| Salary preservation | £47,477.35/year | Eligible |
| Coverage | 8/8 | 8/8 |

## Remaining scope and recommendation

No blocking Slice 4.2 implementation gap remains after validation. The source gaps and applicability conditions above remain deliberate product boundaries. No evidence was newly resolved or refreshed. City preselection, fare selection, financial models, rankings, source ingestion, analytics and deployment remain deferred.

Recommended Slice 4.3: implement public Methodology and Sources from the audited contracts, including classification meanings, period/geography semantics, source limitations, reference-vs-calculator distinctions and known gaps. Retain source reuse limitations and calculator privacy boundaries. Later launch work can cover legal/accessibility content, cross-browser/assistive-technology review, SEO/domain decisions and separately authorised cutover.

**Safe to commit this Slice 4.2 implementation after review, excluding the raw workbook.** No commit, staging, push or deployment was performed.
