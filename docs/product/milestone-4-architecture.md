# Milestone 4: launch integration and production readiness

## Scope and starting point

Slice 4.1 added the public homepage and navigation around the closed Milestone 3 calculator. Slice 4.2 now adds the supported-city index and eight evidence-aware city pages. Slice 4.3 adds the public Methodology and Sources pages. These slices add no financial calculations, analytics, redirects or production cutover.

Started on `rebuild/next-production`, commit `92076a833ca3725f2a1afc5f4959ec1a4156da2a` (`Close Milestone 3 calculator product experience`). `git fetch origin` succeeded; local HEAD matched `origin/rebuild/next-production` with zero commits ahead/behind. The only untracked file was the protected raw workbook. AGENTS.md, installed Next.js layout/route-group/CSS/metadata guidance, app routes, tokens, metadata, tests and Milestone 3 visual/product records informed the implementation.

Milestone 1 evidence and Milestone 2 engine remain closed. [Milestone 3 closure](milestone-3-closure.md) remains the calculator's product boundary and regression baseline.

## Route map

| Route | Current status after Slice 4.5 | Owner |
| --- | --- | --- |
| `/` | Public homepage | `src/app/(public)/page.tsx` |
| `/cities` | Eight supported cities, equal cards and explicit evidence boundaries | `(public)/cities/page.tsx` |
| `/cities/[slug]` | Eight statically generated city pages; unsupported slugs call `notFound()` | `(public)/cities/[slug]/page.tsx` |
| `/methodology` | Production explanation of calculations, partial results, overrides and scope | `(public)/methodology/page.tsx` |
| `/sources` | Production register of approved publications, periods, geography and limitations | `(public)/sources/page.tsx` |
| `/privacy`, `/accessibility` | Factual server-rendered notices, footer integration | `(public)/privacy/page.tsx`, `(public)/accessibility/page.tsx` |
| `/robots.txt`, `/sitemap.xml` | Public discovery, sitemap gated by approved SITE_URL | Server GET handlers |
| `/index.html`, `/privacy.html`, `/cookies.html` | Fixed query-stripping 308 redirects | `src/proxy.ts` |
| `/calculator` and existing step/results routes | Existing production journey, unchanged behavior | Existing calculator layout/provider/pages |
| `/dev/calculator-results` | Existing development-only fixture route | Existing development route; production 404 |

Only the eight canonical city detail routes are supported. Privacy and Accessibility are completed in Slice 4.5; About remains absent with no navigation link. Methodology and Sources are now completed public pages with factual metadata and no noindex directive. Route availability alone does not authorise production cutover.

## Layout and shell strategy

The existing top-level root layout remains the single `html`/`body` owner. Its default description now describes the product factually. A `(public)` route group adds `PublicLayout` without changing URLs or creating a second root layout. The former root development-shell page is replaced by the route-group homepage; there is no duplicate `/` route.

PublicLayout owns one skip link, PublicHeader, focusable main target and PublicFooter. All public routes share them. PublicHeader is a small client component only because `usePathname` supplies `aria-current="page"`. Homepage, public content and footer are server components. No data fetching, account state, storage or analytics is introduced.

The calculator deliberately retains its focused Milestone 3 shell variant: ResultsHeader, its existing skip link, progress, New comparison and result section links. PublicHeader/Footer do not wrap it, so there are no duplicate banners, main landmarks or competing restart controls. Its shared provider, focus handling, result state and navigation behavior are unchanged. The brand/home links provide the return to the homepage. Only factual calculator metadata is added to its layout.

Mobile public navigation stays visible and wraps into rows; it has no collapsing menu, focus trap or extra menu state. Every primary nav item has a minimum 44px height. Natural Tab/Enter behavior works without menu-specific Escape logic. Calculator receives the outlined CTA treatment, while the current public route also has a textual/semantic active state.

The footer includes the brand, a short product description, Calculator/Cities/Methodology/Sources links, evidence principles and the UTC year rendered by the server. Static builds capture the build year's value and need a rebuild when the year changes. Privacy/Accessibility links are present after Slice 4.5. No social accounts are invented.

## Homepage information architecture

