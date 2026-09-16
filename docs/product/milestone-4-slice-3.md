# Milestone 4 Slice 4.3 — Public Methodology and Sources

## Outcome and repository starting state

Completed `/methodology` and `/sources`, removed their noindex/placeholder treatment, and updated existing homepage/city transparency links. No calculation, source ingestion, financial model, evidence release, analytics, redirect or deployment change was made.

Started on `rebuild/next-production` at `4fc1c79` (`Build Milestone 4 evidence-aware city pages`). `git fetch origin` succeeded; HEAD matched origin with 0 ahead / 0 behind. The only initial untracked file was the protected raw workbook. Reviewed AGENTS.md, installed Next.js metadata guidance, Milestone 1 closure and category/source documentation, Milestone 2 closure and salary/income/completeness contracts, Milestone 3 closure, Milestone 4 architecture, generated metadata, loaders, city/result disclosures and existing tests before implementation.

Nothing was staged, committed, pushed or deployed.

## Files created

- `src/product/transparency/methodology.ts`: reviewed public category/method explanations.
- `src/product/transparency/sources.ts`: typed source-entry/group/use-status model and validated register builder.
- `src/product/transparency/provenance.ts`: shared allowlisted source citation projection.
- `src/product/transparency/periods.ts`: existing results date formatter, moved without behaviour changes.
- `src/product/transparency/classifications.ts`: public definitions using existing calculator labels.
- `src/components/transparency/Provenance.tsx`: shared classification legend and source citations.
- `src/components/transparency/SourceEntry.tsx`: accessible expandable publication entry.
- `src/components/transparency/transparency.module.css`: scoped layouts and disclosure styling.
- `tests/product/transparency.test.ts`: 22 tests.
- `e2e/transparency.spec.ts`: seven browser tests.
- This report.

## Files modified

- `src/app/(public)/methodology/page.tsx` and `sources/page.tsx`: production content and metadata.
- `src/app/(public)/page.tsx`: finished-page link copy.
- `src/components/cities/CityPage.tsx`: shared citations and finished transparency links.
- `src/product/cities/registry.ts`: uses the extracted source projection; city evidence interpretation remains unchanged.
- `src/components/report/SourceExplanation.tsx`: imports/re-exports the unchanged shared date formatter; result interactions/financial logic unchanged.
- `e2e/public-homepage.spec.ts`: completed-page expectations in the existing navigation test.
- `docs/product/milestone-4-architecture.md`: current routes and shared provenance architecture.

## Methodology information architecture

A mint hero introduces the page. A labelled contents navigation links to the comparison, included costs, take-home/tax, salary preservation, partial results, coverage, classifications, overrides, dates/geography, rounding and scope. Content uses one H1, H2 section headings and H3 cost/classification headings. The page is server-rendered with no additional browser state.

The core equation is displayed as three readable lines:

> Monthly take-home income − included monthly household costs = monthly buffer

Buffer is explicitly bounded to the included costs; it is not savings, disposable income in a full financial-planning sense, free cash after all expenses or an affordability score. Changes are destination minus current.

### Included costs and category rules

| Category | Public explanation |
| --- | --- |
| Rent | ONS Private rent and house prices/PIPR, July 2026, exact geography and supported bedroom bands. Bedroom/property dimensions remain separate. No property quote or unsupported cross-product. London remains regional, Greater Glasgow distinct, Edinburgh gap explicit. Entered rent takes precedence where supported. |
| Council tax | Actual authority/band, English/Scottish schedules, no London scalar or default Band D. Annual /12 is calculated, not a promised instalment schedule. Precepts retained; discounts/exemptions are not silently applied. |
| Energy | NEED reference and regional Ofgem evidence remain separate. No approved city-region mapping or household consumption model; entered monthly amount required. |
| Water | English provider mapping does not establish a bill. Regime/usage/services matter. Bristol Water/Wessex split and Severn Trent applicability retained. Supported Scottish Water unmetered band/service paths resolve conditionally, with combined totals used once. |
| Groceries | Defra per-person/week reference is not a personalised city budget. Current form uses the user's amount. |
| Essentials | User amount; ONS reference categories are not mapped automatically. Consistent definitions and avoiding duplicate expenses are explained. |
| Lifestyle | User amount; no ONS automatic budget or OECD/headcount spending multiplier. |
| Transport | Entered monthly cost or explicit not applicable. Published fare facts are not commute budgets. No frequency assumption or cheapest-product choice; fare UI remains deferred. |

