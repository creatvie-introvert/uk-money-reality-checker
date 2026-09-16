# Milestone 4 closure and production cutover audit

Audit date: 16 September 2026. Candidate: `ca99b30` on `rebuild/next-production`, plus the documentation/test changes in this audit. No application, financial logic, evidence, dependency or deployment configuration changes.

## Decisions

- **Development closure: GO.**
- **Owner launch gates: PENDING.** No manual sign-off has been inferred.
- **Production cutover: NO-GO pending essential owner/deployment gates.** Technical completion does not authorise launch.

Nothing staged, committed, pushed, merged, tagged or deployed. No platform branch, DNS/domain, HSTS or analytics change.

## Repository and review

Starting tracked tree clean; only the protected raw workbook untracked. Fetch succeeded after sandbox escalation. HEAD equals origin/rebuild/next-production (0 ahead/behind). Local main, origin/main and legacy-static-v1 all equal `ede9ffa7f73a52d832c4788eb95055796692d2e8`. Main is the merge base: 0 main-only commits, 31 rebuild-only commits. No legacy drift or conflicting main changes exist at this snapshot. A history-preserving merge is possible without content conflict; no merge was performed. Re-fetch before cutover because this is time-bound evidence.

Reviewed AGENTS.md; installed Next server/client and Vitest/Playwright guidance; Milestone 4 architecture and all five slice audits; legacy redirect map; owner accessibility QA; privacy notes; cutover and smoke procedures; Milestone 3 closure and calculator journey; source/provenance implementation and data boundary, rent/water/transport records. Checked these against mounted routes, projections, provider/reducer, metadata, error components, headers, env usage and regression tests.

## Scope completed and architecture

Public shell/homepage/navigation/footer; eight-city index/detail pages; Methodology/Sources/Privacy/Accessibility; robots/sitemap; factual metadata; error/404 recovery; production evidence projection and dev isolation; privacy/security/browser checks; smoke automation; legacy inventory and cutover/rollback handoff are present.

Informational content is server-rendered. PublicHeader is a small pathname-aware client component. Public register data is not hydrated into a client registry. Calculator server layout passes an allowlisted static evidence DTO; personal form/results remain in client reducer memory. Shared calculation runtime loads lazily; public pages do not call it. The existing pure engine and financial contracts are unchanged.

## Public routes and SEO/indexing

Exactly 15 public entry URLs:

`/`, `/calculator`, `/cities`, `/cities/london`, `/cities/birmingham`, `/cities/manchester`, `/cities/leeds`, `/cities/liverpool`, `/cities/bristol`, `/cities/edinburgh`, `/cities/glasgow`, `/methodology`, `/sources`, `/privacy`, `/accessibility`.

All have factual titles/descriptions, with no rankings, invented canonical origin or fake evidence-update date. Policy review date identifies the notice version, not evidence freshness. Calculator steps/results exist separately; results require memory state. Unknown routes/unsupported cities return real 404s with working recovery. Root/public not-found and root/global error fallbacks exist; error-object sentinel tests protect against stack/path/financial output. Runtime crash injection was not added to production.

Configured test SITE_URL yields exactly those 15 sitemap URLs; excludes steps/results/dev/error/internal paths. Missing SITE_URL intentionally yields 503/no-store and robots omits Sitemap. Production must configure the owner-approved HTTPS origin. Robots allows `/`, excludes `/dev/`, `/src/`, `/calculator/results`; it is not security. No Host-header-derived canonical or invented domain. Historical CNAME is not rebuild approval.

## Public content and evidence transparency

Homepage uses factual comparison scope, calculator CTA, eight neutral city links, transparency principles and source/method links. Its illustration has no sample financial outputs. City index treats eight cities equally with no ranking, affordability score or unsupported totals.

| City | Verified retained boundary |
| --- | --- |
| London | Regional E12000007 rent; no generic council charge or borough guess; Thames Water context |
| Birmingham | E08000025 rent; Severn Trent; applicability remains unresolved, no household bill inferred |
| Manchester | E08000003 authority/geography; United Utilities |
| Leeds | E08000035 geography; Yorkshire Water |
| Liverpool | E08000012 geography; United Utilities |
| Bristol | E06000023 geography; Bristol Water clean supply / Wessex wastewater split |
| Edinburgh | Exact rent gap, no substitute; Scottish council/band/water context |
| Glasgow | S33000009 Greater Glasgow rental market, explicitly not Glasgow City; Scottish council/water context |

