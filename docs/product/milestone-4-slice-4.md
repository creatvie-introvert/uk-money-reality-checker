# Milestone 4 Slice 4.4 — launch readiness audit

Audit date: 16 September 2026. Scope: bundle boundaries, production hardening, privacy, browser/accessibility and regression QA. No new financial model, source evidence, city content, analytics or production cutover.

## Starting state and protected inputs

Branch `rebuild/next-production`, HEAD `20893d1` (`Build Milestone 4 public methodology and sources`). `git fetch origin` succeeded and HEAD matched `origin/rebuild/next-production` (0 ahead / 0 behind). The only initial untracked file was `src/data/raw/ukmr_data_pack_and_source_register_v3_1.xlsx`. AGENTS.md and installed Next 16.3.4 server/client, error, not-found and header guidance were read. The installed error-boundary API uses `retry`; no older reset-only convention was assumed.

All 32 generated artifacts and the raw workbook match the protected SHA-256 baseline. Workbook SHA-256: `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`. It remains untouched and untracked. No staging, commit, push, deployment or dependency upgrade was performed.

## Architecture and import findings

See [architecture](milestone-4-architecture.md#slice-44-runtime-and-evidence-boundary) for the module classification/import graph.

- Public pages, city/source projections and calculator evidence projection are SERVER-SAFE. City pages are generated for exactly eight canonical slugs. Sources uses 32 native `details` disclosures; no separate register object is passed to a Client Component.
- PublicHeader is CLIENT-REQUIRED for route-aware navigation. Calculator forms, reducer/provider, review/results and interactive source disclosures are CLIENT-REQUIRED. Root error recovery has a small retry interaction.
- Engine arithmetic, adapter/composer/view model, exact selectors and standalone period validation are SHARED PURE. User financial inputs and results never cross the browser/server boundary.
- All ten production JSON imports are in `engine/loaders/datasets.ts`. Previously a shared period-schema import from the loader pulled the entire data graph into initial calculator JS. The development route's static preview import also emitted its raw-data and fixture chunks even though the production route returned 404.
- The period schema is now independent, exact selectors are extracted without changing predicates, and calculation runtime requires an explicit loader. Income/NI schemas move unchanged to a focused module. Pinned full-artifact validation stays at build/server entry; form validation and existing income validation remain client-side.
- A server projection sends 242 relevant records instead of all 1,191. The full release is validated before filtering. No calculator resolver reads the omitted energy references, English water tariffs or all-property rent rows. Spending/transport reference evidence remains for result provenance.
- The development import is now within a positive compile-time development branch. The preview remains usable in development, but its code/data is absent from production client output and its production route is 404.

## Evidence and leakage classification

**Intentionally public:** organisation, publication, source URL, classifications, geography, source/effective periods, methodology and limitations. These remain verbatim. Provenance is deduplicated, not abbreviated or fetched on disclosure open. Current result interactions therefore remain immediate and usable offline after assets load. Required source IDs/timestamps and release manifests remain for existing validation/result lineage.

**Harmless technical strings:** `sourceReference`, `parserVersion`, `importVersion` and similar optional property names remain inside the unchanged provenance schema used by income validation. No corresponding worksheet/extraction values are in the projected DTO. Release-status enum strings are validation code, not a leak of raw release QA. Public limitations may naturally discuss source methodology.

**Removed internal payload:** arbitrary QA, sheet/table/row/cell coordinates, raw source values/number formats, parser/import/checksum provenance baggage and unused record arrays. The sole retained `qa.displayedAnnualGbp` council-tax field is an exact decimal financial input used by the original engine, not a diagnostic. Removing it would change money results.

`node scripts/qa/production-isolation.mjs` scans production browser assets and prerendered HTML/RSC, asserts no workbook/local-machine paths, raw QA markers or locked fixture amounts, and checks development route metadata is 404. A separate server-output search found no raw workbook filename, `/Users/` or machine name. Raw QA occurs only in one server JS chunk and its server map. Server chunks contain validated source artifacts because server projections need them; they are build internals, not static downloadable JSON routes. Production HTTP checks cover raw workbook/generated JSON paths returning 404. No browser source maps are published. Obsolete `DevelopmentShell` is unmounted and has no production client import; unrelated legacy CSS/utility cleanup was deliberately left out.

## Bundle measurement

`node scripts/qa/bundle-audit.mjs` uses route prerender HTML to collect unique referenced JS/CSS and measures raw bytes and individually gzip-compressed bytes. This is reproducible local asset accounting, not a Lighthouse score or a network-throttled First Load JS benchmark. It includes shared framework assets/preloads; lazy chunks fetched on calculation are accounted separately by the total client-output measure. The direct results route initially renders the empty state; populated results are measured through the browser journey.

| Route | Initial referenced JS before → after, raw bytes | JS gzip before → after | HTML raw before → after | HTML gzip before → after |
| --- | ---: | ---: | ---: | ---: |
| `/` | 577,326 → 579,528 | 177,605 → 178,500 | 30,197 → 30,130 | 5,482 → 5,196 |
| `/cities` | 577,326 → 579,528 | 177,605 → 178,500 | 24,857 → 24,764 | 4,259 → 3,966 |
| `/cities/london` | 577,326 → 579,528 | 177,605 → 178,500 | 58,192 → 58,069 | 8,600 → 8,312 |
| `/methodology` | 577,326 → 579,528 | 177,605 → 178,500 | 60,674 → 60,581 | 12,395 → 12,109 |
| `/sources` | 577,326 → 579,528 | 177,605 → 178,500 | 209,798 → 209,705 | 23,090 → 22,800 |
| `/calculator` | 4,091,516 → 1,007,741 | 367,954 → 280,154 | 11,669 → 230,163 | 3,021 → 21,264 |
| `/calculator/results` | 4,083,217 → 999,442 | 365,353 → 277,553 | 9,044 → 227,554 | 2,352 → 20,618 |

Total emitted client JS: **4,199,423 → 1,103,270 bytes** (73.7% smaller). These totals include all emitted lazy and route-specific client chunks, not a single page load.

CSS raw/gzip bytes: public routes 23,631/4,493 → 24,521/4,937; calculator/results 31,068/5,965 → 32,064/6,429. Small growth comes from recovery-page styling and the native-select fix.

The calculator's HTML is larger because the reduced public DTO is now serialised in RSC props instead of embedding complete releases in executable JS. This is a deliberate transfer: count HTML as well as JS. Initial calculator JS + HTML gzip still decreases, and the total executable data/code decreases substantially. Public JS gains only generic error recovery; no engine/source register enters its graph. The remaining largest calculator chunk is form/schema code and Zod, not raw evidence. No hard KB budget is invented: keep informational pages free of calculator/data hydration, and require before/after measurements for future additions.

## Production configuration, security and privacy

- Strict Mode remains on. Browser source maps explicitly off; powered-by header off. No image host configuration, remote font provider, experimental flag, rewrite, redirect, runtime override or trailing-slash change is introduced. Default Node/build behavior is retained.
- Added `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-Frame-Options: DENY`, and CSP `base-uri 'self'; object-src 'none'; frame-ancestors 'none'`. These are checked on production routes. This is a limited CSP, not an XSS-complete script/style policy. Nonce/hash architecture and HSTS need the actual deployment/domain and are deferred.
- Existing same-tab public source links remain. Results new-tab source links now explicitly use `noopener noreferrer`. Source links retain their original URLs; no javascript URLs are introduced.
- `npm audit --json`: **0 vulnerabilities** (info/low/moderate/high/critical all 0; 501 total dependencies reported, 23 production). No direct or transitive remediation/upgrade needed at audit time; this is not a permanent guarantee.
- Source scan finds no application console logging, fetch/beacon analytics, storage or cookie writes. Calculator production journeys record request methods/origins/bodies and assert only same-origin GET/HEAD, no financial URL parameters, no third-party payload, and no page errors.
- Browser checks assert empty localStorage/sessionStorage, IndexedDB database list, Cache Storage and cookies. Normal static HTTP caching is distinct from app persistence. Public pages and evidence can be statically cached; personal results exist only in reducer memory and are never rendered into a shared server cache. Refresh/restart regressions remain covered.
- Root/global errors render generic recovery text, retry and product links. Error-object sentinel tests prove financial/path/evidence strings are not rendered. Invalid routes, unsupported cities and production development routes have usable 404s. A public-group fallback avoids nesting another main inside the public shell. Existing calculation catch/empty-result behavior remains generic and unchanged.
- Public metadata and noindex behavior remain unchanged for valid routes; Next adds noindex for not-found routes. No canonical-host, robots-file or cutover-specific changes are added.

## Performance, assets and rendering

Main route output remains static for `/`, `/cities`, `/methodology`, `/sources`, `/calculator` and `/calculator/results`; eight city pages are SSG. `/calculator/[step]` remains dynamic as before. A static results shell does not imply server-cached personal results. `/dev/calculator-results` is emitted as a static 404.

Public and calculator typography use `Inter, Arial, Helvetica, sans-serif`; Inter is not downloaded. The root's legacy Georgia fallback does not override scoped production page stacks. Recovery pages have their own matching stack. No blocking external font, image request, missing logo path, stock imagery, oversized bitmap or custom font asset exists. Approved font files/licensing remain nonblocking debt.

Local production measurements (one unthrottled local-server run, shared assets warm after the first page; not field Core Web Vitals):

| Route | Chromium DOMContentLoaded | WebKit DOMContentLoaded |
| --- | ---: | ---: |
| `/` | 128.5 ms | 144.0 ms |
| `/cities` | 55.6 ms | 29.0 ms |
| `/cities/london` | 24.7 ms | 12.0 ms |
| `/methodology` | 22.6 ms | 8.0 ms |
| `/sources` | 21.1 ms | 14.0 ms |
| `/calculator` | 33.8 ms | 16.0 ms |
| `/calculator/results` | 26.4 ms | 11.0 ms |

Chromium observed cumulative layout shift 0 on all seven route checks, including the tested reflows. This WebKit build does not expose the layout-shift observer, so its CLS is unmeasured, not claimed as zero. Both browsers loaded zero font resources; asset checks found no failed requests. Lighthouse is not installed, so no Lighthouse score is claimed. Available browser performance APIs and production asset accounting were used instead.

With a populated result, click-to-visible-result was 131ms complete / 123ms partial in Chromium and 146ms / 96ms in WebKit. Each full journey made 32 same-origin GET requests and loaded 15 JS resources: 975,203 decoded JS bytes, with measured transfer 269,811 bytes (Chromium) / 270,198 (WebKit). These browser resource measurements differ from the build's referenced/preloaded asset totals; neither includes personal data in a network request. Initial static evidence is counted separately in the HTML/RSC measurements. Result latency includes lazy runtime download and render on this local machine; it is not a mobile-device or slow-network guarantee.

The 320px production homepage, Sources and populated-result viewport captures were visually inspected, alongside the WebKit income reflow capture. No clipped content or horizontal page overflow was observed in those inspections or automated route/matrix checks.


## Browser and accessibility findings

Browser versions: Playwright 1.63.0; Chromium 153.0.8010.12 (revision 1243); WebKit 26.6 (revision 2359), macOS ARM64. WebKit was installed and actually exercised. Final matrix is recorded below.

Initial simultaneous browser/build work produced timing failures; subsequent runs isolate one browser worker and never build while browser tests run. A unit oracle also exceeded its 5s timeout under concurrent browser load; the isolated full unit run passed without changing timeouts or assertions. WebKit then exposed two reproducible differences:

- Native tax-jurisdiction select text extended the income page to 347px at a 320px viewport. A scoped select rule now constrains native selected text to its control and sets a 44px control height. The native option menu retains the entire jurisdiction label. The full closure matrix now asserts control bounds and select target height. No financial copy or options changed. A 320px WebKit income screenshot was visually inspected after the fix.
- macOS WebKit's default keyboard preference requires Option-Tab to include links. The first skip-link test now uses that browser/platform-appropriate key; it still asserts actual focus and Enter behavior, with no programmatic-focus substitute for that assertion.

Production testing caught a nested main in the first invalid-city fallback; the public-group fallback fixes it. A new partial assertion initially targeted the change strip instead of the residual summary and was corrected to assert both truthful messages. These preliminary failures are disclosed rather than counted as passes.

Automated checks cover labels, one H1/main, public header/footer/navigation, current-page state, skip links, invalid-field focus, progress, review edit, source buttons and native details, empty results, restart and result direction labels. These are DOM/interaction checks, not accessibility certification. No meaningful animation was added; existing reduced-motion handling remains. Reflow covers 320px and the existing 390/768/1024/1280/1440 matrix; production adds 720 CSS px as the layout equivalent of 1440px at 200% zoom. This is not a claim that native browser zoom or macOS display scaling was operated manually.

Reused prior measured contrast: body/canvas 17.01:1, hero title/darkest mint 12.79:1, hero helper/mint 7.44:1, white/primary blue 5.82:1, muted/canvas 5.97:1, footer helper/navy 11.88:1. New public spot checks using sRGB luminance: source badge `#17456d` on `#edf6ff` 9.12:1; callout text `#354e6e` on `#edf6ff` 7.80:1; blue focus indicator on white 5.82:1 and pale blue 5.33:1. No measured text/focus contrast failure in these pairs; subtle decorative borders are not being claimed as text contrast.

**VoiceOver manual QA requires owner testing.** Real VoiceOver speech, rotor, reading order and announcement quality have not been manually tested. Owner checklist: public landmarks/navigation; calculator title/progress; field label/helper/error; review/edit; result headline; source disclosure; Methodology headings; Sources disclosure. WebKit automation is Safari-equivalent engine coverage, not a claim of running the installed Safari UI or VoiceOver.

## Numerical and public regression

Manchester → Leeds remains: current costs £2,314.67; destination £2,163.31; cost change −£151.36; take-home £3,293.30 → £3,538.12 (+£244.82); buffer £978.63 → £1,374.81 (+£396.18); salary preservation £47,477.35; coverage 8/8. Existing acceptance tests and browser widths protect these values. Any change remains a stop condition.

The partial journey retains 6/8 destination coverage, known-cost/incomplete-buffer qualification and unavailable salary preservation; no fabricated costs are introduced. Six complete product/disclosure outputs from the projected loader are deeply equal to their original full-loader equivalents, covering complete, partial, override, unchanged, limited and Scottish cases.

Eight cities, Edinburgh's rent gap, Greater Glasgow wording, Bristol's provider split, Methodology explanations, 32 source entries and all 41 recorded URLs remain protected by existing tests. No public numeric claims or financial content changes were made.

## Validation and files

Focused new protection: ten DTO/provenance/pinned-validation/equivalence tests, three safe-error rendering/landmark tests, four production browser tests per browser, plus a build isolation scan. The existing orchestration spy points at the extracted direct salary-preservation module; the assertion is unchanged. Journey setup is shared between existing and production tests. Existing closure checks gain useful overflow diagnostics and native-select height checks.

| Check | Final result |
| --- | --- |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | 993 passed, 27 files; no failures/skips |
| `npm run build` | Pass; expected static/SSG/dynamic route map |
| `npm run data:verify` | Pass: all 32 artifacts, 1,191 observed rows, 80 coverage cells |
| `git diff --check` | Pass |
| `npm run test:e2e -- --workers=1 --reporter=list` — Chromium | 53 passed, 0 failed, 0 skipped |
| Same command — WebKit | 53 passed, 0 failed, 0 skipped |
| `npm run test:e2e -- --config=playwright.production.config.ts --workers=1` — Chromium | 4 passed, 0 failed, 0 skipped |
| Same production command — WebKit | 4 passed, 0 failed, 0 skipped |
| `node scripts/qa/production-isolation.mjs` | Pass: 111 public assets/HTML/RSC files; development route 404 |
| `npm audit --json` | 0 vulnerabilities |
| SHA-256 protected comparison | 32 generated artifacts + workbook unchanged |

Browser production metrics and captures are in ignored `test-results-production/`; existing viewport captures are under `/tmp/ukmr-*`. Before/after raw build measurements were retained in `/tmp/ukmr-4-4-bundle-{before,after}.json`; the table above is the durable summary. Browser runners used one worker to avoid concurrent Next compilation/resource contention; no test assertion was removed to obtain a pass.

Created (24 files):

- `docs/product/milestone-4-slice-4.md`
- `e2e-production/launch.spec.ts`
- `e2e/helpers/journey.ts`
- `playwright.production.config.ts`
- `scripts/qa/bundle-audit.mjs`
- `scripts/qa/production-isolation.mjs`
- `src/app/(public)/not-found.tsx`
- `src/app/error.tsx`
- `src/app/global-error.tsx`
- `src/app/not-found.tsx`
- `src/components/status/StatusPage.tsx`
- `src/components/status/status.module.css`
- `src/data/schemas/income-records.ts`
- `src/data/schemas/record-base.ts`
- `src/engine/contracts/periods.ts`
- `src/engine/loaders/queries.ts`
- `src/engine/loaders/runtime-types.ts`
- `src/product/calculator/evidence/client.ts`
- `src/product/calculator/evidence/projection.ts`
- `src/product/calculator/evidence/server.ts`
- `src/product/calculator/evidence/types.ts`
- `src/product/calculator/runtime.ts`
- `tests/product/error-safety.test.ts`
- `tests/product/evidence-boundary.test.ts`

Modified (22 files):

- `.gitignore`
- `docs/product/milestone-4-architecture.md`
- `e2e/calculator-journey.spec.ts`
- `e2e/milestone-3-closure.spec.ts`
- `e2e/public-homepage.spec.ts`
- `next.config.ts`
- `playwright.config.ts`
- `src/app/calculator/layout.tsx`
- `src/app/dev/calculator-results/page.tsx`
- `src/components/report/SourceExplanation.tsx`
- `src/data/schemas/records.ts`
- `src/engine/calculators/housing.ts`
- `src/engine/calculators/income.ts`
- `src/engine/contracts/income.ts`
- `src/engine/contracts/input.ts`
- `src/engine/contracts/output.ts`
- `src/engine/loaders/index.ts`
- `src/engine/resolution/index.ts`
- `src/features/calculator/journey/JourneyProvider.tsx`
- `src/features/calculator/journey/journey.module.css`
- `src/product/calculator/orchestrator.ts`
- `tests/product/calculator.test.ts`

`next-env.d.ts` generated path churn is restored to HEAD after build. The raw workbook is excluded from these change lists and remains untracked.

## Readiness and next slice

**Slice 4.4: GO / safe to commit the reviewed changes, excluding the raw workbook.** All technical gates for this slice pass. Nothing has been staged or committed.

This is not Milestone 4 closure or production launch approval. Remaining launch sign-off work includes real owner VoiceOver testing, owner Safari/device review, truthful Privacy/Accessibility content and the separately reviewed deployment/domain plan. Existing source reuse/export restrictions are unchanged and must remain qualified; no broader redistribution permission is inferred.

Nonblocking debt for this slice: approved font files/licensing and artwork remain unavailable; public pages still carry the shared Next/React navigation runtime; the calculator retains necessary form/income validation and public provenance; full script/style CSP and HSTS await deployment-specific decisions. There is no unresolved numerical regression, privacy finding, browser defect or dependency vulnerability from this audit.

Recommended Slice 4.5: owner VoiceOver and Safari/device sign-off, truthful Privacy/Accessibility content, approved asset/licence resolution, final SEO/domain/hosting decisions and a reviewed deployment plan with cache/header checks. Full script/style CSP and HSTS should be decided against that deployment. Any evidence refresh or licensed redistribution decision remains a separate audited data/legal scope. Do not add analytics or deploy without explicit scope.
