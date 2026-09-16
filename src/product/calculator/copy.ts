import type { Diagnostic } from "@/engine";
import type { ActionType, Classification, ProductIssue, ScenarioRole } from "./contracts";

export const classificationLabels: Record<Classification, string> = {
  OBSERVED_DATA: "Official data", CALCULATED: "Calculated", USER_ENTERED: "Your amount", MODELLED_ESTIMATE: "Estimate",
};
export const categoryLabels = { rent: "Rent", council_tax: "Council tax", energy: "Energy", water: "Water", groceries: "Groceries", essentials: "Household essentials", lifestyle: "Lifestyle", transport: "Transport" } as const;
export const cityLabels: Record<string, string> = { "LOC-LON": "London", "LOC-MAN": "Manchester", "LOC-BIR": "Birmingham", "LOC-LEE": "Leeds", "LOC-LIV": "Liverpool", "LOC-BRS": "Bristol", "LOC-EDI": "Edinburgh", "LOC-GLA": "Glasgow" };
export const copy = {
  buffer: "Monthly buffer after included costs",
  unchangedHero: "Your monthly household costs are about the same",
  salary: "Salary needed to keep the same monthly buffer",
  annual: "Annual comparison for one employee and one employment, Class 1 category A. Actual payroll take-home may differ.",
  periods: "Sources use different publication and effective periods.",
  partialHero: "We can compare part of your monthly costs",
  limitedHero: "Your comparison needs more information",
  noComparison: "Complete both sets of inputs to see your comparison.",
  partialResidual: "After known costs — incomplete", unavailable: "Needs input", notApplicable: "Not applicable",
};
export const datasetLabels: Record<string, string> = { rent: "Rent", councilTax: "Council tax", incomeTax: "Income tax", nationalInsurance: "Employee National Insurance", energyPrice: "Energy price reference", energyConsumption: "Energy consumption reference", water: "Water", groceries: "Grocery reference", householdSpending: "Household spending reference", transport: "Transport" };
const diagnosticCopy: Record<string, [string, ActionType, boolean?]> = {
  ENERGY_MODEL_REQUIRED: ["Enter your monthly energy cost to include energy in this comparison.", "ENTER_AMOUNT"],
  GROCERIES_MODEL_REQUIRED: ["Enter your household’s monthly grocery cost.", "ENTER_AMOUNT"],
  SPENDING_MODEL_REQUIRED: ["Enter a monthly amount; household spending profiles are not calculated.", "ENTER_AMOUNT"],
  EDINBURGH_RENT_SOURCE_UNRESOLVED: ["Enter your rent amount; an Edinburgh source estimate is unavailable.", "ENTER_AMOUNT"],
  LONDON_CITY_DEFAULT_UNRESOLVED: ["Enter your council tax amount; a London borough charge is unavailable in these sources.", "ENTER_AMOUNT"],
  AUTHORITY_SELECTION_REQUIRED: ["Select your council authority and band, or enter a monthly amount.", "SELECT_AUTHORITY"],
  BIRMINGHAM_WATER_APPLICABILITY_UNRESOLVED: ["Enter your monthly water bill; provider applicability is unresolved.", "ENTER_AMOUNT"],
  WATER_USAGE_REQUIRED: ["Enter your monthly water bill; tariff evidence alone does not establish a household bill.", "ENTER_AMOUNT"],
  WATER_APPLICABILITY_UNRESOLVED: ["Select your Scottish water band and connected services, or enter an amount.", "SELECT_WATER_OPTION"],
  WATER_SELECTION_CONFLICT: ["Check that council tax and water use the same property band.", "SELECT_BAND"],
  TRANSPORT_CITY_DEFAULT_PRODUCT_UNRESOLVED: ["Choose a supported fare product or enter your monthly transport cost.", "SELECT_TRANSPORT_PRODUCT"],
  INVALID_PRODUCT_SELECTION: ["Review the selected fare’s city and evidence date, or enter a monthly amount.", "SELECT_TRANSPORT_PRODUCT"],
  TAX_JURISDICTION_REQUIRED: ["Confirm your tax jurisdiction; it is not inferred from your city.", "REVIEW_INPUT"],
  SCENARIO_INCOME_UNRESOLVED: ["Enter supported employment details or your actual monthly take-home.", "REVIEW_INPUT"],
  CURRENT_INCOME_UNRESOLVED: ["Resolve current take-home to establish your monthly buffer.", "REVIEW_INPUT"],
  CURRENT_COSTS_INCOMPLETE: ["Resolve the missing current costs before calculating a preservation salary.", "ENTER_AMOUNT"],
  CURRENT_RESIDUAL_INCOMPLETE: ["A complete current monthly buffer is required.", "REVIEW_INPUT"],
  DESTINATION_COSTS_INCOMPLETE: ["Resolve the missing destination costs before calculating a preservation salary.", "ENTER_AMOUNT"],
  DESTINATION_NET_OVERRIDE_CONFLICT: ["Remove the destination take-home override explicitly to calculate a salary-based result.", "REVIEW_INPUT"],
  DESTINATION_TAX_JURISDICTION_UNSUPPORTED: ["Confirm a supported destination tax jurisdiction.", "REVIEW_INPUT"],
  DESTINATION_NI_UNSUPPORTED: ["Confirm category A employee NI and annual-comparison scope.", "REVIEW_INPUT"],
  DESTINATION_EMPLOYMENT_UNSUPPORTED: ["Review the destination employment scope, tax year and evidence date.", "REVIEW_INPUT"],
  SALARY_SEARCH_REFERENCE_UNSUPPORTED: ["Salary search is unavailable for this income reference configuration.", "REVIEW_INPUT", false],
  SALARY_PRESERVATION_INELIGIBLE: ["A salary result needs a complete current buffer and complete destination costs with supported employment details.", "REVIEW_INPUT"],
  SALARY_PRESERVATION_NO_SOLUTION: ["No salary within the operational search limit meets this buffer target.", "REVIEW_INPUT", false],
};
export const actionLabels: Record<ActionType, string> = { ENTER_AMOUNT: "Enter amount", SELECT_AUTHORITY: "Select authority", SELECT_BAND: "Select band", SELECT_TRANSPORT_PRODUCT: "Choose transport", SELECT_WATER_OPTION: "Review water", REVIEW_INPUT: "Review inputs" };
export function presentDiagnostic(d: Diagnostic, role?: ScenarioRole): ProductIssue {
  const mapped = diagnosticCopy[d.code];
  return { code: d.code, message: mapped?.[0] ?? d.message, action: mapped?.[1] ?? "REVIEW_INPUT", userActionPossible: mapped?.[2] ?? d.canResolveWithUserInput ?? d.severity === "blocking", severity: d.severity, ...(role ?? d.scenarioRole ? { role: role ?? d.scenarioRole } : {}), ...(d.category ? { category: d.category } : {}), ...(d.path ? { path: d.path } : {}) };
}
export function uniqueIssues(issues: readonly ProductIssue[]): ProductIssue[] {
  return [...new Map(issues.map((i) => [JSON.stringify([i.code, i.role, i.category, i.path, i.severity]), i])).values()];
}
