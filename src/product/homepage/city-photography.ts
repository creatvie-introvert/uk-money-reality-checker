import type { CitySlug } from "@/product/cities/registry";

/** Photography provenance only; never used as financial evidence. */
export interface CityPhotograph {
  citySlug: CitySlug;
  subject: string;
  imageTitle: string;
  originalFilename: string;
  sourcePageUrl: string;
  sourcePageRevision: number;
  fileRevision: string;
  originalSha1: string;
  creator: string;
  creatorUrl: string | null;
  licence: string;
  licenceUrl: string;
  attributionText: string;
  previousModifications: readonly string[];
  localFilename: `/images/cities/${CitySlug}.webp`;
  sourceWidth: number;
  sourceHeight: number;
  reviewFilename: string;
  reviewWidth: number;
  reviewHeight: number;
  reviewSha1: string;
  localWidth: number;
  localHeight: number;
  localBytes: number;
  localSha256: string;
  cropNotes: string;
  objectPosition: string;
  modificationNote: string;
  verificationDate: string;
  verificationStatus: "verified";
  approvalDate: string;
  approvalStatus: "owner-approved";
  licenceNotes: string;
}

// Sources and processing: docs/product/city-photography.md.
// Owner approval supersedes the review manifest's earlier pending approval status.
export const cityPhotography = {
  "london": {
    "citySlug": "london",
    "subject": "City of London skyline viewed from Tower Bridge",
    "imageTitle": "London skyline, view from Tower Bridge",
    "originalFilename": "London skyline, view from Tower Bridge.jpg",
    "sourcePageUrl": "https://commons.wikimedia.org/wiki/File:London_skyline,_view_from_Tower_Bridge.jpg",
    "sourcePageRevision": 1113742644,
    "fileRevision": "2021-09-13T19:48:04Z",
    "originalSha1": "2da851427e7fa6b29465bc528c3664bbdba71905",
    "creator": "BeŻet",
    "creatorUrl": "https://commons.wikimedia.org/wiki/User:Be%C5%BBet",
    "licence": "CC BY-SA 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "attributionText": "London skyline, view from Tower Bridge by BeŻet — CC BY-SA 4.0.",
    "previousModifications": [],
    "localFilename": "/images/cities/london.webp",
    "sourceWidth": 1267,
    "sourceHeight": 950,
    "reviewFilename": "images/110020690.jpg",
    "reviewWidth": 960,
    "reviewHeight": 720,
    "reviewSha1": "f251bdc1e9c52137d4270218a3ae53624a167b83",
    "localWidth": 960,
    "localHeight": 720,
    "localBytes": 150404,
    "localSha256": "a18c6ce93c7e99139b8549f1f4274a54c745db64116e86312b05b423c551bef1",
    "cropNotes": "Full composition retained in WebP; CSS object-fit: cover with the reviewed focal point. Retain City of London towers; trim some foreground pedestrians.",
    "objectPosition": "50% 38%",
    "modificationNote": "Optimised as WebP; cropped for display with a navy gradient and reduced saturation.",
    "verificationDate": "2026-09-25",
    "verificationStatus": "verified",
    "approvalDate": "2026-09-25",
    "approvalStatus": "owner-approved",
    "licenceNotes": "UKMR adaptations remain under CC BY-SA 4.0."
  },
  "birmingham": {
    "citySlug": "birmingham",
    "subject": "Birmingham skyline towards the Rotunda",
    "imageTitle": "Birmingham UK skyline",
    "originalFilename": "Birmingham UK skyline.jpg",
    "sourcePageUrl": "https://commons.wikimedia.org/wiki/File:Birmingham_UK_skyline.jpg",
    "sourcePageRevision": 1142944342,
    "fileRevision": "2022-04-21T13:21:57Z",
    "originalSha1": "aa4f6731bdfe0389c5179aa928df599e2db284f9",
    "creator": "newkemall",
    "creatorUrl": "https://www.flickr.com/photos/159522146@N06/",
    "licence": "CC BY 2.0",
    "licenceUrl": "https://creativecommons.org/licenses/by/2.0",
    "attributionText": "Birmingham UK skyline by newkemall — CC BY 2.0.",
    "previousModifications": [
      "Source EXIF records Adobe Photoshop processing; the precise earlier edits are not documented."
    ],
    "localFilename": "/images/cities/birmingham.webp",
    "sourceWidth": 3788,
    "sourceHeight": 2685,
    "reviewFilename": "images/117081827.jpg",
    "reviewWidth": 3788,
    "reviewHeight": 2685,
    "reviewSha1": "aa4f6731bdfe0389c5179aa928df599e2db284f9",
    "localWidth": 1200,
    "localHeight": 850,
    "localBytes": 236170,
    "localSha256": "16acfc4999da967457ff876c9d2632762552b263090c7a1558d31a6b0d09dc9c",
    "cropNotes": "Full composition retained in WebP; CSS object-fit: cover with the reviewed focal point. Retain Rotunda above the text.",
    "objectPosition": "50% 35%",
    "modificationNote": "Optimised as WebP; cropped for display with a navy gradient and reduced saturation.",
    "verificationDate": "2026-09-25",
    "verificationStatus": "verified",
    "approvalDate": "2026-09-25",
    "approvalStatus": "owner-approved",
    "licenceNotes": "Licence section and reviewed Flickr licence specify CC BY 2.0. Structured data additionally lists CC BY-SA 2.0. Retain this inconsistency; use the explicit file licence, not the structured-data-only assertion."
  },
  "manchester": {
    "citySlug": "manchester",
    "subject": "Manchester and Salford skyline",
    "imageTitle": "Manchester & Salford Skyline 2020",
    "originalFilename": "Manchester & Salford Skyline 2020.jpg",
    "sourcePageUrl": "https://commons.wikimedia.org/wiki/File:Manchester_%26_Salford_Skyline_2020.jpg",
    "sourcePageRevision": 807620052,
    "fileRevision": "2023-10-02T19:17:22Z",
    "originalSha1": "7b67e3dceccde95eaf11d51089b2adec21044a3d",
    "creator": "ChrisClarke88",
    "creatorUrl": "https://commons.wikimedia.org/wiki/User:ChrisClarke88",
    "licence": "CC BY-SA 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "attributionText": "Manchester & Salford Skyline 2020 by ChrisClarke88 — CC BY-SA 4.0.",
    "previousModifications": [
      "Edited by Chocolateediter on 2 October 2023 (upload comment: “Looked a bit dull”). Original photograph by ChrisClarke88; the selected bytes are the edited revision."
    ],
    "localFilename": "/images/cities/manchester.webp",
    "sourceWidth": 1080,
    "sourceHeight": 579,
    "reviewFilename": "images/98970234.jpg",
    "reviewWidth": 1080,
    "reviewHeight": 579,
    "reviewSha1": "7b67e3dceccde95eaf11d51089b2adec21044a3d",
    "localWidth": 1080,
    "localHeight": 579,
    "localBytes": 137416,
    "localSha256": "d42a20cef2e016818feb685dd1ea405a4d13a1e3b5b94328f9c6d552d2b4ddf6",
    "cropNotes": "Full composition retained in WebP; CSS object-fit: cover with the reviewed focal point. Wide skyline: outer towers cropped, particularly on mobile.",
    "objectPosition": "50% 50%",
    "modificationNote": "Optimised as WebP; cropped for display with a navy gradient and reduced saturation.",
    "verificationDate": "2026-09-25",
    "verificationStatus": "verified",
    "approvalDate": "2026-09-25",
    "approvalStatus": "owner-approved",
    "licenceNotes": "UKMR adaptations remain under CC BY-SA 4.0."
  },
  "leeds": {
    "citySlug": "leeds",
    "subject": "Leeds skyline viewed from the railway station",
    "imageTitle": "Leeds-city-skyline",
    "originalFilename": "Leeds-city-skyline.png",
    "sourcePageUrl": "https://commons.wikimedia.org/wiki/File:Leeds-city-skyline.png",
    "sourcePageRevision": 1180175069,
    "fileRevision": "2024-01-02T13:05:11Z",
    "originalSha1": "f22863070e3aec24733c957f11e5f00618924fec",
    "creator": "Leedsfan2",
    "creatorUrl": null,
    "licence": "CC BY 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by/4.0",
    "attributionText": "Leeds-city-skyline by Leedsfan2 — CC BY 4.0.",
    "previousModifications": [],
    "localFilename": "/images/cities/leeds.webp",
    "sourceWidth": 1694,
    "sourceHeight": 838,
    "reviewFilename": "images/143426918.png",
    "reviewWidth": 960,
    "reviewHeight": 475,
    "reviewSha1": "bd9475d0cf791c104124c2ebfbb08accf99debc8",
    "localWidth": 960,
    "localHeight": 475,
    "localBytes": 82898,
    "localSha256": "f6ffd45f29537e726d869d91ef16fe3b837b860ff77ba5f2e9516eade52e98d6",
    "cropNotes": "Full composition retained in WebP; CSS object-fit: cover with the reviewed focal point. Panorama: outer station roof and far-right tower cropped on mobile.",
    "objectPosition": "50% 50%",
    "modificationNote": "Optimised as WebP; cropped for display with a navy gradient and reduced saturation.",
    "verificationDate": "2026-09-25",
    "verificationStatus": "verified",
    "approvalDate": "2026-09-25",
    "approvalStatus": "owner-approved",
    "licenceNotes": "Retain attribution, source and licence links, and modification notice."
  },
  "liverpool": {
    "citySlug": "liverpool",
    "subject": "Liverpool waterfront and Three Graces with foreground anchor",
    "imageTitle": "Three graces",
    "originalFilename": "Three graces.jpg",
    "sourcePageUrl": "https://commons.wikimedia.org/wiki/File:Three_graces.jpg",
    "sourcePageRevision": 1248699625,
    "fileRevision": "2007-10-15T11:45:48Z",
    "originalSha1": "a9e119a89e2b686d1a7c84d4ef37f71ca08e46cb",
    "creator": "SbravoMX",
    "creatorUrl": "https://commons.wikimedia.org/wiki/User:SbravoMX",
    "licence": "CC BY-SA 3.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "attributionText": "Three graces by SbravoMX — CC BY-SA 3.0.",
    "previousModifications": [],
    "localFilename": "/images/cities/liverpool.webp",
    "sourceWidth": 1280,
    "sourceHeight": 960,
    "reviewFilename": "images/2919349.jpg",
    "reviewWidth": 960,
    "reviewHeight": 720,
    "reviewSha1": "6643e53c0694b7e9d460fd19abb18018750a6f89",
    "localWidth": 960,
    "localHeight": 720,
    "localBytes": 126720,
    "localSha256": "19be75850584a08bfe1a3bb5ef2f3c5810fc20282f9300f70bd7b80cae90f846",
    "cropNotes": "Full composition retained in WebP; CSS object-fit: cover with the reviewed focal point. Retain waterfront landmarks; foreground anchor remains prominent.",
    "objectPosition": "60% 40%",
    "modificationNote": "Optimised as WebP; cropped for display with a navy gradient and reduced saturation.",
    "verificationDate": "2026-09-25",
    "verificationStatus": "verified",
    "approvalDate": "2026-09-25",
    "approvalStatus": "owner-approved",
    "licenceNotes": "CC BY-SA 3.0 selected from the source’s multiple licence options; UKMR adaptations remain under CC BY-SA 3.0."
  },
  "bristol": {
    "citySlug": "bristol",
    "subject": "Clifton Suspension Bridge, Bristol",
    "imageTitle": "Clifton Suspension Bridge Bristol",
    "originalFilename": "Clifton Suspension Bridge Bristol.jpg",
    "sourcePageUrl": "https://commons.wikimedia.org/wiki/File:Clifton_Suspension_Bridge_Bristol.jpg",
    "sourcePageRevision": 1043981083,
    "fileRevision": "2019-12-06T20:46:53Z",
    "originalSha1": "8707af9d698c20997a2c104cef89065dd450e837",
    "creator": "Lacu Schienred",
    "creatorUrl": "https://commons.wikimedia.org/wiki/User:Lacu_Schienred",
    "licence": "CC BY-SA 4.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "attributionText": "Clifton Suspension Bridge Bristol by Lacu Schienred — CC BY-SA 4.0.",
    "previousModifications": [],
    "localFilename": "/images/cities/bristol.webp",
    "sourceWidth": 4032,
    "sourceHeight": 2268,
    "reviewFilename": "images/84667896.jpg",
    "reviewWidth": 1920,
    "reviewHeight": 1080,
    "reviewSha1": "f0a8592cbb5bd1f09a922e338131ce5b06e467c0",
    "localWidth": 1200,
    "localHeight": 675,
    "localBytes": 228174,
    "localSha256": "ca038d99974ce0c04cec5078bdf76721b9399000cf86d43005abc491a1f4c61f",
    "cropNotes": "Full composition retained in WebP; CSS object-fit: cover with the reviewed focal point. Retain near tower and part of span; far tower clipped in narrow cards.",
    "objectPosition": "32% 45%",
    "modificationNote": "Optimised as WebP; cropped for display with a navy gradient and reduced saturation.",
    "verificationDate": "2026-09-25",
    "verificationStatus": "verified",
    "approvalDate": "2026-09-25",
    "approvalStatus": "owner-approved",
    "licenceNotes": "UKMR adaptations remain under CC BY-SA 4.0."
  },
  "edinburgh": {
    "citySlug": "edinburgh",
    "subject": "Edinburgh castle skyline viewed from Calton Hill",
    "imageTitle": "Edinburgh skyline from Calton Hill",
    "originalFilename": "Edinburgh skyline from Calton Hill - geograph.org.uk - 7467002.jpg",
    "sourcePageUrl": "https://commons.wikimedia.org/wiki/File:Edinburgh_skyline_from_Calton_Hill_-_geograph.org.uk_-_7467002.jpg",
    "sourcePageRevision": 1223860832,
    "fileRevision": "2025-03-18T01:12:08Z",
    "originalSha1": "84cd7b44be9700a76cb6bd48a8e3633a448f859b",
    "creator": "Jim Barton",
    "creatorUrl": "https://www.geograph.org.uk/profile/26362",
    "licence": "CC BY-SA 2.0",
    "licenceUrl": "https://creativecommons.org/licenses/by-sa/2.0",
    "attributionText": "Edinburgh skyline from Calton Hill by Jim Barton — CC BY-SA 2.0.",
    "previousModifications": [],
    "localFilename": "/images/cities/edinburgh.webp",
    "sourceWidth": 1600,
    "sourceHeight": 1089,
    "reviewFilename": "images/162308885.jpg",
    "reviewWidth": 1600,
    "reviewHeight": 1089,
    "reviewSha1": "84cd7b44be9700a76cb6bd48a8e3633a448f859b",
    "localWidth": 1200,
    "localHeight": 817,
    "localBytes": 223464,
    "localSha256": "fca1f7d4007f8b34a9735c296b0aca63299806f406df9d6bd372fc78943a5a77",
    "cropNotes": "Full composition retained in WebP; CSS object-fit: cover with the reviewed focal point. Option 1 (first candidate, labelled A / recommended) from 25 September 2026 review; retain castle and spires above text.",
    "objectPosition": "50% 45%",
    "modificationNote": "Optimised as WebP; cropped for display with a navy gradient and reduced saturation.",
    "verificationDate": "2026-09-25",
    "verificationStatus": "verified",
    "approvalDate": "2026-09-25",
    "approvalStatus": "owner-approved",
    "licenceNotes": "UKMR adaptations remain under CC BY-SA 2.0."
  },
  "glasgow": {
    "citySlug": "glasgow",
    "subject": "River Clyde, dockyard cranes and Glasgow waterfront skyline",
    "imageTitle": "River Clyde pontoon pier with dockyard cranes and modern Glasgow skyline",
    "originalFilename": "River Clyde pontoon pier with dockyard cranes and modern Glasgow skyline.jpg",
    "sourcePageUrl": "https://commons.wikimedia.org/wiki/File:River_Clyde_pontoon_pier_with_dockyard_cranes_and_modern_Glasgow_skyline.jpg",
    "sourcePageRevision": 1278865082,
    "fileRevision": "2026-09-20T15:15:48Z",
    "originalSha1": "76c3b8ae6714d5a0cc94fceb099a570665ce2f57",
    "creator": "Wiki.cullin",
    "creatorUrl": "https://commons.wikimedia.org/wiki/User:Wiki.cullin",
    "licence": "CC0 1.0 Universal",
    "licenceUrl": "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "attributionText": "River Clyde pontoon pier with dockyard cranes and modern Glasgow skyline by Wiki.cullin — CC0 1.0 Universal.",
    "previousModifications": [],
    "localFilename": "/images/cities/glasgow.webp",
    "sourceWidth": 2371,
    "sourceHeight": 1361,
    "reviewFilename": "images/199866675.jpg",
    "reviewWidth": 1920,
    "reviewHeight": 1102,
    "reviewSha1": "3cef69e38d1dc16da2edcce08b7947e6318036f4",
    "localWidth": 1200,
    "localHeight": 689,
    "localBytes": 165384,
    "localSha256": "c858ebd88e368df9f4f16ac140bc99e92e33b8854043d06fe5acefd90df9713d",
    "cropNotes": "Full composition retained in WebP; CSS object-fit: cover with the reviewed focal point. Retain cranes and river; some right-hand skyline lost on mobile.",
    "objectPosition": "32% 38%",
    "modificationNote": "Optimised as WebP; cropped for display with a navy gradient and reduced saturation.",
    "verificationDate": "2026-09-25",
    "verificationStatus": "verified",
    "approvalDate": "2026-09-25",
    "approvalStatus": "owner-approved",
    "licenceNotes": "CC0 public-domain dedication; provenance credit is retained voluntarily, not a condition of reuse."
  }
} as const satisfies Record<CitySlug, CityPhotograph>;

/** Include the width needed to cover card height, so panoramas stay sharp at 2×. */
export function cityPhotographSizes(photo: CityPhotograph): string {
  const desktopCoverWidth = Math.ceil(206 * photo.localWidth / photo.localHeight);
  const mobileCoverWidth = Math.ceil(153 * photo.localWidth / photo.localHeight);
  return [
    `(max-width: 360px) max(calc(100vw - 36px), ${mobileCoverWidth}px)`,
    `(max-width: 546px) max(calc((100vw - 47px) / 2), ${mobileCoverWidth}px)`,
    `(max-width: 700px) ${Math.max(249.5, mobileCoverWidth)}px`,
    `(max-width: 1000px) max(calc((100vw - 79px) / 2), ${desktopCoverWidth}px)`,
    `(max-width: 1244px) max(calc((100vw - 109px) / 4), ${desktopCoverWidth}px)`,
    `${Math.max(283.75, desktopCoverWidth)}px`,
  ].join(", ");
}
