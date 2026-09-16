# Milestone 4 Slice 4.5 — owner QA, policies and cutover preparation

Prepared 16 September 2026. This is the final development preparation slice, not Milestone 4 closure or deployment approval.

## Starting state

Branch `rebuild/next-production`, HEAD `8da8f0b` (Harden Milestone 4 production runtime). Fetch succeeded after using the permitted network/git escalation; HEAD matched origin (0 ahead, 0 behind). The only initial untracked file was the protected workbook. AGENTS.md, installed Next route/robots/sitemap documentation, architecture, Slice 4.4 audit, public/error routes, footer, config/package scripts and production browser tests were inspected. Legacy main and the recovery tag were inspected with `git show`/`ls-tree`, without checkout or mutation.

No engine, data, generated artifacts, calculator logic or city content changed. No dependencies changed. No stage/commit/push, merge, tag, deployment, provider-setting or domain/DNS change occurred.

## Implemented public content

- `/privacy`: server-rendered current-application notice, browser-memory financial processing, no application persistence or financial API/URL values, ordinary hosting requests/logs, disabled analytics/advertising, external links/evidence, retained legacy storage, public contact limitations and review date.
- `/accessibility`: server-rendered statement covering headings/landmarks/keyboard/focus/forms/disclosures/reflow and actual Chromium/WebKit testing. It explicitly does not claim WCAG conformance or manual VoiceOver certification. Broader real-device and native-zoom testing remain pending.
- Shared PolicyPage uses existing transparency/public styling; no new client component, font, image or visual redesign. Factual titles/descriptions are indexable. Footer contains Privacy/Accessibility and a concise informational-tool disclaimer. No About/Cookies placeholder or speculative contact email was added.
- Contact: legacy policy and current repository metadata support the existing public GitHub issue route. It is linked for non-sensitive questions/reports only, with instructions not to post confidential or financial data. Dedicated private contact/operator details remain a launch sign-off gap; owner was asked but no unconfirmed address was fabricated.

Analytics are not currently enabled. No app-set non-essential cookies were found, so no cookie banner or controls were added. Infrastructure behavior remains separately reviewable. Legacy `main` directly includes AdSense and writes selected preferences/consent to localStorage; this rebuild does neither. Old storage can remain on returning visitors' devices, and the notice/test account for this instead of claiming every browser is empty.

See [privacy implementation notes](privacy-implementation-notes.md) for owner/operator/provider facts required before public cutover. No legal certification or unverified platform retention promise is made.

## Indexing and legacy routes

Public routes remain indexable without guessed canonical tags. **canonical production host requires deployment sign-off**. Historical CNAME `ukmoneyreality.co.uk` is recorded but not automatically adopted for the rebuild.

`SITE_URL` is a server-only explicit HTTPS origin. `/sitemap.xml` has 15 entries when configured: root, calculator entry, city index/eight cities, Methodology, Sources, Privacy and Accessibility. It excludes result state, calculator steps, development and error routes. Missing configuration yields 503/no-store, not fabricated URLs; robots omits Sitemap. That is permitted for unsigned local builds and blocks production launch until configured. Two small dynamic GET handlers avoid freezing host configuration into build output. Robots allows public routes and excludes `/dev/`, `/src/` and `/calculator/results`; it is not a security boundary.

Three fixed 308 proxy mappings implement `/index.html` → `/`, `/privacy.html` → `/privacy`, `/cookies.html` → `/privacy#cookies`. They discard all query parameters; there is no legacy financial-state import. All other legacy paths/assets/fragments are classified in [legacy redirect map](legacy-redirect-map.md). `/about.html` and fragment compatibility require owner decisions, rather than an invented mapping or blanket homepage redirect. No new About page or link was created.

## Deployment and security decisions

Actual Vercel production branch/project/domain settings are unknown; no local vercel.json/project link exists. Legacy README describes GitHub Pages/main, which is historical repository evidence rather than external platform verification. Vercel Next.js is the proposed deployment assumption. Install `npm ci`, build `npm run build`, Next default output, repository root; no secrets required by the core calculator. Node target and full validation are recorded below; installed Next requires >=20.9.0.

Environment audit: framework NODE_ENV gates development fixtures; new optional-local/required-launch SITE_URL supplies indexing; SMOKE_BASE_URL and SMOKE_EXPECT_SITE_URL are test-runner-only; CI retains existing test behavior. No NEXT_PUBLIC variables, runtime API credentials or application secrets are introduced. `.env.example` contains names/comments only. Remote smoke requires both an explicit target and expected canonical host, starts no local server and never deploys.

