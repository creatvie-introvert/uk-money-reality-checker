# Controlled production cutover — preparation only

**NOT AUTHORISED FOR EXECUTION by this document.** No deployment, merge, production-branch switch, DNS/domain change or tag creation occurred in Slice 4.5. Milestone 4 closure and a separate reviewed cutover instruction are required.

## Confirmed repository facts versus deployment assumptions

| Item | Finding / required decision |
| --- | --- |
| Rebuild branch | `rebuild/next-production`; Slice 4.5 starts at `8da8f0b` |
| Legacy reference | `origin/main` and `legacy-static-v1` at `ede9ffa7f73a52d832c4788eb95055796692d2e8` on inspection |
| Historical host | Legacy README says GitHub Pages from main/root; CNAME records `ukmoneyreality.co.uk` |
| Actual current production | **Owner check**: repository files do not prove live domain, host, DNS, deployed commit or provider settings |
| Proposed rebuild host | Vercel Next.js project, **assumption pending owner confirmation**; no project link/config inspected externally |
| Production branch | **Unknown externally**. Recommend reviewed merge into main and main production deployment after approval; do not assume Vercel currently watches main |
| Install/build/output | `npm ci`, `npm run build`, Next.js framework preset/default `.next`; no static-export mode; core calculator needs no secrets |
| Runtime | Installed Next requires Node >=20.9.0. Local baseline is Node 26.8.1. Proposed Vercel target Node 24.x; validation record in Slice 4.5 audit |
| Root directory | Repository root, subject to confirmation against actual provider project |
| Canonical origin | **canonical production host requires deployment sign-off**. Old CNAME is evidence, not approval of apex/www routing for the rebuild |
| Indexing | Set server-only `SITE_URL` to the approved HTTPS origin. Never infer from Host/forwarded headers or `VERCEL_URL`. Without it, `/sitemap.xml` is 503/no-store and robots has no Sitemap line; that state blocks launch, not local development |
| Metadata | Factual relative page metadata; no guessed canonical or social-image host. Canonical tag/host redirect decisions remain in deployment sign-off |
| Preview access | Provider protection/noindex policy requires review; production robots is not access control. Do not submit a preview sitemap to search engines |

Vercel's [Node version documentation](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) lists 24.x, 22.x and 20.x at review time. Node 26 local success alone would not prove deployment compatibility. Record the actual runtime/build logs; no external setting was changed. Do not deploy this runtime application through legacy static GitHub Pages settings.

## Environment inventory

| Variable | Classification | Exposure/use |
| --- | --- | --- |
| `NODE_ENV` | Framework-required, framework-controlled | Development preview exists only for development; production branch excludes fixtures |
| `SITE_URL` | Optional locally; **required before public launch** | Server-only origin for sitemap and robots discovery. HTTPS, no credentials, port, path, query or fragment. Invalid configured values fail; never put a secret here |
| `SMOKE_BASE_URL` | Optional test-runner only | Explicit approved test origin; suppresses starting a local server. Never guessed; no deployment is performed by tests |
| `SMOKE_EXPECT_SITE_URL` | Required for deployed smoke; optional locally | Expected canonical sitemap host; test-only, not automatically copied into application config |
| `CI` | Test-runner only | Existing Playwright retry/forbidOnly/server-reuse behavior |
| `NEXT_PUBLIC_*`, application credentials | None | No client secrets or runtime API credentials required |

`.env.example` documents names without real values. Provider-injected variables, integrations, logging and secrets are uninspected externally; inventory them in the dashboard without copying secrets into reports. Set SITE_URL in the appropriate deployment scope and rebuild/redeploy after changes. No package engines or external runtime setting was pinned silently.

## Security-header decisions

| Protection | Status | Decision |
| --- | --- | --- |
| X-Content-Type-Options | IMPLEMENTED | `nosniff` |
| Referrer-Policy | IMPLEMENTED | `no-referrer` |
| Permissions-Policy | IMPLEMENTED | camera, microphone, geolocation disabled |
| Framing | IMPLEMENTED | `X-Frame-Options: DENY`; CSP frame-ancestors self-exclusion (`'none'`) |
| CSP base/object/ancestors | IMPLEMENTED | `base-uri 'self'; object-src 'none'; frame-ancestors 'none'` |
| CSP script/style/image/connect policy | DEFERRED / DEPLOYMENT-DEPENDENT | Current partial policy is not a comprehensive XSS guarantee. Review actual Next inline scripts/styles and platform integrations before nonce/hash or source restrictions |
| HSTS | DEPLOYMENT-DEPENDENT | Application does not add it. Inspect any provider-added header and approve only after HTTPS/domain/subdomain/rollback review |

At preview and cutover inspect final merged response headers. For a fuller CSP, inventory script and style sources including Next bootstrap/hydration, image/font needs, same-origin RSC/assets and connect-src behavior. Test form navigation, calculation lazy chunks, details, source links and retry/404 in Chromium/WebKit before enforcing a candidate policy; use a separate reviewed report-only approach if appropriate. A normal external anchor does not require adding its destination to connect-src. Do not add wildcard allowances or unsafe directives merely to silence errors.

