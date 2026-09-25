# Homepage city photography

Owner-approved on 25 September 2026; source and bytes verified on 25 September 2026. Applies only to the eight homepage cards. This register is separate from financial evidence.

## Approval and verification

The owner approved the seven existing selections and Edinburgh Option 1 from `/Users/leanne/Desktop/ukmr-phase2c-review-2026-09-25`. Option 1 is the first candidate, labelled **A / recommended**: Jim Barton’s **Edinburgh skyline from Calton Hill**, Geograph 7467002. Candidates B and C are rejected and are not included in production. The explicit implementation approval supersedes the contact sheet’s prior pending approval status.

Each input file was checked against the review manifest SHA-1 and decoded dimensions. Three match the Commons original bytes: Birmingham, Manchester and Edinburgh. The other five are verified Commons review derivatives; both their local hashes and their Commons original hashes are recorded below. No substitute or newly downloaded photo is used. Pinned Commons description-page revisions were retrieved through the API before asset creation; Birmingham and Manchester file histories were checked. Edinburgh attribution and licence were also checked against the rendered Commons record, which draws from structured data.

## Processing and delivery

Sharp 0.35.4 / libwebp 1.6.0: auto-orient, resize to maximum width 1200px with no enlargement, WebP quality 88 / effort 6. Full compositions are retained; no crop or colour treatment is baked into the files. Default Sharp output strips EXIF metadata, so provenance is preserved here and in the typed register. Original review files are unchanged.

Next.js Image uses local paths, fill, lazy loading and the default quality 75. Responsive sizes account for both card width and the source width needed to cover the card height; this prevents panoramas receiving undersized derivatives. No remote image configuration or external image dependency is needed.

CSS applies object-fit: cover, the reviewed object-position, saturation 0.85 and the approved navy gradient. Card dimensions and breakpoints are unchanged. Hover/focus zoom is 1.06 only for fine pointers with hover support and no reduced-motion preference. Reduced motion and touch disable both transition and transform.

Contrast refinement: at 361–700px, the navy gradient reaches its middle opacity at 55% rather than 70% of card height. Wrapped subtitles raise names into brighter image areas; the earlier stop improves white-text contrast without changing focal points or layout. Desktop and the one-column 320px fallback retain the reviewed gradient.

Inputs and 1200px outputs support the displayed cards at 2× density, including the approximately 461px-wide tablet cards. Some small source images cannot supply genuine 3× detail: upscaling cannot restore detail. Known crop trade-offs approved in the contact sheet are retained, especially outer skyline details, Bristol’s far bridge tower and Glasgow’s right-hand buildings.

## Licence treatment

Visible native photo credits give each image title, creator, source and versioned licence link, plus actual display/optimisation modifications. CC BY and CC BY-SA credits must travel with reuse. UKMR’s adaptations of ShareAlike photographs are offered under the same selected version as the image; this applies to the photographic adaptations, not an assertion about the whole application. Liverpool uses the offered CC BY-SA 3.0 option, not GFDL. Glasgow uses CC0 1.0; its provenance credit is voluntary. No endorsement is implied.

Birmingham inconsistency: the explicit licence section and Flickr review state CC BY 2.0, but structured data also lists CC BY-SA 2.0. The selected record uses the explicit CC BY 2.0 grant. The inconsistency is retained rather than silently treating the structured data as a replacement licence.

Manchester prior edit: the approved 2023-10-02 revision was uploaded by Chocolateediter with comment “Looked a bit dull”. Retain this edit notice and the original ChrisClarke88 attribution in visible credits. No unsupported claim is made about the exact editing operation.

## Approved assets

