# Milestone 4: launch integration and production readiness

## Scope and starting point

Slice 4.1 added the public homepage and navigation around the closed Milestone 3 calculator. Slice 4.2 now adds the supported-city index and eight evidence-aware city pages. Neither slice adds financial calculations, a source register, methodology content, analytics, redirects or production cutover.

Started on `rebuild/next-production`, commit `92076a833ca3725f2a1afc5f4959ec1a4156da2a` (`Close Milestone 3 calculator product experience`). `git fetch origin` succeeded; local HEAD matched `origin/rebuild/next-production` with zero commits ahead/behind. The only untracked file was the protected raw workbook. AGENTS.md, installed Next.js layout/route-group/CSS/metadata guidance, app routes, tokens, metadata, tests and Milestone 3 visual/product records informed the implementation.

Milestone 1 evidence and Milestone 2 engine remain closed. [Milestone 3 closure](milestone-3-closure.md) remains the calculator's product boundary and regression baseline.

## Route map

| Route | Current status after Slice 4.2 | Owner |
| --- | --- | --- |
| `/` | Public homepage | `src/app/(public)/page.tsx` |
| `/cities` | Eight supported cities, equal cards and explicit evidence boundaries | `(public)/cities/page.tsx` |
| `/cities/[slug]` | Eight statically generated city pages; unsupported slugs call `notFound()` | `(public)/cities/[slug]/page.tsx` |
| `/methodology` | Clearly marked temporary page; directs users to existing result explanations | `(public)/methodology/page.tsx` |
| `/sources` | Clearly marked temporary page; not a source register | `(public)/sources/page.tsx` |
| `/calculator` and existing step/results routes | Existing production journey, unchanged behavior | Existing calculator layout/provider/pages |
| `/dev/calculator-results` | Existing development-only fixture route | Existing development route; production 404 |

Only the eight canonical city detail routes are supported. About, Privacy and Accessibility routes are not fabricated. Methodology and Sources remain explicitly incomplete with `noindex, follow`; they must be completed before Milestone 4 closure.

## Layout and shell strategy

The existing top-level root layout remains the single `html`/`body` owner. Its default description now describes the product factually. A `(public)` route group adds `PublicLayout` without changing URLs or creating a second root layout. The former root development-shell page is replaced by the route-group homepage; there is no duplicate `/` route.

PublicLayout owns one skip link, PublicHeader, focusable main target and PublicFooter. All public routes share them. PublicHeader is a small client component only because `usePathname` supplies `aria-current="page"`. Homepage, placeholder content and footer are server components. No data fetching, account state, storage or analytics is introduced.

The calculator deliberately retains its focused Milestone 3 shell variant: ResultsHeader, its existing skip link, progress, New comparison and result section links. PublicHeader/Footer do not wrap it, so there are no duplicate banners, main landmarks or competing restart controls. Its shared provider, focus handling, result state and navigation behavior are unchanged. The brand/home links provide the return to the homepage. Only factual calculator metadata is added to its layout.

Mobile public navigation stays visible and wraps into rows; it has no collapsing menu, focus trap or extra menu state. Every primary nav item has a minimum 44px height. Natural Tab/Enter behavior works without menu-specific Escape logic. Calculator receives the outlined CTA treatment, while the current public route also has a textual/semantic active state.

The footer includes the brand, a short product description, Calculator/Cities/Methodology/Sources links, evidence principles and the UTC year rendered by the server. Static builds capture the build year's value and need a rebuild when the year changes. Privacy/Accessibility links can be added when their actual pages exist. No social accounts are invented.

## Homepage information architecture

1. Mint hero: “See what a move could really mean for your monthly money”, factual supporting copy, Compare your move → `/calculator`, Explore supported cities → `/cities`.
2. Non-financial structural comparison card: current/destination context, household costs, take-home and monthly buffer labels. It has no sample amounts, savings, rankings or score.
3. Four product principles: suitable official UK evidence, actual household amounts, missing stays missing, transparent sources. The sole currency illustration is the explicit explanation that unknown values are not silently converted to £0.
4. Three steps: move details; household/money details; results, including costs, take-home, buffer, drivers and eligible salary preservation.
5. Eight supported city names in neutral informational cards: London, Birmingham, Manchester, Leeds, Liverpool, Bristol, Edinburgh and Glasgow. Each links to its canonical `/cities/[slug]` evidence page. No city-level numeric cost claims are published.
6. “Built to show its workings”: category-specific source/effective periods, limitations, partial results and readable classification explanations. Methodology/Sources links disclose that those public pages are being prepared; existing calculator source explanations remain available.
7. Final invitation to start the calculator, without urgency or promised outcomes.