HSTS requires working HTTPS for the confirmed domain, understanding every affected subdomain and recording persistent-browser rollback implications. Do not casually enable includeSubDomains or preload. A rollback must continue serving valid HTTPS if browsers have cached HSTS. Provider default HSTS may already exist even though next.config does not add it.

## Pre-cutover gate — owner to complete later

1. Record exact closure candidate commit; ensure tracked tree/staging is clean. Protected workbook may remain untracked locally but must not enter any release/upload. Verify all 32 hashes, workbook hash, dependency audit and production isolation scan.
2. Complete Milestone 4 closure GO, owner [accessibility/device/content sign-off](owner-accessibility-qa.md), privacy operator/contact/provider review and [legacy mapping decisions](legacy-redirect-map.md). Resolve blocking issues; explicitly accept remaining device limitations.
3. Confirm actual platform/project, Node 24 target, root/build/install settings, production branch, canonical origin, apex/www handling, HTTPS and preview protection. Check SITE_URL matches that origin, robots/sitemap work and no unwanted integration/analytics/ad script is enabled.
4. Capture existing provider settings and DNS/domain configuration securely. Record current live deployment ID, exact commit and a usable recovery URL/artifact. Verify `legacy-static-v1` or a newer known-good point really recovers the current service; repository tag alone is not proof.
5. Check automatic deployments from BOTH hosts. A merge into main may trigger legacy GitHub Pages and/or Vercel before the intended cutover. Plan pausing/controlling those triggers as a separately approved action; never discover this during the merge.
6. Run final install/build/tests on the chosen runtime, full browsers and [production smoke checks](production-smoke-test.md) on the exact preview candidate. Confirm no financial request/storage, raw artifacts, fixture chunks or dev routes. Do not assume platform behavior equals localhost.
7. After closure GO and before cutover, recommend creating reviewed tag `pre-cutover-next-v1` at that exact rebuild commit. Confirm it does not already exist; do not move an existing tag. Tag creation/push requires the later instruction, not this slice.

## Merge and cutover sequence — not executed

1. Fetch and compare main/rebuild with the reviewed references. If main changed, inspect every change and resolve conflicts on a review branch/PR; do not overwrite main or blindly choose one side. Rerun affected checks and refresh owner sign-off when behavior/content changes.
2. Open a reviewable PR from rebuild to main. Prefer a normal merge commit preserving both histories; no force push. Ensure the approved auto-deployment strategy is in place before merging. Record the resulting merge commit.
3. Under the separate cutover approval, apply the reviewed production branch/provider settings and deploy the approved merge commit. Set approved SITE_URL and verify the build/runtime/environment. Change domain/DNS only according to the backed-up, reviewed plan if a provider migration actually requires it.
4. Verify the canonical domain, TLS, apex/www behavior, actual deployed commit and headers. Check three fixed legacy redirects including discarded queries and document the unresolved legacy decisions now signed off.
5. Run the short smoke checklist on the canonical host: homepage, complete/partial calculator, result refresh/restart, London/Edinburgh/Glasgow, Methodology, Sources, Privacy, Accessibility, real 404, robots/sitemap, dev/raw path isolation and financial privacy.
6. Retain evidence and timestamp the decision. Watch provider deploy status, available 5xx/error information, failed routes and user-reported problems immediately and again after caches/DNS changes settle. Do not collect financial payloads or introduce new telemetry.

## Rollback — prepare before the change

Triggers: wrong deployed commit/domain, critical route/calculator failure, numeric acceptance change, financial telemetry/persistence, raw/fixture exposure, unusable accessibility regression or security-header breakage. Stop further rollout, record non-sensitive evidence and notify the owner through the agreed process.

- If staying on the same hosting project, use its reviewed known-good deployment recovery mechanism and verify which domain it serves. A legacy static artifact may need the previous framework/build settings; do not assume a Next project can redeploy static main with unchanged settings.
- If migrating from GitHub Pages, restore the recorded previous hosting/domain/DNS and branch configuration as required. Confirm the old service is still available before relying on it; allow for recorded DNS TTL/cache behavior. Do not guess recovery values.
- Restore the exact known-good legacy commit/artifact (`legacy-static-v1` at the recorded hash, or the documented newer recovery point). No force push: provider rollback or a reviewed revert is preferable. Disable unintended auto-redeployment of the failed revision through the approved settings process.
- Verify root, old tool, privacy/cookies, assets, HTTPS and core navigation. Cached 308s can still send visitors to `/privacy`; plan compatibility on the recovery host. Cached HSTS is not undone by reverting the app. Legacy recovery can reintroduce its old advertising/storage behavior and old notices; owner must assess that tradeoff explicitly.
- Record rollback timestamp, deployment/commit, restored settings, checks and follow-up defect. Do not resume cutover until the cause is resolved and GO is re-established.