### Income, salary, partial results and overrides

Income covers one employee, one employment, one annual gross salary, explicit rUK/Scottish jurisdiction, standard Personal Allowance, 2026/27 and employee Class 1 NI category A. It is an annual comparison, not PAYE/payslip reconstruction. Pensions, student loans, benefits, multiple employments, self-employment, other payroll deductions and unsupported tax-code variations are excluded from the salary calculation.

Actual monthly take-home is Your amount and replaces simplified take-home where supplied; a resolvable gross baseline/source context remains. Net income is not inverted to infer gross. A destination take-home override prevents salary solving; a current override can support an otherwise complete current buffer.

“Salary needed to keep the same monthly buffer” retains the exact framing: destination included costs plus current buffer establish the required destination net monthly income, then the supported forward tax/NI calculation finds the minimum qualifying gross annual salary to the penny. Current buffer and destination costs must be complete. Existing destination gross is optional; jurisdiction/employment scope is explicit. Search bounds and no-solution behaviour are acknowledged without exposing search internals. A negative buffer can be preserved. This is not an affordability threshold, recommendation, financial advice or full budget requirement.

Missing values remain unresolved, never zero, averages or hidden defaults. Resolved income/categories can remain visible; subtotals and any buffer after known costs are labelled incomplete. Complete cost/buffer deltas are withheld where both complete sides are required; take-home can be independently resolved. Coverage describes included categories, with explicit N/A separately recorded, and is not confidence, accuracy, affordability or a quality score. The conceptual “6 of 8” example is not a percentage or live result.

Override precedence is entered amount → exact matching released evidence → unresolved. An override does not erase baseline provenance or invent an unavailable baseline.

### Periods, geography, rounding and exclusions

There is no universal category data date. Observation periods, publication dates and effective periods remain separate. Income tax/NI fiscal boundaries differ from council/water year boundaries. Applicability dates select evidence but do not become publication dates. London regional rent, Greater Glasgow rent and local-authority council tax retain their own scopes.

Exact monetary arithmetic and fractional monthly pennies are retained internally. Annual /12 and eligible weekly ×52/12 equivalents are calculated; display rounding is not fed into calculations or used to reclassify observations. Rounded components can differ from a rounded total.

The exclusions section distinguishes absence of a dedicated model from what a user might include in a broad entered amount. Childcare, debt, savings goals, insurance, broadband/mobile, healthcare, property purchases, mortgages and moving costs are not separate calculator models. Broad essentials/lifestyle amounts may include selected expenses; the calculator does not identify/add them independently. No automatic household budget or ranking is introduced.

## Public source register architecture

`buildSourceRegister` validates all ten active observed evidence families through the existing `validateDataset` function. Schema, classification, kind, release identity, count and every pinned payload field remain required. Invalid inputs throw; no replacement source or empty fallback budget is returned.

Validated observations are grouped by source family, organisation and publication title. Distinct publications sharing a family remain distinct. Eight category groups contain **32 publication entries and all 41 unique recorded source URLs**. They are organised as Rent, Council tax, Energy, Water, Groceries/household spending, Transport, Income tax and National Insurance. Native details/summary entries keep the register scannable; essential category boundaries appear outside disclosures.

`PublicSourceEntry` contains a public ID/category, publisher/title, observation classification, evidence role, current use status, how-used explanation, geography/scope, optional recorded publication dates, citations and curated public limitations. Citation projection permits publisher/title/recorded URL/source period/optional effective bounds and evidence label. Register energy links additionally identify the released fuel/tariff/payment combination or NEED nation group. Absent dates are omitted, never fabricated.