1. Mint hero: “See what a move could really mean for your monthly money”, factual supporting copy, Compare your move → `/calculator`, Explore supported cities → `/cities`.
2. Non-financial structural comparison card: current/destination context, household costs, take-home and monthly buffer labels. It has no sample amounts, savings, rankings or score.
3. Four product principles: suitable official UK evidence, actual household amounts, missing stays missing, transparent sources. The sole currency illustration is the explicit explanation that unknown values are not silently converted to £0.
4. Three steps: move details; household/money details; results, including costs, take-home, buffer, drivers and eligible salary preservation.
5. Eight supported city names in neutral informational cards: London, Birmingham, Manchester, Leeds, Liverpool, Bristol, Edinburgh and Glasgow. Each links to its canonical `/cities/[slug]` evidence page. No city-level numeric cost claims are published.
6. “Built to show its workings”: category-specific source/effective periods, limitations, partial results and readable classification explanations. Methodology/Sources links point to completed pages; existing calculator source explanations remain available.
7. Final invitation to start the calculator, without urgency or promised outcomes.

## Design and accessibility boundary

`src/components/public/public.module.css` scopes the public shell's styles. Palette, Inter/Arial/Helvetica fallback, fine borders, restrained rounded panels, navy headings, blue actions, mint surfaces and 1160px content width follow the existing calculator direction. The root global stylesheet and calculator/report styles are unchanged. This avoids style leakage during client navigation.

No stock photography, remote fonts, generated art, new icon dependency or fake chart is added. Structural arrows are decorative text and hidden from assistive technology. Native headings, sections, ordered steps, lists, links, labelled nav/main/footer landmarks and visible focus carry the content. The public shell has one H1 per page and a working skip link. Responsive styles stack hero/CTA/step cards and adapt city/trust grids; all header links remain visible.

Approved original font/skyline/pictogram assets remain unavailable from Milestone 3. The typography/layout treatment is deliberate; it does not claim exact artwork fidelity. The now-unused Milestone 0 DevelopmentShell component and its scoped legacy CSS remain unmounted, with no public route to the old demo. Cleanup can be separate.

## Calculator and evidence boundaries

Public components have no imports from engine calculators, product orchestration or development fixtures. The city registry uses the existing typed production validator and an explicit non-financial source projection. Homepage and index reuse its central city definitions. No savings, costs, scores, salary requirements or financial fallbacks are computed. No acceptance-case output is used as marketing.

The calculator metadata change does not alter its context/provider, adapter, engine inputs, composer, view model, report, source panels, state lifecycle or privacy. Existing Milestone 3 product acceptance and browser suites remain the release gates. Generated artifacts and raw workbook are protected and checked against the existing hash baseline.

## Metadata

The homepage has a factual title and description matching its scope. Calculator metadata describes household costs, take-home, buffer and explicit unknown/source states. Cities, Methodology and Sources have production titles/descriptions; their previous placeholder noindex directives are removed. No canonical domain, fabricated social images, structured financial claims or redirect configuration is introduced.

## Slice 4.2 city architecture

`src/product/cities/registry.ts` owns the eight typed definitions, canonical slugs, calculator city IDs, audited service mappings, coverage semantics and metadata. `buildCityPages` validates eight pinned production evidence families through the existing `validateDataset` gate. It filters exact city/provider applicability and projects only publisher/title/URL/period/effective bounds/classification. It never projects record prices, calculated derivatives, raw workbook content or development profiles. Invalid releases throw; no replacement values or geographies are supplied.

One async dynamic route consumes Next.js promise params, generates exactly eight static paths, returns factual per-city metadata and calls `notFound()` for unsupported slugs. `CityPage` renders the common template; its scoped CSS extends the existing public visual language. All category meaning lives in the registry, outside React. There is no financial arithmetic.

Five textual coverage states describe evidence availability, required inputs and gaps; they are not completeness percentages or promises of calculator resolution. The eight calculator categories have visible context and source periods, with native disclosures for linked publishers and effective bounds. Energy combines regional published price evidence with clearly labelled NEED reference evidence; groceries and household spending stay reference-only. Original provider tariff tables and amounts are not redistributed. Source reuse/export restrictions from Milestone 1 remain unresolved and unchanged.

London rent remains regional and council tax has no released borough schedule; Edinburgh has no exact rent row; Glasgow rent remains Greater Glasgow rather than Glasgow City. Bristol preserves separate clean-water/wastewater providers. Birmingham retains unresolved applicability. Transport network names come only from the applicable city's released products; the verified 14 September 2026 observations do not establish later-date fares.

City CTAs link directly to `/calculator`, with no preselection, query state or financial URL payload. Calculator code, engine, data generation and artifacts remain unchanged. Taxpayer status is explicitly user-confirmed. City metadata has unique factual titles/descriptions; no deployment domain, rankings, structured financial claims or aliases are invented. Methodology and Sources now use the Slice 4.3 production treatment described below.