Methodology states take-home minus included costs equals monthly buffer; eight categories, partials, precedence/baseline provenance, four classifications, category periods/geography, exact arithmetic/display rounding, salary preservation, explicit tax jurisdiction and exclusions. It explicitly disclaims full disposable income, confidence/affordability scores and salary recommendations.

Sources has **8 groups, 32 publication entries, 42 distinct recorded source URLs**. Earlier slice reports incorrectly said 41. Closure tests exposed the counting error: exact set equality to all active records and unchanged protected hashes establish that this is a documentation correction, not an evidence addition. All classifications/use labels, periods, geographies, limitations and citations remain. Blocked/development evidence is rejected by existing mutation tests; public projections contain no workbook internals, QA rows, local paths or DEV_ONLY transport guidance. Source URLs were checked for syntax and exact recorded fidelity, not live external availability. Existing reuse/freshness limitations remain; no new redistribution right is asserted.

Placeholder search found only unmounted ComingSoonPage/unused CSS and the optional development-preview fallback in ResultsPage. ProductionResults always supplies onEdit, so that fallback is not mounted in the production journey. Public browser/output checks contain no coming-soon, preparation, lorem, prototype/test fixture or hardcoded acceptance outputs. Educational zero/partial examples are qualified methodology, not fabricated user results.

## Privacy

Policy matches implementation: browser-memory calculation; no app persistence, financial URL parameters, application submission API, analytics/ad script or financial logging. Ordinary infrastructure requests/logs are cautiously described, including unverified provider cookies. External links and retained legacy storage are disclosed. Fresh production contexts and seeded returning contexts are tested separately. Public GitHub issues are an existing, non-sensitive reporting channel only.

**OWNER FACT REQUIRED, blocking public cutover:** operator identity, monitored private privacy/accessibility contact, actual hosting/log purposes/access/retention and other applicable notice facts. No address/operator is invented; this audit is not legal certification. Resolve the existing privacy implementation checklist against actual operations before launch.

## Accessibility and owner review

Chromium/WebKit automation covers labels, headings/landmarks, focus/errors, navigation/review, source disclosures, reflow and complete/partial state lifecycle. WebKit automation is not Safari certification. Public statement accurately records limits and no WCAG certification.

Owner checklist remains NOT TESTED/PENDING throughout. **VoiceOver manual QA requires owner testing.** Required checks: home landmarks/skip/navigation; calculator labels, controls and announced state; first-invalid/error correction; Back/Continue/review/Edit; complete money relationships; current/destination source expanded state and focus; salary/coverage; partial missing costs and unavailable salary; restart/refresh; city caveats; Methodology contents; Sources disclosure; policy navigation/contact limits. Record commit, URL, OS/browser/VoiceOver versions, date and issues/retests.

Device checks still required: macOS Safari, iPhone Safari or explicitly accepted unavailability, Chrome desktop, 390/320 narrow review, native 200% zoom, native date/select controls, disclosures, focus, refresh/restart. Owner content acceptance still required for homepage, all eight city summaries, Methodology, Sources, Privacy, Accessibility, footer disclaimer and metadata. Recommend treating critical VoiceOver/device review as a launch gate; it does not prevent technical development closure.

## Runtime/bundle and leakage

Final build measurements and isolation results are recorded below. Comparison uses the same Node 26 compression tool as Slice 4.4/4.5; this is asset accounting, not field performance or a Lighthouse score. Public evidence/provenance is intentionally visible. Schema property names alone are not raw extraction metadata; required council displayedAnnualGbp remains an exact financial input. No raw workbook route or direct internal source-register download exists.

## Calculator regressions

| Measure | Current | Destination | Change |
| --- | ---: | ---: | ---: |
| Costs/month | £2,314.67 | £2,163.31 | −£151.36 |
| Take-home/month | £3,293.30 | £3,538.12 | +£244.82 |
| Buffer/month | £978.63 | £1,374.81 | +£396.18 |
| Coverage | 8/8 | 8/8 | — |

Salary preservation £47,477.35/year. Existing locked acceptance tests and browser journeys rerun; no formula tests duplicated.

Partial destination energy/transport remains 6/8, known costs £1,898.31 and incomplete buffer £1,639.81; no numeric complete cost/buffer deltas, salary unavailable. Override-heavy case retains Your amount, baseline provenance and source immutability; destination net override disables solver. Explicit £0 resolves separately from blank. Edinburgh rent remains unresolved without entered rent; override resolves rent only. London council remains unresolved without authority/amount; no borough or scalar inferred.

