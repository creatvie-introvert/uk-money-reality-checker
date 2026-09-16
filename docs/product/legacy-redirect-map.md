# Legacy URL inventory and redirect decisions

Inspected `origin/main` after fetch, commit `ede9ffa7f73a52d832c4788eb95055796692d2e8`, also pointed to by `legacy-static-v1`. This is a repository inventory, not a claim that every URL is currently served or indexed by the live host. Legacy README identifies GitHub Pages; CNAME and canonical tags name `ukmoneyreality.co.uk`. New hosting, apex/www routing and canonical host require owner deployment sign-off.

| Legacy path | New target | Category / status | Reason |
| --- | --- | --- | --- |
| `/` | `/` | A — KEEP | New public homepage provides the calculator entry |
| `/index.html` | `/` | B — 308 IMPLEMENTED | Same homepage intent |
| `/privacy.html` | `/privacy` | B — 308 IMPLEMENTED | Replaces the old storage/advertising notice with the current application notice |
| `/cookies.html` | `/privacy#cookies` | B — 308 IMPLEMENTED | Current cookie/storage explanation is a substantive section; no separate cookie controls exist |
| `/about.html` | Undecided | D — OWNER REVIEW | Legacy mixes purpose, old calculations, author and disclaimer. No exact new About route; do not silently redirect to Methodology/home |
| `/404.html` | Native not-found handling | C — REMOVED | Returns a real 404 and recovery links rather than a successful standalone error page |
| `/assets/css/styles.css` | None | C — REMOVED | Legacy CSS is not part of the Next build |
| `/assets/js/main.js` | None | C — REMOVED | Must not restore old persistence/advertising logic |
| `/assets/img/brand/favicon-source.jpg` | None | C — REMOVED | Legacy source artwork not copied to production |
| `/favicon.ico`, `/favicon-16x16.png`, `/favicon-32x32.png` | Undecided | D — OWNER ASSET REVIEW | Original identity/assets are not assumed approved for rebuild reuse |
| `/apple-touch-icon.png`, `/android-chrome-192x192.png`, `/android-chrome-512x512.png`, `/site.webmanifest` | Undecided | D — OWNER ASSET REVIEW | No new installable-app/icon contract has been introduced |
| `/og-image.png` | Undecided | D — MISSING LEGACY REFERENCE | Referenced by legacy social metadata but absent from the inspected tree; do not invent a replacement |
| `/README.md`, `/CNAME` | None | C — NOT APPLICATION ROUTES | Repository/legacy host configuration, not new public content |
| Extensionless `/about`, `/cookies`, `/index`, case/trailing-slash aliases | Undecided | D — UNKNOWN | No corresponding source routes; verify historic host behavior/access logs before inventing aliases |

## Fragments and queries

The legacy index exposes `#top`, `#income-selector`, `#method`, `#disclaimer` and several result/control IDs. Other pages link to `index.html#income-selector` and `index.html#method`. Fragments do not reach the server, so a path redirect cannot distinguish them. The recommended future link targets are `/calculator` and `/methodology`; old root-fragment bookmarks land on the new homepage and may not scroll to an equivalent section. Owner must accept this or explicitly request an anchor compatibility strategy. No client fragment migration was introduced.

The legacy JS does not parse URL/search parameters or encode financial state in links. It stores `selectedIncomeRange`, `selectedRegion`, `selectedHousehold` and `cookieConsent` in localStorage. Its HTML directly loads an AdSense script even though the JS also contains a commented consent-loader stub. None of that logic/script is copied into the rebuild.

Three exact GET/HEAD proxy mappings return fixed 308 Location values and **discard all query parameters**. This avoids Next config redirects' automatic query forwarding. No dynamic destination, blanket homepage redirect or financial import is used. Browser handling may retain an old fragment where the target has none; do not claim fragment sanitisation. Permanent redirects can be cached: confirm all three in preview before cutover, and account for cached redirects during rollback. Queries already included in an incoming request can still reach host logs; the application never generates financial query strings.

Legacy storage is not read, imported, updated or silently deleted. A returning visitor can retain old keys/cookies on the same origin; fresh-context emptiness is not a promise that previously saved browser data disappears. The privacy notice explains clearing site data. Automated production coverage seeds legacy keys and confirms they remain unused and unchanged.

Owner decision before closure: approve the three mappings; decide `/about.html`, fragment compatibility and old icon/manifest treatment; confirm actual production aliases. Do not turn unknown entries into redirects without evidence.

The `/index.html` mapping uses the installed Next `src/proxy.ts` convention: a filesystem route named index.html conflicts with the prerendered homepage output. The proxy has only three matchers and no state, body parsing, logging or financial routing. It constructs fixed target URLs and strips query strings.
