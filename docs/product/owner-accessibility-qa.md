# Owner accessibility, device and content sign-off

**Status: PENDING OWNER REVIEW.** No manual result is inferred from automated Chromium/WebKit checks. Use invented calculator values; never put personal financial information in issue reports. Record the tested commit, URL, date, macOS/iOS, browser and assistive-technology versions.

## Safari + VoiceOver: exact steps

1. Open the reviewed build in Safari. Turn VoiceOver on with **Command-F5** (off uses the same shortcut); alternatively use System Settings → Accessibility → VoiceOver. If a welcome dialog appears, follow its spoken instructions. [Apple: turning VoiceOver on/off](https://support.apple.com/guide/voiceover/turn-voiceover-on-or-off-vo2682/mac).
2. In the instructions below, **VO** means Control-Option using default settings. Move through content with VO-Right/Left; activate a focused control with VO-Space. Use Tab/Shift-Tab for keyboard traversal; Safari may require Option-Tab to include links depending on keyboard preferences.
3. Press **VO-U** for the rotor. Use Left/Right to choose Headings, Links or Landmarks when available, Up/Down to choose an item, and Return to go there; Escape closes the rotor. [Apple: rotor instructions](https://support.apple.com/guide/voiceover/voiceover-rotor-mchlp2719/mac).
4. Follow the rows below. Listen for useful names, roles, values and state changes, not an exact voice transcript. A missing control, trap, unclear error, lost focus or unannounced state change is an ISSUE.
5. Record PASS, ISSUE or NOT TESTED for every row. For issues, record route, precise steps, expected/actual speech or focus, severity and a redacted screenshot if useful. Recheck fixes on the final commit. Turn VoiceOver off with Command-F5 when finished.

| Flow | Action and success criterion | Owner result |
| --- | --- | --- |
| Home landmarks | Rotor finds navigation, main and footer; no duplicated main; heading describes the page | NOT TESTED |
| Home skip/navigation | Activate skip link; reading/focus moves to main. Header links, hero calculator CTA, eight city links and footer are named and operable | NOT TESTED |
| Calculator start | Enter from CTA; hear step heading and current progress. Move setup labels distinguish current/destination | NOT TESTED |
| Form details | Visit household, income, everyday costs, transport and lifestyle. Labels/help are discoverable; selects announce selection; checkbox announces checked state; dates can be entered | NOT TESTED |
| Errors | Continue with required move details missing; hear error context, follow error link and correct the field. Focus lands meaningfully | NOT TESTED |
| Navigation/review | Back/Continue work without traps; review values are associated with labels; Edit returns to the right section and saved edits remain | NOT TESTED |
| Complete result | Use a complete invented comparison. Main heading, money directions and current/destination metrics are understandable. Cost rows/cards retain relationships | NOT TESTED |
| Result sources | Open Rent current/destination disclosure; control name identifies category/side; expanded state changes; source/limitations are read in context; close returns useful focus | NOT TESTED |
| Salary/coverage | Salary panel and 8/8 coverage are discoverable; numbers are qualified by period/scope | NOT TESTED |
| Partial result | Omit destination energy and transport amounts: known subtotal/incomplete buffer and unavailable salary are announced; no missing value becomes zero | NOT TESTED |
| Restart/refresh | Restart clears values; refreshing a result gives a usable empty state with Start calculator | NOT TESTED |
| City pages | London, Edinburgh and Glasgow headings and coverage limitations are read; Edinburgh gap and Greater Glasgow scope remain clear | NOT TESTED |
| Methodology | Contents links, heading hierarchy and explanations are navigable | NOT TESTED |
| Sources | Category headings, native expanded/collapsed state, publication links and limitations are understandable | NOT TESTED |
| Privacy/accessibility | Contents and footer links work; notice/contact limitations and testing limitations can be located | NOT TESTED |

## Device and zoom checklist

For each row check navigation, full/partial flow, native selects/date inputs, review/edit, result disclosures/source links, visible focus, no horizontal page overflow, 200% browser zoom where supported, refresh empty state and restart. Mobile emulation does not substitute for iPhone testing.

| Device/browser | Owner result | Version, findings, evidence |
| --- | --- | --- |
| macOS Safari | NOT TESTED | |
| iPhone Safari (if available) | NOT TESTED | Record unavailability explicitly |
| Chrome desktop | NOT TESTED | |
| Chrome/Chromium mobile emulation at 390px | NOT TESTED | |
| Narrow viewport at 320px | NOT TESTED | |
| Native desktop zoom at 200% | NOT TESTED | |

## Editorial acceptance

Mark each PASS / ISSUE / NOT TESTED: homepage copy; eight city summaries; Methodology; all source scope/limitations; Privacy (including operator/contact and infrastructure detail); Accessibility statement; footer disclaimer; page titles/descriptions. All currently **NOT TESTED by owner**. No About link/page is required merely for navigation completeness.

## Sign-off record

| Required owner review | Status |
| --- | --- |
| Safari desktop | PENDING OWNER REVIEW |
| iPhone Safari, or explicitly accepted availability limitation | PENDING OWNER REVIEW |
| VoiceOver critical flows | PENDING OWNER REVIEW |
| Zoom/reflow | PENDING OWNER REVIEW |
| Critical complete/partial calculator journey | PENDING OWNER REVIEW |
| Editorial/privacy/deployment assumptions | PENDING OWNER REVIEW |

Owner: ______  Commit: ______  Date: ______  Issues/fix verification: ______  Decision: GO / NO-GO.

**VoiceOver manual QA requires owner testing.** Do not replace these pending entries with automated-suite results.