Production complete/partial journeys assert same-origin GET/HEAD only, null request bodies, no financial query state, no analytics requests, empty app-controlled cookies/localStorage/sessionStorage/IndexedDB/Cache Storage. Refresh/restart clear memory. Seeded legacy preferences are unchanged and not imported. Ordinary browser HTTP asset cache is distinct from application persistence.

## Security

Exact application headers: `X-Content-Type-Options: nosniff`; `Referrer-Policy: no-referrer`; `Permissions-Policy: camera=(), microphone=(), geolocation=()`; `X-Frame-Options: DENY`; CSP `base-uri 'self'; object-src 'none'; frame-ancestors 'none'`. Powered-by and browser source maps disabled.

**CSP decision:** limited policy acceptable for initial launch of this reviewed, no-third-party-script application, subject to final deployed inspection. It does not constrain scripts/styles/connect destinations comprehensively. Full CSP is nonblocking post-launch hardening requiring separate deployment-specific design/testing; no nonce architecture added.

**HSTS decision:** remains off in app. Domain/HTTPS/subdomain/provider-header review pending. Absence alone need not block launch if HTTPS enforcement is verified and the decision documented; currently those hosting facts are unknown. Do not enable includeSubDomains/preload. Dependency audit result below is time-bound, not a permanent guarantee.

## Legacy redirect status

| Mapping/item | Closure classification | Launch significance |
| --- | --- | --- |
| `/` | READY | New homepage |
| `/index.html` → `/`; `/privacy.html` → `/privacy`; `/cookies.html` → `/privacy#cookies` | READY technically; owner mapping acceptance pending | Three fixed GET/HEAD 308s; queries discarded, no loop/missing target; valid new routes untouched |
| `/about.html` | OWNER DECISION REQUIRED | Material inbound content risk; blocks cutover until mapping/removal accepted |
| Old root/index fragments including income-selector/method | OWNER DECISION REQUIRED | Material calculator/method bookmarks; server never receives fragments; accept behavior or scope compatibility |
| Extensionless/case/trailing aliases | OWNER DECISION REQUIRED | Unknown inbound significance; inspect historical settings/logs and record acceptance |
| Favicons, touch/Android icons, manifest | OWNER DECISION REQUIRED | Usually lower severity identity/install continuity; confirm usage and explicit treatment |
| Referenced but absent og-image.png | OWNER DECISION REQUIRED | Lower severity sharing image; no invented replacement |
| Legacy CSS/JS/source artwork, standalone 404, README/CNAME application paths | INTENTIONALLY REMOVED | No legacy persistence/advertising restoration; native 404 replaces old error page |

No blanket redirect or financial-state migration. Queries arriving at a host may already be logged; query stripping does not undo that. Fragment inheritance and cached permanent redirects remain rollback considerations.

## Deployment readiness, cutover and rollback

Platform/project is unconfirmed. Historical README says GitHub Pages/main; no local Vercel project/config proves current dashboard state. Production branch, live commit/deployment and canonical host remain unknown. Do not deploy Next runtime through old static Pages configuration.

Environment: NODE_ENV framework-controlled; SITE_URL server-only, optional local/required launch; SMOKE_BASE_URL explicitly authorised test target; SMOKE_EXPECT_SITE_URL required for remote smoke; CI test control. No NEXT_PUBLIC variables or core calculator secrets. No remote smoke target supplied, so only local production is tested.

Cutover plan includes closure/owner gates, exact build candidate, current settings/DNS backups, env/host/HTTPS/preview controls, automatic deployment triggers on both providers, reviewed normal merge, deployment/domain verification, redirects and smoke. Post-cutover includes public routes, fresh/returning privacy, indexing, dev/raw isolation and non-financial operational checks. Rollback includes known-good deployment/branch/settings, legacy build compatibility, DNS/cache delays, cached 308/HSTS and restored legacy advertising/storage implications.

Recovery action before cutover: record and verify the **actual current live** deployment ID, commit, artifact/recovery URL and provider/DNS settings. If newer than or different from legacy-static-v1, capture that newer known-good recovery reference; the historical tag alone is insufficient. No tag created.

Recommend `pre-cutover-next-v1` only after the closure commit is reviewed and pushed, immediately before the approved production merge/cutover. Confirm name unused; never move an existing tag. Prefer reviewable non-force PR merge preserving history. Main currently has no drift; re-fetch and review/resolve any later drift on a review branch, rerun affected validation, then refresh sign-off. Control auto-deployment before merging.