| City | Creator | Selected licence | Local asset | Dimensions | Bytes | Focal point |
| --- | --- | --- | --- | --- | ---: | --- |
| London | BeŻet | CC BY-SA 4.0 | `public/images/cities/london.webp` | 960×720 | 150,404 | 50% 38% |
| Birmingham | newkemall | CC BY 2.0 | `public/images/cities/birmingham.webp` | 1200×850 | 236,170 | 50% 35% |
| Manchester | ChrisClarke88 | CC BY-SA 4.0 | `public/images/cities/manchester.webp` | 1080×579 | 137,416 | 50% 50% |
| Leeds | Leedsfan2 | CC BY 4.0 | `public/images/cities/leeds.webp` | 960×475 | 82,898 | 50% 50% |
| Liverpool | SbravoMX | CC BY-SA 3.0 | `public/images/cities/liverpool.webp` | 960×720 | 126,720 | 60% 40% |
| Bristol | Lacu Schienred | CC BY-SA 4.0 | `public/images/cities/bristol.webp` | 1200×675 | 228,174 | 32% 45% |
| Edinburgh | Jim Barton | CC BY-SA 2.0 | `public/images/cities/edinburgh.webp` | 1200×817 | 223,464 | 50% 45% |
| Glasgow | Wiki.cullin | CC0 1.0 Universal | `public/images/cities/glasgow.webp` | 1200×689 | 165,384 | 32% 38% |

### London

- Subject: City of London skyline viewed from Tower Bridge.
- Original file: `London skyline, view from Tower Bridge.jpg`.
- [Commons source](https://commons.wikimedia.org/wiki/File:London_skyline,_view_from_Tower_Bridge.jpg); [pinned description revision 1113742644](https://commons.wikimedia.org/w/index.php?oldid=1113742644).
- Selected file revision: `2021-09-13T19:48:04Z`; original dimensions 1267×950; original SHA-1 `2da851427e7fa6b29465bc528c3664bbdba71905`.
- Creator: BeŻet — https://commons.wikimedia.org/wiki/User:Be%C5%BBet
- Licence: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0). UKMR adaptations remain under CC BY-SA 4.0.
- Attribution: London skyline, view from Tower Bridge by BeŻet — CC BY-SA 4.0.
- Earlier modifications: No specific prior modification disclosed in the inspected record; this is not a claim that no processing ever occurred.
- Reviewed input: `images/110020690.jpg`, 960×720, SHA-1 `f251bdc1e9c52137d4270218a3ae53624a167b83`.
- Local derivative: `public/images/cities/london.webp`, 960×720, 150,404 bytes, SHA-256 `a18c6ce93c7e99139b8549f1f4274a54c745db64116e86312b05b423c551bef1`.
- Display: Full composition retained in WebP; CSS object-fit: cover with the reviewed focal point. Retain City of London towers; trim some foreground pedestrians. Object position `50% 38%`. Optimised as WebP; cropped for display with a navy gradient and reduced saturation.
- Verified and owner-approved: 2026-09-25.

### Birmingham