See [Slice 4.2 implementation and QA](milestone-4-slice-2.md) for validation, exceptions and screenshot evidence.

## Slice 4.3 transparency architecture

`/methodology` explains the eight-category comparison, monthly buffer equation, supported annual income model, salary preservation, partial results, coverage, classifications, overrides, dates, geography, rounding and exclusions. A contents navigation supports scanning. Public explanations live in `src/product/transparency/methodology.ts`; there is no arithmetic or additional model in the page.

`/sources` uses `buildSourceRegister` in `src/product/transparency/sources.ts`. All ten active observed datasets pass the existing pinned `validateDataset` gate. Entries are grouped by source family, organisation and publication title, retaining distinct publications rather than dumping records. The eight UI categories contain 32 publication entries and all 41 recorded source URLs. Exact original dates and periods are retained; unrecorded publication dates are omitted.

An explicit projection includes only descriptive metadata, source links, scopes, periods, use status and reviewed public limitations. Raw records, financial source amounts, QA/import metadata, raw workbook content and development models are never projected. Ofgem links retain their recorded embedded-chart URLs and gain fuel/tariff/payment labels from released fields; NEED workbook links retain their nation groups. Provider and operator reuse restrictions remain qualified. At the end of Slice 4.3 the calculator client bundle still carried generated evidence QA/import metadata; Slice 4.4 removes that raw payload through the boundary described below. The transparency pages never loaded that chunk.

`PublicSourceEntry` separates observation classification, evidence role and current calculator use. Tax/NI references are labelled reference evidence and used as deterministic rule inputs. NEED/spending references are context only. Ofgem is published regional evidence but reference context in the present household flow; English water and transport likewise do not activate unsupported household calculations. Scottish band paths and exact rent/council matches are used with conditions. No calculated price table is exported.

`Provenance` shares classification definitions and source citation presentation between Methodology, Sources and Cities. The classification labels reuse the calculator mapping. The existing results date formatter moves unchanged to a shared `periods.ts` module and remains re-exported for compatibility. Results retain their separate explanation/interaction model, without a broad refactor. City factual content is retained; only shared citation presentation and completed-page link copy change. Homepage preparation copy is removed.

Both new pages use server components, the public shell, native disclosures, semantic headings/definitions and scoped styling. Sources and methodology have unique production metadata. There are no new routes, client state, financial URLs or external requests. See [Slice 4.3 QA](milestone-4-slice-3.md) for release-safety, responsive and leakage checks.

## Milestone 4 closure and deployment follow-up

Later launch-integration slices should cover Privacy/Accessibility content, final metadata/SEO decisions, real VoiceOver and owner visual sign-off, then separately reviewed deployment/cutover. Analytics, if later requested, needs a deliberate privacy boundary. Do not treat temporary route availability as Milestone 4 closure or production-launch approval.

Validation and screenshot evidence for this slice are recorded in [Slice 4.1 QA](milestone-4-slice-1.md). No staging, commit, push or cutover is performed in this task.

## Slice 4.4 runtime and evidence boundary

The calculator server layout now validates the same ten pinned releases and constructs a small static evidence DTO. This is public evidence, never a user's inputs or results. The browser journey receives it as serializable props; its form and result remain exclusively in reducer memory. Calculating dynamically loads the shared pure runtime and a DTO reader. There is no server action, calculation request, cookie, storage adapter or result cache.

| Classification | Modules | Boundary |
| --- | --- | --- |
| SERVER-SAFE | Public layouts/pages, city registry, source register, calculator evidence projection and its server-only entry | Validate/project static evidence and render descriptive content |
| CLIENT-REQUIRED | PublicHeader (`aria-current`), JourneyProvider, forms/review/results, result source buttons, error retry | Navigation state, user interaction and browser-only financial state |
| SHARED PURE | Exact evidence selectors, year-month schema, calculation runtime, adapter/composer/view model, financial arithmetic | No datasets, IO or persistence; inputs supplied explicitly |

Import graph: generated JSON → `engine/loaders/datasets.ts` → original pinned validation → (public city/source projection → server HTML) or (calculator projection → layout DTO → client reader → shared selectors → pure calculation runtime). Development previews and test APIs retain the full validated loader. The ten JSON imports have one owner; no generated audits, ingestion reports or calculated artifacts are newly imported.

The original exact selectors are extracted unchanged. The year-month schema no longer imports the dataset-owning loader. Income rule schemas move unchanged into a focused module, avoiding construction of unrelated release schemas in the browser. Existing form validation and income validation remain. No arithmetic, source-selection predicate, rounding rule, source artifact or release gate changes.

