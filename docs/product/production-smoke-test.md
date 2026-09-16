# Production smoke test — short owner checklist

Use the exact candidate commit and invented values. This complements the full regression suite. No deployed target was tested in Slice 4.5 and no deployment is authorised here.

1. **Public entry:** load `/`; use navigation/calculator CTA and city index. Open London, Edinburgh and Glasgow; check rent/geography limitations. Open Methodology, Sources (32 entries), Privacy and Accessibility through footer links.
2. **Complete journey:** start fresh, enter a complete test comparison, review/edit and calculate. Check headline direction, cost rows/cards, salary panel, 8/8 coverage and current/destination source disclosures. Use the locked Manchester → Leeds acceptance case for numerical sign-off; see Slice 4.5 audit for all values.
3. **Partial journey:** omit destination energy/transport in an otherwise complete scenario. Check 6/8, qualified known costs/incomplete buffer and unavailable salary. Never silently display missing costs as zero.
4. **State lifecycle:** refresh a populated result and confirm empty-result/Start calculator; repeat a result and use New comparison, confirming inputs clear. Financial values must not appear merely by opening a URL.
5. **Narrow/keyboard:** at 390px and 320px navigate, operate date/select controls and disclosures, inspect focus and no horizontal overflow. Include native 200% zoom and owner Safari/VoiceOver separately.
6. **Routing/indexing:** unknown path and unsupported city are real 404s with recovery. `/dev/calculator-results` and raw/generated artifact paths are 404. `/index.html`, `/privacy.html`, `/cookies.html` have the approved 308 targets with query strings discarded. `/robots.txt` permits public routes and excludes dev; `/sitemap.xml` is 200 XML with exactly 15 approved-origin URLs, no results/steps/dev. An unset-host 503 is expected locally but **fails launch**.
7. **Privacy/security:** use a fresh browser context and DevTools Network/Storage. Only ordinary site GET/static requests; no financial POSTs/URLs, telemetry/ad scripts, app cookies or persistence. Inspect final hosting headers and unexpected third-party requests. Separately check a returning legacy context: old keys may remain but must not be read/imported/updated; do not mistake old browser data for newly saved state.
8. **Record:** URL, commit/deployment, date, browser/device, PASS/ISSUE/NOT TESTED per item, non-sensitive evidence, owner decision. Critical failures trigger the rollback decision in [cutover plan](production-cutover.md).

## Automated local production checks

Run build before smoke and do not run the dev browser suite against the same build output concurrently:

```sh
npm run build
node scripts/qa/production-isolation.mjs
npm run test:e2e -- --config=playwright.production.config.ts --workers=1
```

Without SITE_URL, local smoke checks explicit missing-host behavior. To verify configured indexing locally, supply a clearly synthetic test origin to the local server; `https://example.test` is a test value, never a production recommendation:

```sh
SITE_URL=https://example.test npm run test:e2e -- --config=playwright.production.config.ts --workers=1 --grep='public entry links'
```

The production suite checks core complete/partial journeys, source interaction, refresh/restart, headers, responsive pages, no financial network/storage, link targets, legacy redirects/storage isolation, robots/sitemap and 404/dev/raw isolation. It does not duplicate every numerical or layout permutation from the normal suite.

## Later deployed checks — only against an explicitly authorised URL

Set `SMOKE_BASE_URL` to the exact approved test/deployment origin and `SMOKE_EXPECT_SITE_URL` to the confirmed canonical HTTPS origin. Then run the same production command. The config starts **no local server** when SMOKE_BASE_URL is present. Never guess a domain or use a URL with credentials. Resolve provider preview protection through an approved workflow, not embedded secrets or disabled assertions.

The suite intentionally rejects unexpected third-party scripts/cookies, host mismatch or noindex/route behavior that conflicts with the public release. Investigate platform additions rather than weakening the privacy gates. A deployed run can create ordinary access logs and uses synthetic inputs; it performs no deploy, account mutation or financial API call.

Watch deployment readiness, route failures and available platform error signals after release; do not add invasive logging. Record external source URLs as syntactically checked unless their live reachability was actually tested.