## Design and accessibility boundary

`src/components/public/public.module.css` scopes the public shell's styles. Palette, Inter/Arial/Helvetica fallback, fine borders, restrained rounded panels, navy headings, blue actions, mint surfaces and 1160px content width follow the existing calculator direction. The root global stylesheet and calculator/report styles are unchanged. This avoids style leakage during client navigation.

No stock photography, remote fonts, generated art, new icon dependency or fake chart is added. Structural arrows are decorative text and hidden from assistive technology. Native headings, sections, ordered steps, lists, links, labelled nav/main/footer landmarks and visible focus carry the content. The public shell has one H1 per page and a working skip link. Responsive styles stack hero/CTA/step cards and adapt city/trust grids; all header links remain visible.

Approved original font/skyline/pictogram assets remain unavailable from Milestone 3. The typography/layout treatment is deliberate; it does not claim exact artwork fidelity. The now-unused Milestone 0 DevelopmentShell component and its scoped legacy CSS remain unmounted, with no public route to the old demo. Cleanup can be separate.

## Calculator and evidence boundaries

Public components have no imports from engine calculators, product orchestration or development fixtures. The city registry uses the existing typed production validator and an explicit non-financial source projection. Homepage and index reuse its central city definitions. No savings, costs, scores, salary requirements or financial fallbacks are computed. No acceptance-case output is used as marketing.

The calculator metadata change does not alter its context/provider, adapter, engine inputs, composer, view model, report, source panels, state lifecycle or privacy. Existing Milestone 3 product acceptance and browser suites remain the release gates. Generated artifacts and raw workbook are protected and checked against the existing hash baseline.

## Metadata

The homepage has a factual title and description matching its scope. Calculator metadata describes household costs, take-home, buffer and explicit unknown/source states. Each temporary public route has its own in-preparation title/description and `robots: { index: false, follow: true }`. No canonical domain, fabricated social images, structured financial claims or redirect configuration is introduced.

## Slice 4.2 city architecture

`src/product/cities/registry.ts` owns the eight typed definitions, canonical slugs, calculator city IDs, audited service mappings, coverage semantics and metadata. `buildCityPages` validates eight pinned production evidence families through the existing `validateDataset` gate. It filters exact city/provider applicability and projects only publisher/title/URL/period/effective bounds/classification. It never projects record prices, calculated derivatives, raw workbook content or development profiles. Invalid releases throw; no replacement values or geographies are supplied.

One async dynamic route consumes Next.js promise params, generates exactly eight static paths, returns factual per-city metadata and calls `notFound()` for unsupported slugs. `CityPage` renders the common template; its scoped CSS extends the existing public visual language. All category meaning lives in the registry, outside React. There is no financial arithmetic.

Five textual coverage states describe evidence availability, required inputs and gaps; they are not completeness percentages or promises of calculator resolution. The eight calculator categories have visible context and source periods, with native disclosures for linked publishers and effective bounds. Energy combines regional published price evidence with clearly labelled NEED reference evidence; groceries and household spending stay reference-only. Original provider tariff tables and amounts are not redistributed. Source reuse/export restrictions from Milestone 1 remain unresolved and unchanged.

London rent remains regional and council tax has no released borough schedule; Edinburgh has no exact rent row; Glasgow rent remains Greater Glasgow rather than Glasgow City. Bristol preserves separate clean-water/wastewater providers. Birmingham retains unresolved applicability. Transport network names come only from the applicable city's released products; the verified 14 September 2026 observations do not establish later-date fares.

City CTAs link directly to `/calculator`, with no preselection, query state or financial URL payload. Calculator code, engine, data generation and artifacts remain unchanged. Taxpayer status is explicitly user-confirmed. City metadata has unique factual titles/descriptions; no deployment domain, rankings, structured financial claims or aliases are invented. Methodology and Sources retain their placeholder/noindex treatment.

See [Slice 4.2 implementation and QA](milestone-4-slice-2.md) for validation, exceptions and screenshot evidence.

## Deferred Slice 4.3+ work

Later launch-integration slices should implement public methodology and the sources register, Privacy/Accessibility content, final metadata/SEO decisions, wider browser/assistive-technology and owner visual sign-off, then separately reviewed deployment/cutover. Analytics, if later requested, needs a deliberate privacy boundary. Do not treat temporary route availability as Milestone 4 closure or production-launch approval.

Validation and screenshot evidence for this slice are recorded in [Slice 4.1 QA](milestone-4-slice-1.md). No staging, commit, push or cutover is performed in this task.