Security headers remain unchanged from Slice 4.4: nosniff, no-referrer, denied camera/microphone/geolocation, DENY framing and limited base/object/frame CSP. Full script/style/image/connect CSP is deferred to deployment-specific review. HSTS is deployment-dependent; no includeSubDomains/preload was added. Provider headers/cookies/integrations require actual deployed inspection. See [cutover plan](production-cutover.md) for per-header decisions and checks.

## Owner handoff and release procedures

[Owner accessibility QA](owner-accessibility-qa.md) supplies Command-F5 setup, VO modifier/rotor navigation, expected names/state/focus, full flow rows and issue recording. All manual results are NOT TESTED; sign-off is **PENDING OWNER REVIEW**. Device checks include Safari macOS, iPhone Safari if available, Chrome desktop, 390/320 emulation and native 200% zoom. Editorial review covers homepage, eight city summaries, methodology/sources, notices, disclaimer and metadata.

**VoiceOver manual QA requires owner testing.** Automated WebKit is not installed Safari UI or VoiceOver testing.

[Production smoke plan](production-smoke-test.md) is shorter than the full suite and includes new pages, complete/partial results, refresh/restart, source disclosure, city caveats, routing/indexing and privacy. Automation works locally and can later use an explicitly authorised origin. No deployed run occurred in this slice.

[Cutover/rollback procedure](production-cutover.md) records closure/clean-tree/owner QA/build gates, exact deployment and settings backup, automatic-deployment triggers, reviewed history-preserving merge, recommended pre-cutover tag timing, domain/headers/redirect verification and post-release smoke. It distinguishes provider rollback from GitHub Pages recovery, cached permanent redirects/HSTS and the old privacy behavior restored by a legacy rollback. No procedural step was executed.

## Audits and regressions

Placeholder audit: no mounted public route contains coming-soon/preparation/lorem/development-preview copy. Existing unmounted ComingSoonPage and its unused styles remain internal legacy code; no public page imports it. The engine's historical “placeholder” comment is explanatory and untouched. Source TODO/FIXME/HACK/TEMP scan found no actionable launch TODO in mounted product code. Pending owner/deployment items are explicit documentation gates, not hidden code comments.

Internal public links, footer links, all eight cities, methodology/source links and new notices are checked in production automation. External source URLs retain the existing 41 recorded values and syntactic checks; no claim of current live external reachability is made. The public issue tracker is an existing repository URL, not a newly created contact service.

The responsive matrix covers 1440, 1024, 768, 390 and 320px on both notices and production homepage/calculator/results/London/Sources, with existing wider checks retained. DOM checks cover one main/H1, headings/contents links, footer targets and no placeholder noindex. Existing numerical/form/focus/disclosure assertions remain.

Manchester → Leeds remains protected: costs £2,314.67 → £2,163.31 (−£151.36); take-home £3,293.30 → £3,538.12 (+£244.82); buffer £978.63 → £1,374.81 (+£396.18); salary preservation £47,477.35; coverage 8/8. Partial missing costs remain qualified with salary unavailable. Eight cities, Edinburgh rent gap, Greater Glasgow wording, Bristol split water, 32 source entries and 41 URLs are unchanged.

## Validation evidence

| Check | Result |
| --- | --- |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass after final route generation |
| `npm test` | 1,003 passed in 28 files on Node 26.8.1 and again on Node 24.21.0 |
| `npm run build` | Pass on proposed Node 24.21.0 runtime; new policy pages static, robots/sitemap dynamic, exact-path proxy present |
| Chromium full suite | 58 passed, 0 failed, 0 skipped |
| WebKit full suite | 58 passed, 0 failed, 0 skipped |
| Node 24 local production smoke, Chromium | 6 passed, 0 failed, 0 skipped |
| Node 24 local production smoke, WebKit | 6 passed, 0 failed, 0 skipped |
| Configured-origin local indexing smoke | 1 Chromium + 1 WebKit passed using synthetic https://example.test on the local server; no external host contacted |
| `npm run data:verify` | All 32 artifacts, 1,191 observed rows, 80 coverage cells verified |
| Protected SHA-256 comparison | All 32 generated artifacts and workbook unchanged |
| `node scripts/qa/production-isolation.mjs` | 121 public assets/HTML/RSC files pass; dev route 404 |
| `npm audit --json` | 0 vulnerabilities at all severities; no dependency updates |
| `git diff --check` | Pass |

