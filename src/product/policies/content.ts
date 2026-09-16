export const policyReviewDate = "16 September 2026";
export const projectIssuesUrl = "https://github.com/creatvie-introvert/uk-money-reality-checker/issues";
export interface PolicySection { id: string; title: string; paragraphs: readonly string[] }
export const privacySections: readonly PolicySection[] = [
  { id: "calculator", title: "Your calculator data", paragraphs: [
    "Calculator values such as salary, rent and household costs are processed in your browser for the current calculator session. UK Money Reality does not currently send those values to an application API or put them in page URLs.",
    "The application does not save calculator inputs or results in cookies, localStorage, sessionStorage, IndexedDB or an application-managed cache. Refreshing the page clears the current comparison. Starting a new comparison resets its inputs and results. There are no accounts or saved comparisons.",
  ] },
  { id: "requests", title: "Website requests and hosting logs", paragraphs: [
    "Your browser makes ordinary requests for pages, scripts, styles and public evidence. The hosting and network infrastructure receives technical information such as your IP address, requested URL, request time and browser information. Infrastructure providers may keep access, security or error logs.",
    "The calculator does not add your financial entries to those requests. This does not mean that visiting the website produces no technical data. Hosting log access, retention and any infrastructure cookies depend on the deployed service; they are not controlled by the calculator’s in-memory state.",
  ] },
  { id: "cookies", title: "Cookies and browser storage", paragraphs: [
    "The current application does not set cookies or use persistent browser storage. It has no advertising or analytics cookie controls because those features are not enabled. Ordinary browser caching of public files is different from saving calculator values.",
    "An earlier version of this site saved selected preferences and a cookie choice in localStorage. Those entries may still exist if you visited that version on the same website address. This version does not read, import or update them. You can remove old entries using your browser’s site-data settings.",
    "Hosting or security services may behave differently from the application. Their actual behavior must be checked for the deployed website; this notice does not promise that infrastructure never uses cookies.",
  ] },
  { id: "analytics", title: "Analytics and advertising", paragraphs: [
    "Analytics are not currently enabled. This application includes no advertising scripts or session recording. Financial inputs and results are not sent to analytics services.",
    "Any future analytics would require a separate privacy review and an updated notice. Financial inputs and results must remain excluded from that implementation unless the product is explicitly redesigned with appropriate user information and consent.",
  ] },
  { id: "links", title: "External links and public evidence", paragraphs: [
    "Source links open websites operated by other organisations. Following a link sends a request to that website, whose own privacy practices apply. The calculator does not append your salary, household costs or results to source links.",
    "Published source evidence describes observations, reference information and calculation rules. It is separate from the household information you enter. The Sources and Methodology pages explain its use and limitations.",
  ] },
  { id: "contact", title: "Privacy enquiries", paragraphs: [
    "A dedicated private contact address is not currently published. The project repository provides a public route for general questions about this notice. Do not post financial details, identifying information or confidential privacy requests in a public issue.",
    "For a question that needs a private reply, use the public route only to request a private contact method, without including the substance of your request.",
  ] },
  { id: "changes", title: "Changes to this notice", paragraphs: [
    "This notice describes the current application. It should be reviewed when hosting, storage, analytics or other processing changes. The review date above identifies this version of the notice.",
  ] },
];
export const accessibilitySections: readonly PolicySection[] = [
  { id: "using", title: "Using the website", paragraphs: [
    "UK Money Reality aims to make its comparison and source explanations usable with different devices and ways of navigating. Pages use headings, landmarks and named navigation. Skip links move past repeated navigation, and interactive controls have visible keyboard focus.",
    "Calculator fields have labels and supporting instructions. Validation identifies problems and directs focus to the relevant field. Back, Continue and review-edit controls support moving through the comparison. Results identify increases, decreases and missing information in text as well as visual styling.",
  ] },
  { id: "disclosures", title: "Reading sources and results", paragraphs: [
    "Source disclosures can be opened with the keyboard. The public Sources page uses standard expandable details. Result source buttons identify the cost category and scenario, expose their expanded state and keep each explanation with its relevant result.",
    "Missing costs remain visible. An incomplete result is not presented as a complete household budget, and unavailable salary-preservation results are labelled explicitly.",
  ] },
  { id: "testing", title: "Testing completed", paragraphs: [
    "Automated browser checks have run in Chromium and WebKit, a Safari-equivalent browser engine. Checks cover navigation, forms, focus, source disclosures and calculator journeys, including layouts down to 320 CSS pixels wide and viewport reflow equivalent to 200% desktop zoom.",
    "These checks are not a formal accessibility audit. WebKit automation is not the same as testing the installed Safari browser with VoiceOver. No WCAG conformance level or accessibility certification is claimed.",
  ] },
  { id: "limitations", title: "Known testing limitations", paragraphs: [
    "VoiceOver manual QA requires owner testing. Reading order, spoken announcements and the complete experience with assistive technology have not yet received that manual sign-off.",
    "Broader testing on real phones and tablets is incomplete. Native browser zoom and device-specific controls also need owner review. At narrow widths, a long selected option may be shortened visually inside its control; the native option menu retains the full label.",
  ] },
  { id: "report", title: "Report an accessibility problem", paragraphs: [
    "You can report a non-sensitive accessibility problem through the project’s public issue tracker. Include the page address, device, browser, assistive technology, steps taken and what you expected to happen. Use invented example inputs and omit personal or financial information.",
    "A dedicated private accessibility contact is not currently published. If your report needs a private discussion, request a private contact method in a public issue without sharing the confidential details. No response-time guarantee is currently published.",
  ] },
  { id: "review", title: "Statement review", paragraphs: [
    "This statement was prepared from implementation checks and automated browser testing. It will need updating when owner manual testing is completed or when the website changes.",
  ] },
];
