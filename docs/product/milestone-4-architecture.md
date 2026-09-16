# Milestone 4: launch integration and production readiness

## Scope and starting point

Slice 4.1 adds the public homepage and navigation around the closed Milestone 3 calculator. It does not implement financial calculations, city profiles, a source register, methodology content, analytics, redirects, production cutover or deep SEO work.

Started on `rebuild/next-production`, commit `92076a833ca3725f2a1afc5f4959ec1a4156da2a` (`Close Milestone 3 calculator product experience`). `git fetch origin` succeeded; local HEAD matched `origin/rebuild/next-production` with zero commits ahead/behind. The only untracked file was the protected raw workbook. AGENTS.md, installed Next.js layout/route-group/CSS/metadata guidance, app routes, tokens, metadata, tests and Milestone 3 visual/product records informed the implementation.

Milestone 1 evidence and Milestone 2 engine remain closed. [Milestone 3 closure](milestone-3-closure.md) remains the calculator's product boundary and regression baseline.

## Route map

| Route | Slice 4.1 status | Owner |
| --- | --- | --- |
| `/` | Public homepage | `src/app/(public)/page.tsx` |
| `/cities` | Clearly marked temporary page; no profiles, rankings or cost claims | `(public)/cities/page.tsx` |
| `/methodology` | Clearly marked temporary page; directs users to existing result explanations | `(public)/methodology/page.tsx` |
| `/sources` | Clearly marked temporary page; not a source register | `(public)/sources/page.tsx` |
| `/calculator` and existing step/results routes | Existing production journey, unchanged behavior | Existing calculator layout/provider/pages |
| `/dev/calculator-results` | Existing development-only fixture route | Existing development route; production 404 |

No city detail, About, Privacy or Accessibility route is fabricated. Footer links only point to implemented routes. The three temporary public pages must be replaced before Milestone 4 closure and production cutover. They return a useful incomplete page with `noindex, follow` metadata; they do not masquerade as complete guides.

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
5. Eight supported city names in neutral informational cards: London, Birmingham, Manchester, Leeds, Liverpool, Bristol, Edinburgh and Glasgow. All link to the honest `/cities` holding page; no invented detail routes or city-level numeric claims.
6. “Built to show its workings”: category-specific source/effective periods, limitations, partial results and readable classification explanations. Methodology/Sources links disclose that those public pages are being prepared; existing calculator source explanations remain available.
7. Final invitation to start the calculator, without urgency or promised outcomes.

## Design and accessibility boundary

`src/components/public/public.module.css` scopes the public shell's styles. Palette, Inter/Arial/Helvetica fallback, fine borders, restrained rounded panels, navy headings, blue actions, mint surfaces and 1160px content width follow the existing calculator direction. The root global stylesheet and calculator/report styles are unchanged. This avoids style leakage during client navigation.

No stock photography, remote fonts, generated art, new icon dependency or fake chart is added. Structural arrows are decorative text and hidden from assistive technology. Native headings, sections, ordered steps, lists, links, labelled nav/main/footer landmarks and visible focus carry the content. The public shell has one H1 per page and a working skip link. Responsive styles stack hero/CTA/step cards and adapt city/trust grids; all header links remain visible.

Approved original font/skyline/pictogram assets remain unavailable from Milestone 3. The typography/layout treatment is deliberate; it does not claim exact artwork fidelity. The now-unused Milestone 0 DevelopmentShell component and its scoped legacy CSS remain unmounted, with no public route to the old demo. Cleanup can be separate.

## Calculator and evidence boundaries

Public components have no imports from engine calculators, product orchestration, generated evidence or development fixtures. Homepage city names and explanatory copy are informational only. No savings, costs, scores, salary requirements or financial fallbacks are computed. No acceptance-case output is used as marketing.

The calculator metadata change does not alter its context/provider, adapter, engine inputs, composer, view model, report, source panels, state lifecycle or privacy. Existing Milestone 3 product acceptance and browser suites remain the release gates. Generated artifacts and raw workbook are protected and checked against the existing hash baseline.

## Metadata

The homepage has a factual title and description matching its scope. Calculator metadata describes household costs, take-home, buffer and explicit unknown/source states. Each temporary public route has its own in-preparation title/description and `robots: { index: false, follow: true }`. No canonical domain, fabricated social images, structured financial claims or redirect configuration is introduced.

## Deferred Slice 4.2+ work

Slice 4.2 should replace `/cities` with the actual supported-city index and deliberately scoped city detail routes, using reviewed coverage/provenance and honest source gaps. It must not invent affordability rankings or a city-level household budget from reference data. Replace the homepage holding-page guidance only when those routes are ready.

Later launch-integration slices should implement public methodology and the sources register, Privacy/Accessibility content, final metadata/SEO decisions, wider browser/assistive-technology and owner visual sign-off, then separately reviewed deployment/cutover. Analytics, if later requested, needs a deliberate privacy boundary. Do not treat temporary route availability as Milestone 4 closure or production-launch approval.

Validation and screenshot evidence for this slice are recorded in [Slice 4.1 QA](milestone-4-slice-1.md). No staging, commit, push or cutover is performed in this task.