Of 1,191 active records, 242 are needed by this product flow. Unused energy reference records, unsupported English water tariff calculations and rent rows without a selectable bedroom band stay server-side. Spending and transport reference records stay because their baseline provenance is still used. An explicit provenance allowlist removes worksheet coordinates, extraction diagnostics and arbitrary QA. Public periods, geography, source links, classifications, methodology and limitations remain. A deduplicated provenance dictionary avoids repeating the same text on every row. `qa.displayedAnnualGbp` is retained for council tax: despite its legacy field name it is the exact decimal financial input used by the unchanged engine. Required validation timestamps, source identities and release metadata remain for lineage. Six fixture classes are compared through both full and projected loaders, including their entire public result/disclosure models.

The public pages continue to render server-side, with native Sources disclosures and no hydrated register object. Informational pages share the small active-navigation component and framework runtime; no calculator/evidence chunk belongs to them. The development preview import is inside the positive compile-time development branch so production emits neither its fixtures nor its raw-data chunk; the route itself returns 404.

Root and global error fallbacks provide generic recovery without rendering/logging an error object. The public group's not-found fallback respects the shell's existing main landmark. Security headers disable framing, MIME sniffing, referrer transmission and unused camera/microphone/geolocation access. The initial CSP covers base URI, objects and ancestors; a script/style nonce/hash policy and HSTS await deployment/domain review. Browser production source maps and the powered-by header are disabled explicitly. There is no production cutover.

See [Slice 4.4 audit and validation](milestone-4-slice-4.md) for byte measurements, privacy findings, browser results and launch debt.

## Slice 4.5 policies and release preparation

`/privacy` and `/accessibility` are Server Components using a small shared PolicyPage renderer and existing transparency styles. The footer links to both and includes a concise informational-tool disclaimer. No About or Cookies placeholder is added. Privacy explains browser-memory calculation, no app persistence/financial requests, disabled analytics/advertising, ordinary hosting requests/logs, external sources and the possibility of retained legacy storage. Existing public repository contact is available for non-sensitive reports; a private contact and deployment-specific processing details remain owner launch gates. Accessibility states actual Chromium/WebKit checks and pending manual VoiceOver/device review, without claiming WCAG certification.

`src/product/launch/indexing.ts` reuses the typed city registry to list the 15 public entry routes. `/robots.txt` permits public pages and excludes development/source/result paths; it is not security enforcement. `/sitemap.xml` uses only explicitly approved server `SITE_URL`, never Host/preview inference. These two small dynamic GET handlers avoid build-time stale host configuration. Missing origin returns a non-cached 503 for the sitemap and omits robots discovery; configured valid HTTPS origin returns XML with exactly 15 routes. Unknown host is an explicit launch gate. There are no invented canonical tags or preview-domain fallbacks.

Three fixed GET/HEAD proxy redirects replace legacy `/index.html`, `/privacy.html` and `/cookies.html`; 308 destinations are `/`, `/privacy` and `/privacy#cookies`. The exact-path server proxy deliberately discards legacy queries, unlike automatic Next config query forwarding. `/about.html`, old fragment bookmarks and historical icons require owner decisions documented in the redirect inventory. No engine/data artifact or numerical behavior changes.

Production smoke can target local build or an explicitly supplied `SMOKE_BASE_URL`; it never selects a guessed domain or deploys. A remote run also requires `SMOKE_EXPECT_SITE_URL`. Expanded checks cover new policy routes/footer, internal links, indexing, fixed redirects, legacy-storage non-import, restart/refresh and existing privacy/header/fixture boundaries. No analytics, secrets, new financial endpoint or persistent result cache is introduced.

Release preparation lives in [Slice 4.5 audit](milestone-4-slice-5.md), [owner accessibility/content QA](owner-accessibility-qa.md), [privacy implementation notes](privacy-implementation-notes.md), [legacy redirect map](legacy-redirect-map.md), [production smoke plan](production-smoke-test.md) and [cutover/rollback plan](production-cutover.md). They explicitly separate reviewed code readiness from owner sign-off and deployment authorisation. No merge, tag, deployment or external setting change is part of this slice.

The `/index.html` mapping uses the installed Next `src/proxy.ts` convention: a filesystem route named index.html conflicts with the prerendered homepage output. The proxy has only three matchers and no state, body parsing, logging or financial routing. It constructs fixed target URLs and strips query strings.