- Subject: Birmingham skyline towards the Rotunda.
- Original file: `Birmingham UK skyline.jpg`.
- [Commons source](https://commons.wikimedia.org/wiki/File:Birmingham_UK_skyline.jpg); [pinned description revision 1142944342](https://commons.wikimedia.org/w/index.php?oldid=1142944342).
- Selected file revision: `2022-04-21T13:21:57Z`; original dimensions 3788×2685; original SHA-1 `aa4f6731bdfe0389c5179aa928df599e2db284f9`.
- Creator: newkemall — https://www.flickr.com/photos/159522146@N06/
- Licence: [CC BY 2.0](https://creativecommons.org/licenses/by/2.0). Licence section and reviewed Flickr licence specify CC BY 2.0. Structured data additionally lists CC BY-SA 2.0. Retain this inconsistency; use the explicit file licence, not the structured-data-only assertion.
- Attribution: Birmingham UK skyline by newkemall — CC BY 2.0.
- Earlier modifications: Source EXIF records Adobe Photoshop processing; the precise earlier edits are not documented.
- Reviewed input: `images/117081827.jpg`, 3788×2685, SHA-1 `aa4f6731bdfe0389c5179aa928df599e2db284f9`.
- Local derivative: `public/images/cities/birmingham.webp`, 1200×850, 236,170 bytes, SHA-256 `16acfc4999da967457ff876c9d2632762552b263090c7a1558d31a6b0d09dc9c`.
- Display: Full composition retained in WebP; CSS object-fit: cover with the reviewed focal point. Retain Rotunda above the text. Object position `50% 35%`. Optimised as WebP; cropped for display with a navy gradient and reduced saturation.
- Verified and owner-approved: 2026-09-25.
- Original provider record: https://web.archive.org/web/20220421141246/https://www.flickr.com/photos/159522146@N06/39815164905. Commons Flickr review by Leoboudv, 24 October 2022.

### Manchester

- Subject: Manchester and Salford skyline.
- Original file: `Manchester & Salford Skyline 2020.jpg`.
- [Commons source](https://commons.wikimedia.org/wiki/File:Manchester_%26_Salford_Skyline_2020.jpg); [pinned description revision 807620052](https://commons.wikimedia.org/w/index.php?oldid=807620052).
- Selected file revision: `2023-10-02T19:17:22Z`; original dimensions 1080×579; original SHA-1 `7b67e3dceccde95eaf11d51089b2adec21044a3d`.
- Creator: ChrisClarke88 — https://commons.wikimedia.org/wiki/User:ChrisClarke88
- Licence: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0). UKMR adaptations remain under CC BY-SA 4.0.
- Attribution: Manchester & Salford Skyline 2020 by ChrisClarke88 — CC BY-SA 4.0.
- Earlier modifications: Edited by Chocolateediter on 2 October 2023 (upload comment: “Looked a bit dull”). Original photograph by ChrisClarke88; the selected bytes are the edited revision.
- Reviewed input: `images/98970234.jpg`, 1080×579, SHA-1 `7b67e3dceccde95eaf11d51089b2adec21044a3d`.
- Local derivative: `public/images/cities/manchester.webp`, 1080×579, 137,416 bytes, SHA-256 `d42a20cef2e016818feb685dd1ea405a4d13a1e3b5b94328f9c6d552d2b4ddf6`.
- Display: Full composition retained in WebP; CSS object-fit: cover with the reviewed focal point. Wide skyline: outer towers cropped, particularly on mobile. Object position `50% 50%`. Optimised as WebP; cropped for display with a navy gradient and reduced saturation.
- Verified and owner-approved: 2026-09-25.

### Leeds

- Subject: Leeds skyline viewed from the railway station.
- Original file: `Leeds-city-skyline.png`.
- [Commons source](https://commons.wikimedia.org/wiki/File:Leeds-city-skyline.png); [pinned description revision 1180175069](https://commons.wikimedia.org/w/index.php?oldid=1180175069).
- Selected file revision: `2024-01-02T13:05:11Z`; original dimensions 1694×838; original SHA-1 `f22863070e3aec24733c957f11e5f00618924fec`.
- Creator: Leedsfan2 (source supplies a name, no creator-profile link).
- Licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0). Retain attribution, source and licence links, and modification notice.
- Attribution: Leeds-city-skyline by Leedsfan2 — CC BY 4.0.
- Earlier modifications: No specific prior modification disclosed in the inspected record; this is not a claim that no processing ever occurred.
- Reviewed input: `images/143426918.png`, 960×475, SHA-1 `bd9475d0cf791c104124c2ebfbb08accf99debc8`.
- Local derivative: `public/images/cities/leeds.webp`, 960×475, 82,898 bytes, SHA-256 `f6ffd45f29537e726d869d91ef16fe3b837b860ff77ba5f2e9516eade52e98d6`.
- Display: Full composition retained in WebP; CSS object-fit: cover with the reviewed focal point. Panorama: outer station roof and far-right tower cropped on mobile. Object position `50% 50%`. Optimised as WebP; cropped for display with a navy gradient and reduced saturation.
- Verified and owner-approved: 2026-09-25.

### Liverpool

- Subject: Liverpool waterfront and Three Graces with foreground anchor.
- Original file: `Three graces.jpg`.
- [Commons source](https://commons.wikimedia.org/wiki/File:Three_graces.jpg); [pinned description revision 1248699625](https://commons.wikimedia.org/w/index.php?oldid=1248699625).
- Selected file revision: `2007-10-15T11:45:48Z`; original dimensions 1280×960; original SHA-1 `a9e119a89e2b686d1a7c84d4ef37f71ca08e46cb`.
- Creator: SbravoMX — https://commons.wikimedia.org/wiki/User:SbravoMX
- Licence: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0). CC BY-SA 3.0 selected from the source’s multiple licence options; UKMR adaptations remain under CC BY-SA 3.0.
- Attribution: Three graces by SbravoMX — CC BY-SA 3.0.
- Earlier modifications: No specific prior modification disclosed in the inspected record; this is not a claim that no processing ever occurred.
- Reviewed input: `images/2919349.jpg`, 960×720, SHA-1 `6643e53c0694b7e9d460fd19abb18018750a6f89`.
- Local derivative: `public/images/cities/liverpool.webp`, 960×720, 126,720 bytes, SHA-256 `19be75850584a08bfe1a3bb5ef2f3c5810fc20282f9300f70bd7b80cae90f846`.
- Display: Full composition retained in WebP; CSS object-fit: cover with the reviewed focal point. Retain waterfront landmarks; foreground anchor remains prominent. Object position `60% 40%`. Optimised as WebP; cropped for display with a navy gradient and reduced saturation.
- Verified and owner-approved: 2026-09-25.

### Bristol

- Subject: Clifton Suspension Bridge, Bristol.
- Original file: `Clifton Suspension Bridge Bristol.jpg`.
- [Commons source](https://commons.wikimedia.org/wiki/File:Clifton_Suspension_Bridge_Bristol.jpg); [pinned description revision 1043981083](https://commons.wikimedia.org/w/index.php?oldid=1043981083).
- Selected file revision: `2019-12-06T20:46:53Z`; original dimensions 4032×2268; original SHA-1 `8707af9d698c20997a2c104cef89065dd450e837`.
- Creator: Lacu Schienred — https://commons.wikimedia.org/wiki/User:Lacu_Schienred
- Licence: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0). UKMR adaptations remain under CC BY-SA 4.0.
- Attribution: Clifton Suspension Bridge Bristol by Lacu Schienred — CC BY-SA 4.0.
- Earlier modifications: No specific prior modification disclosed in the inspected record; this is not a claim that no processing ever occurred.
- Reviewed input: `images/84667896.jpg`, 1920×1080, SHA-1 `f0a8592cbb5bd1f09a922e338131ce5b06e467c0`.
- Local derivative: `public/images/cities/bristol.webp`, 1200×675, 228,174 bytes, SHA-256 `ca038d99974ce0c04cec5078bdf76721b9399000cf86d43005abc491a1f4c61f`.
- Display: Full composition retained in WebP; CSS object-fit: cover with the reviewed focal point. Retain near tower and part of span; far tower clipped in narrow cards. Object position `32% 45%`. Optimised as WebP; cropped for display with a navy gradient and reduced saturation.
- Verified and owner-approved: 2026-09-25.

### Edinburgh

- Subject: Edinburgh castle skyline viewed from Calton Hill.
- Original file: `Edinburgh skyline from Calton Hill - geograph.org.uk - 7467002.jpg`.
- [Commons source](https://commons.wikimedia.org/wiki/File:Edinburgh_skyline_from_Calton_Hill_-_geograph.org.uk_-_7467002.jpg); [pinned description revision 1223860832](https://commons.wikimedia.org/w/index.php?oldid=1223860832).
- Selected file revision: `2025-03-18T01:12:08Z`; original dimensions 1600×1089; original SHA-1 `84cd7b44be9700a76cb6bd48a8e3633a448f859b`.
- Creator: Jim Barton — https://www.geograph.org.uk/profile/26362
- Licence: [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0). UKMR adaptations remain under CC BY-SA 2.0.
- Attribution: Edinburgh skyline from Calton Hill by Jim Barton — CC BY-SA 2.0.
- Earlier modifications: No specific prior modification disclosed in the inspected record; this is not a claim that no processing ever occurred.
- Reviewed input: `images/162308885.jpg`, 1600×1089, SHA-1 `84cd7b44be9700a76cb6bd48a8e3633a448f859b`.
- Local derivative: `public/images/cities/edinburgh.webp`, 1200×817, 223,464 bytes, SHA-256 `fca1f7d4007f8b34a9735c296b0aca63299806f406df9d6bd372fc78943a5a77`.
- Display: Full composition retained in WebP; CSS object-fit: cover with the reviewed focal point. Option 1 (first candidate, labelled A / recommended) from 25 September 2026 review; retain castle and spires above text. Object position `50% 45%`. Optimised as WebP; cropped for display with a navy gradient and reduced saturation.
- Verified and owner-approved: 2026-09-25.
- Original provider: https://www.geograph.org.uk/photo/7467002. Option 1 from the 25 September 2026 review; replaces the rejected 720px-wide Edinburgh Skyline.jpg.

### Glasgow

- Subject: River Clyde, dockyard cranes and Glasgow waterfront skyline.
- Original file: `River Clyde pontoon pier with dockyard cranes and modern Glasgow skyline.jpg`.
- [Commons source](https://commons.wikimedia.org/wiki/File:River_Clyde_pontoon_pier_with_dockyard_cranes_and_modern_Glasgow_skyline.jpg); [pinned description revision 1278865082](https://commons.wikimedia.org/w/index.php?oldid=1278865082).
- Selected file revision: `2026-09-20T15:15:48Z`; original dimensions 2371×1361; original SHA-1 `76c3b8ae6714d5a0cc94fceb099a570665ce2f57`.
- Creator: Wiki.cullin — https://commons.wikimedia.org/wiki/User:Wiki.cullin
- Licence: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/deed.en). CC0 public-domain dedication; provenance credit is retained voluntarily, not a condition of reuse.
- Attribution: River Clyde pontoon pier with dockyard cranes and modern Glasgow skyline by Wiki.cullin — CC0 1.0 Universal.
- Earlier modifications: No specific prior modification disclosed in the inspected record; this is not a claim that no processing ever occurred.
- Reviewed input: `images/199866675.jpg`, 1920×1102, SHA-1 `3cef69e38d1dc16da2edcce08b7947e6318036f4`.
- Local derivative: `public/images/cities/glasgow.webp`, 1200×689, 165,384 bytes, SHA-256 `c858ebd88e368df9f4f16ac140bc99e92e33b8854043d06fe5acefd90df9713d`.
- Display: Full composition retained in WebP; CSS object-fit: cover with the reviewed focal point. Retain cranes and river; some right-hand skyline lost on mobile. Object position `32% 38%`. Optimised as WebP; cropped for display with a navy gradient and reduced saturation.
- Verified and owner-approved: 2026-09-25.

## Implementation verification — 25 September 2026

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 31 files, 1,012 tests passed.
- `npm run build`: passed (Next.js 16.3.4).
- Production-mode Playwright: `homepage-v4`, `public-homepage` and `site-chrome`: 38 Chromium and 38 WebKit tests passed, including the final mobile contrast correction.
- Calculator regression suites `calculator-focus`, `calculator-journey` and `calculator-mobile-city`: 34 tests passed across Chromium and WebKit. The subsequent correction is scoped to homepage city-card overlays.
- `git diff --check`: passed.
- Visually inspected production city cards at 1440, 1280, 1024, 768, 390 and 320px; credits also inspected at mobile width. No broken images or horizontal overflow; no external image requests. The reviewed edge-crop compromises remain as documented above.
- Screenshot sampling of image/overlay pixels behind solid white name/subtitle pixels found a minimum contrast ratio of 6.13:1 across those six widths. This is a sampled rendering check, not a claim of exhaustive accessibility certification.
- Source review hashes remain unchanged. The protected untracked workbook was not modified or staged. A build-generated `next-env.d.ts` path change was restored to baseline.
- Owner visual review is complete: the implemented grid, Edinburgh Option 1, crops and presentation are approved for the Phase 2C commit.
- Remaining manual check: physical iPhone Safari inspection before production readiness. Automated WebKit does not substitute for a physical-device check.
