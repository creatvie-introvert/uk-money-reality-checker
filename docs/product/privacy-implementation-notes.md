# Privacy implementation and deployment decisions

The new `/privacy` describes the rebuild, not the legacy site. Source audit: no app analytics/ad SDK, financial API, console payload logging, cookie write, local/session storage adapter, IndexedDB or application cache. Calculator state remains in JourneyProvider memory. HTTP requests for static evidence/routes remain necessary. Existing public repository contact was documented by legacy policy pages and package metadata; a dedicated private contact is not configured or invented.

Decision: **analytics and advertising remain disabled**. No application non-essential cookies were found, so no cookie banner/control or `/cookies` page is added. Legacy `/cookies.html` points to the substantive Privacy cookies section. Platform security/logging/cookies are separately subject to deployed-host inspection. No conclusion about all hosting cookies is inferred from localhost. No future analytics is authorised.

Returning visitors may still have legacy localStorage (`selectedIncomeRange`, `selectedRegion`, `selectedHousehold`, `cookieConsent`) or provider cookies. The new app neither reads nor deletes them. A seeded browser test protects this boundary. Do not claim storage is empty on every returning visitor's device. Clearing old site data is a user/browser action, not an automatic migration.

## Owner decisions required before public cutover

- Confirm operator identity and an approved, monitored private contact for privacy/accessibility requests. The public GitHub issue tracker is suitable only for non-sensitive reports or requesting a private route; do not solicit financial/private details there.
- Confirm actual hosting/provider and subprocessors, technical log categories/purposes, access, retention, relevant lawful basis, international processing and applicable rights/contact/complaint information. Update the notice with facts supported by that deployment. Do not invent retention periods or legal grounds.
- Verify platform analytics, speed insights, advertising, integrations, preview toolbar and injected scripts are not enabled in production contrary to this notice. Inspect fresh and returning browser contexts.
- Review any hosting cookies and their purpose before deciding whether controls are required. Do not reuse the legacy advertising consent flag as new consent.

The implemented notice is factual application documentation; the missing operator/private-contact and deployment details remain explicit launch-review gaps. This slice does not claim a complete statutory/privacy certification. The [ICO's privacy-information checklist](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/) supports checking identity/contact, purpose/lawful basis, recipients and retention rather than asserting blanket non-collection. Verify current requirements against the chosen operation.

Changes to processing require a separate review, accurate notices and any appropriate controls. Financial inputs/results remain excluded unless a separately authorised redesign establishes the necessary information and consent.