Source entries include exact seven rent geographies and the Edinburgh gap; English/Scottish authority schedules; separate NEED and Ofgem evidence; all seven water providers; Defra/ONS spending; selected published operator/product/network scopes; HMRC/Scottish tax and employee NI references. Transport retains the verified 14 September 2026 same-day bounds and explicit need for refresh for later-date use. No fare table, water price, monthly city total or development frequency profile is shown.

### Classifications and use statuses

The shared legend takes labels from the existing calculator mapping:

| Internal classification | Primary public label |
| --- | --- |
| OBSERVED_DATA | Official data |
| CALCULATED | Calculated |
| MODELLED_ESTIMATE | Estimate |
| USER_ENTERED | Your amount |

Enum names are not primary page copy. The Estimate definition explains provenance; it does not activate a model or create an estimated amount. Every register entry is a validated observation. Derived outputs are explained as Calculated, but no calculated-price register entry is fabricated.

Evidence role and current product use are distinct:

| Evidence/use | Public treatment |
| --- | --- |
| Exact rent/council evidence | Published evidence; Used with conditions. |
| Scottish Water band paths | Published evidence; Used with conditions. |
| English water, transport | Published evidence; Reference only in the current household form. Supported lower-level transport conversions do not activate the deferred picker. |
| Ofgem regional prices | Published evidence; Reference only for the current personal household path because city mapping/model is absent. |
| NEED and spending | Reference evidence only; Reference only. |
| Tax/NI reference rules | Reference evidence only; Used in calculator as deterministic rule inputs. Personal calculated outputs remain Calculated. |

Reference status is never silently promoted to an observed household budget. The user-facing use badges do not mirror raw release enum names or imply that all published evidence resolves automatically.

## Shared presentation and public/private boundary

Cities and Sources share `projectSourceCitations` and `SourceCitation`. Methodology and Sources share the classification legend. Results and public citations share the existing date-formatting function, moved unchanged; results keep their richer scenario/baseline/limitation structure and established interactions. No large results refactor or financial change was needed.

The public projection excludes raw workbook rows/sheet structure, filesystem paths, record/snapshot identifiers, ingestion/parser metadata, QA notes and financial record values. Curated public limitations describe user-relevant applicability, source scope, reuse and freshness boundaries. Provider/operator/Ofgem reuse restrictions remain qualified; linking does not claim unrestricted redistribution rights. No raw dataset or tariff table is rendered or offered for download.

Source links use recorded URLs exactly. Public citations follow the existing city same-tab convention; results retain their safe new-tab convention. No invented URL or local file link is introduced. Recorded Ofgem embedded chart URLs are preserved rather than replaced with guessed landing pages. Link fidelity was checked against the pinned metadata, not externally recertified for today's website availability.

Both pages have factual production metadata and no placeholder noindex. Homepage/city preparation wording is removed, links remain on existing routes, and calculator CTAs still use plain `/calculator` without financial URL state.

## Validation and QA

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: **980 tests across 25 files passed** (958 existing + 22 new).
- `npm run build`: passed; Methodology and Sources are static production routes; all eight city pages remain generated.
- `npm run data:verify`: passed; 32 artifacts, 1,191 observed rows and 80 coverage cells verified.
- `git diff --check`: passed.
- Full Playwright suite: **53 Chromium tests passed** (46 existing + seven new). Targeted transparency checks and screenshots were refreshed after improving energy-link labels.
- Shared source, city and transparency unit cases were rerun after the final link-label change.

Release-safety tests exercise all ten dataset families with blocked/development status, modelled classification, invented source URL and explicit absent payload. Existing pinned gates reject them all. Tests also enforce exact source URL coverage, recorded dates, geography, source/use distinctions, no numeric record projection and no workbook/QA leakage.

### Calculator regression

