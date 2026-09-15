/** Independently worked exact annual-comparison examples, not HMRC payroll outputs.
 * Source/method: docs/engine/income-tax-ni.md#qa-and-independent-cross-checks.
 * Numeric expectations deliberately do not call engine code or re-import its tables.
 */
export const incomeVectors = [
  { salary: "0", jurisdiction: "rUK", tax: "0", ni: "0", net: "0" },
  { salary: "1", jurisdiction: "rUK", tax: "0", ni: "0", net: "1" },
  { salary: "30000", jurisdiction: "rUK", tax: "3486", ni: "1394.4", net: "25119.6" },
  { salary: "30000", jurisdiction: "Scotland", tax: "3451.07", ni: "1394.4", net: "25154.53" },
  { salary: "50000", jurisdiction: "rUK", tax: "7486", ni: "2994.4", net: "39519.6" },
  { salary: "50000", jurisdiction: "Scotland", tax: "8982.05", ni: "2994.4", net: "38023.55" },
  { salary: "100000", jurisdiction: "rUK", tax: "27432", ni: "4010.6", net: "68557.4" },
  { salary: "100000", jurisdiction: "Scotland", tax: "30732.05", ni: "4010.6", net: "65257.35" },
  { salary: "110000", jurisdiction: "rUK", tax: "33432", ni: "4210.6", net: "72357.4" },
  { salary: "110000", jurisdiction: "Scotland", tax: "37482.05", ni: "4210.6", net: "68307.35" },
  { salary: "125140", jurisdiction: "rUK", tax: "42516", ni: "4513.4", net: "78110.6" },
  { salary: "125140", jurisdiction: "Scotland", tax: "47701.55", ni: "4513.4", net: "72925.05" },
  { salary: "125140.01", jurisdiction: "Scotland", tax: "47701.5548", ni: "4513.4002", net: "72925.055" },
  { salary: "125141", jurisdiction: "Scotland", tax: "47702.03", ni: "4513.42", net: "72925.55" },
  { salary: "150000", jurisdiction: "rUK", tax: "53703", ni: "5010.6", net: "91286.4" },
  { salary: "150000", jurisdiction: "Scotland", tax: "59634.35", ni: "5010.6", net: "85355.05" },
] as const;
