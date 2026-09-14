import ew from "../../controlled/energy/need-ew-2024.json";
import scotland from "../../controlled/energy/need-scotland-2024.json";
import price0 from "../../controlled/energy/ofgem-YS_arnkBg-2026-q3.json";
import price1 from "../../controlled/energy/ofgem-Zvawaw6Ne-2026-q3.json";
import price2 from "../../controlled/energy/ofgem-NCvaUoTBE-2026-q3.json";
import price3 from "../../controlled/energy/ofgem-rtmtZo3eD-2026-q3.json";
import price4 from "../../controlled/energy/ofgem-PycvOxwAP-2026-q3.json";
import price5 from "../../controlled/energy/ofgem-FuJ6m75Bz-2026-q3.json";
import price6 from "../../controlled/energy/ofgem-BaxoQZl5b-2026-q3.json";
import price7 from "../../controlled/energy/ofgem-aWhUPruYc-2026-q3.json";
import price8 from "../../controlled/energy/ofgem-xbjzMWceX-2026-q3.json";

export const needExtracts = [ew, scotland];
export const priceExtracts = [price0, price1, price2, price3, price4, price5, price6, price7, price8];
export const needVocabulary = {
  "ew": {
    "C": [
      "East Midlands",
      "East of England",
      "London",
      "North East",
      "North West",
      "South East",
      "South West",
      "Wales",
      "West Midlands",
      "Yorkshire and The Humber"
    ],
    "D": [
      "Bungalow",
      "Converted flat",
      "Detached",
      "End terrace",
      "Mid terrace",
      "Purpose built flat",
      "Semi detached"
    ],
    "E": [
      "1919 - 1944",
      "1945 - 1964",
      "1965 - 1982",
      "1983 - 1992",
      "1993 - 1999",
      "2000 - 2011",
      "2012 onwards",
      "Pre 1919"
    ],
    "F": [
      "1 bedroom",
      "2 bedrooms",
      "3 bedrooms",
      "4 bedrooms",
      "5 or more"
    ],
    "G": [
      "No",
      "Yes"
    ],
    "H": [
      "E7",
      "Standard"
    ]
  },
  "scotland": {
    "B": [
      "Detached",
      "Flat",
      "Semi detached",
      "Terraced",
      "Unknown"
    ],
    "C": [
      "1871 - 1919",
      "1920 - 1945",
      "1946 - 1954",
      "1955 - 1979",
      "1980 - 1999",
      "2000 - 2009",
      "2010 onwards",
      "Unknown",
      "Up to 1870"
    ],
    "D": [
      "1 bedroom",
      "2 bedrooms",
      "3 bedrooms",
      "4 bedrooms",
      "5 or more",
      "Unknown"
    ],
    "E": [
      "No",
      "Yes"
    ],
    "F": [
      "E7",
      "Standard"
    ]
  }
} as const;