All Milestone 3 acceptance/browser checks pass unchanged:

| Output | Current | Destination / change |
| --- | --- | --- |
| Monthly costs | £2,314.67 | £2,163.31; −£151.36 |
| Monthly take-home | £3,293.30 | £3,538.12; +£244.82 |
| Monthly buffer | £978.63 | £1,374.81; +£396.18 |
| Salary preservation | £47,477.35/year | Eligible |
| Coverage | 8/8 | 8/8 |

Engine/data/calculator arithmetic files are unchanged. The only result-component change extracts the date formatter without changing its implementation or output.

### Accessibility and responsive findings

Both pages were checked at 1440, 1280, 1024, 768, 390 and 320px. One H1/main, logical section headings, semantic classification definitions, labelled contents/category navigation and textual badges remain present. Keyboard Enter/Space opens/closes source disclosures with visible focus. All 32 disclosures were expanded at each width to exercise long titles, provider names, periods and links; no page or link/control horizontal overflow was found. Contents navigation wraps on smaller widths and primary actions stack.

Homepage and city navigation reaches finished pages; no placeholder wording or noindex remains on the completed routes. Full screenshots and focused source-detail captures were inspected. The page length reflects the requested methodological scope and publication register; category navigation and collapsed publication entries support scanning. This is Chromium and source/visual review, not a claim of independent VoiceOver, Safari or comprehensive WCAG certification.

Temporary screenshots, outside Git:

- `/tmp/ukmr-4-3-methodology-1440.png`, `methodology-390.png`
- `/tmp/ukmr-4-3-sources-1440.png`, `sources-390.png`
- `/tmp/ukmr-4-3-sources-rent-1440.png`, `sources-rent-390.png`
- `/tmp/ukmr-4-3-sources-energy-1440.png`, `sources-energy-390.png`
- `/tmp/ukmr-4-3-rent-detail-1440.png`, `rent-detail-390.png`
- `/tmp/ukmr-4-3-energy-detail-1440.png`, `energy-detail-390.png`

The local Next development badge in browser captures is not product UI.

### Leakage and protected-file audit

Public route source, 49 generated public HTML/RSC files and production JavaScript were searched for the workbook filename, local filesystem paths and internal QA/import markers. Public HTML/RSC and the eight production chunks linked by each transparency page contain none of those markers. All 19 production client chunks contain no workbook filename or local user/capture path.

The broader scan did find existing generated evidence QA/import metadata (`snapshotChecksum`, `parserVersion`, `sourceReference`, `qa`) in the calculator's client evidence chunk. This is the pre-existing browser calculator architecture, not a transparency-page projection or raw-workbook leak; engine/data/calculator imports are unchanged. Methodology and Sources do not link that chunk. Do not interpret this audit as proving all calculator evidence metadata is private. Reviewing calculator bundle minimisation is a separate Slice 4.4 readiness item; no unrequested engine/runtime redesign was performed.

Private server compilation also includes validated dataset dependencies. The new public pages render only the explicit public projection, with no workbook content, raw source-register rows or QA structure.

All **32 generated artifact hashes remain unchanged** against the protected baseline. The workbook remains unchanged, untracked and uncommitted, SHA-256 `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`. Generated Next route-type path churn was restored without altering application code.

## Remaining gaps and Slice 4.4 recommendation

No blocking Slice 4.3 implementation gap remains. Existing source freshness, applicability and reuse limitations are still explicit; no new evidence was resolved. There is no fare picker, city preselection, new household model, analytics, deep SEO, redirect strategy or deployment work.

Recommended Slice 4.4: public-site integration/launch-readiness audit (including existing calculator evidence-bundle metadata minimisation), any separately scoped Privacy/Accessibility content, cross-browser and assistive-technology review, owner visual review and metadata/link consistency. Production cutover, redirects and analytics remain separate authorisation decisions.

**Safe to commit Slice 4.3 after review, excluding the raw workbook.** Nothing was staged, committed, pushed or deployed.