Unit tests add ten focused notice/indexing/redirect checks. Normal browsers add five policy-width cases per browser. Production smoke adds link/index/redirect and legacy-storage cases, extends the responsive matrix/policies and verifies refresh/restart. Existing complete/partial privacy checks remain. Remote smoke is supported but not executed.

A Node 24 build exposed an index.html route-output collision; the exact-path proxy replaces the initial filesystem redirect approach. An interim typecheck saw stale generated route types after that relocation; the rebuilt final types pass. Two initial new assertions were corrected because they matched a negated privacy statement and the XML declaration's question mark rather than the intended claims/URLs. No financial assertion was weakened. Full Chromium/WebKit suites cover the unchanged page implementation; the final production suite additionally covers the proxy and final build.

Bundle hardening remains: total emitted client JS is exactly **1,103,270 bytes**, unchanged from Slice 4.4. Calculator initial referenced JS remains **1,007,741 raw / 280,154 gzip bytes** when measured with the same Node 26 audit tool; public JS remains **579,528 / 178,500**. Cross-Node gzip implementations can differ, so the comparison uses the same tool/runtime. New policy content is server HTML, not a new hydrated data object. No source/workbook/fixture leakage or new financial network/storage was found.

Fresh production contexts remain empty; seeded legacy preferences remain unchanged and unimported. Both types of checks are required at cutover. All source/data/engine diffs are empty. Workbook remains untracked with SHA-256 `63905dd882d36567dbc039be2f822bb0c16a1763d662c38de0525103b85c7fab`.

Privacy at 1024px and Accessibility at 320px were visually inspected from WebKit captures; requested viewport/DOM checks pass on both browsers. Captures are `/tmp/ukmr-4-5-{privacy,accessibility}-{1440,1024,768,390,320}.png`; final production captures/metrics are in ignored `test-results-production/`. They are development/automated evidence, not owner manual sign-off.

**Slice 4.5 is safe to commit as development preparation, excluding the raw workbook. Milestone 4 closure and public launch remain pending owner/deployment decisions below.**


## Remaining launch decisions

No deployment is approved by code/test success. Before Milestone 4 closure: owner VoiceOver/Safari/device/content sign-off; operator/private contact and hosting/privacy facts; confirmed host/SITE_URL/apex-www/indexing plan; actual platform/branch/runtime/integration settings; legacy About/fragment/asset decisions; verified known-good recovery deployment and auto-deploy controls. Full CSP/HSTS decisions belong to that deployment review. Approved fonts/artwork remain nonblocking debt for this preparation slice.

Recommend a separate Milestone 4 closure audit against the reviewed final commit, resolving or explicitly accepting each recorded owner gap and rerunning final acceptance/smoke. Only then request a concrete cutover approval. Do not equate a safe-to-commit development slice with a live-launch GO.

## File inventory

Created (18):

- `.env.example`
- `docs/product/legacy-redirect-map.md`
- `docs/product/milestone-4-slice-5.md`
- `docs/product/owner-accessibility-qa.md`
- `docs/product/privacy-implementation-notes.md`
- `docs/product/production-cutover.md`
- `docs/product/production-smoke-test.md`
- `e2e-production/readiness.spec.ts`
- `e2e/policies.spec.ts`
- `src/app/(public)/accessibility/page.tsx`
- `src/app/(public)/privacy/page.tsx`
- `src/app/robots.txt/route.ts`
- `src/app/sitemap.xml/route.ts`
- `src/components/policies/PolicyPage.tsx`
- `src/product/launch/indexing.ts`
- `src/product/policies/content.ts`
- `src/proxy.ts`
- `tests/product/launch-readiness.test.ts`

Modified (4):

- `docs/product/milestone-4-architecture.md`
- `e2e-production/launch.spec.ts`
- `playwright.production.config.ts`
- `src/components/public/PublicFooter.tsx`

The `/index.html` mapping uses the installed Next `src/proxy.ts` convention: a filesystem route named index.html conflicts with the prerendered homepage output. The proxy has only three matchers and no state, body parsing, logging or financial routing. It constructs fixed target URLs and strips query strings.