## Unresolved owner gates and launch blockers

1. VoiceOver, Safari/device/native zoom and content sign-off, with explicit acceptance of any unavailable device.
2. Operator identity, monitored private contacts and deployment-specific privacy facts; update notices accordingly.
3. Confirm domain/canonical HTTPS origin, apex/www treatment and SITE_URL; live robots/sitemap must pass.
4. Confirm platform/project, production branch, deployed commit, Node/build/root/env settings, preview protection and no injected analytics/integrations.
5. Resolve material About/fragment/alias decisions; record icon/manifest/social-image treatment and mapping acceptance.
6. Verify HTTPS/provider headers; record HSTS decision and inspect current limited CSP on the real host.
7. Verify actual current-production recovery point, settings/DNS backup, auto-deploy controls and owner-approved cutover/rollback plan.

These are production launch blockers/owner facts, not undiscovered financial implementation defects. No owner facts in this list have been established by the supplied conversation or sign-off document.

## Nonblocking debt

Full CSP, approved font/artwork assets, unused legacy components/styles, future evidence refresh/reuse review within the existing restricted scope, and performance optimisation beyond the retained hardening baseline. No new fare picker, budget model, analytics, legal certification or evidence expansion is implied.

## Validation and files

Final results are recorded below. Initial new test failures exposed the genuine URL-count documentation error and an overly literal heading assertion that ignored existing id attributes; the heading check now preserves semantic h3 matching. No financial assertion was weakened.

Created: this report; `tests/product/milestone-4-acceptance.test.ts` (five integrated acceptance tests). No redundant optional browser spec added. Extended existing production route matrix with Edinburgh and exact CSP assertion, retaining six tests per browser.

Modified documentation: architecture, Slices 4.3/4.4/4.5 (42-URL correction and closure distinction), legacy redirect map (owner timing), production cutover (explicit closure and release decisions). Protected workbook is excluded from every commit recommendation.

| Final check | Result |
| --- | --- |
| Lint / typecheck / whitespace | PASS, including typecheck after restoring generated next-env path churn |
| Unit suite | 1,008 passed, 29 files; 1,003 baseline + five closure cases; no failures/skips |
| Full Chromium | 58 passed, no failures/skips |
| Full WebKit automation | 58 passed, no failures/skips |
| Production build | PASS on Node 24.21.0 |
| Local production smoke, missing SITE_URL | 6 Chromium + 6 WebKit passed; expected local sitemap 503 |
| Configured local indexing | 1 Chromium + 1 WebKit PASS; synthetic https://example.test, local server only; sitemap 200 with 15 URLs and robots discovery |
| Data verify | 32 deterministic artifacts, 1,191 observed rows, 80 coverage cells PASS |
| SHA-256 protection | All 32 artifacts + workbook match protected baseline |
| Production isolation | PASS across 121 browser assets/HTML/RSC files; dev route 404 |
| Visible output scan | 19 prerendered HTML files pass placeholder/test-output scan |
| Dependency audit | 0 info/low/moderate/high/critical; 501 total dependencies, 23 production; no remediation needed |
| Bundle | Calculator initial JS 1,007,741 raw / 280,154 gzip bytes; total emitted client JS 1,103,270 bytes; unchanged |
| Public JS | 579,528 raw / 178,500 gzip bytes; unchanged |
| Internal links | Production public entry/header/footer/city/transparency/policy links pass; calculator and source interactions covered by browser suites |
| Main drift | None: 0 main-only / 31 rebuild-only commits; merge base is current main |

Responsive automation covers 1440, 1024, 768, 390 and 320px for homepage, city index, London, Edinburgh, Methodology, Sources, Privacy, Accessibility, calculator and populated complete/partial results. Additional existing 1280/720 checks retained. No page-level horizontal overflow. Edinburgh 320px production capture visually inspected; this does not replace owner device QA.

Logs: `/tmp/ukmr-m4-{unit,browser,build,production,indexing,lint,types,data}.log`, audit/bundle JSON under `/tmp/ukmr-m4-{audit,bundle}.json`. Browser captures remain in ignored test-results-production and existing /tmp captures; not release assets. Unit run used Node 26.8.1; production build and smoke used Node 24.21.0. No remote production run. Workbook SHA-256 remains `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`, untracked and untouched.

**Closure files are safe to commit after review, excluding the protected workbook. Development closure GO; owner launch gates PENDING; production cutover NO-GO.**
