import { z } from "zod";
import { mvpCityIdSchema } from "../../data/schemas/enums";

export const categorySchema = z.enum(["income_tax", "national_insurance", "rent", "council_tax", "energy", "water", "groceries", "household_spending", "essentials", "lifestyle", "transport"]);
export type Category = z.infer<typeof categorySchema>;
export const diagnosticCodeSchema = z.enum([
  "COMPARISON_PARTIAL", "COMPARISON_UNRESOLVED", "TAKE_HOME_COMPARISON_UNRESOLVED",
  "HOUSEHOLD_COST_COMPARISON_PARTIAL", "HOUSEHOLD_COST_COMPARISON_UNRESOLVED",
  "RESIDUAL_COMPARISON_PARTIAL", "RESIDUAL_COMPARISON_UNRESOLVED", "CATEGORY_COMPARISON_UNRESOLVED",
  "SCENARIO_INCOME_UNRESOLVED", "SCENARIO_COSTS_PARTIAL", "SCENARIO_COSTS_UNRESOLVED",
  "SCENARIO_RESIDUAL_PARTIAL", "NET_INCOME_OVERRIDE_APPLIED", "BASELINE_INCOME_UNAVAILABLE",
  "HOUSEHOLD_COST_PARTIAL", "HOUSEHOLD_COST_UNRESOLVED",
  "ENERGY_MODEL_REQUIRED", "GROCERIES_MODEL_REQUIRED", "SPENDING_MODEL_REQUIRED",
  "WATER_USAGE_REQUIRED", "WATER_SELECTION_CONFLICT", "TRANSPORT_PERIOD_UNSUPPORTED",
  "TRANSPORT_FREQUENCY_MODEL_UNSUPPORTED", "TRANSPORT_NOT_APPLICABLE",
  "INVALID_INPUT", "INVALID_ARTIFACT", "INCOMPATIBLE_DATA_RELEASE",
  "TAX_JURISDICTION_UNSUPPORTED", "TAX_REFERENCE_MISSING", "TAX_REFERENCE_AMBIGUOUS", "TAX_REFERENCE_INVALID",
  "NI_CATEGORY_UNSUPPORTED", "NI_REFERENCE_MISSING", "NI_REFERENCE_AMBIGUOUS", "NI_REFERENCE_INVALID",
  "INCOME_OUT_OF_SCOPE", "ANI_EQUALS_GROSS_SCOPE", "ANNUALISED_NI_COMPARISON", "PERSONAL_ALLOWANCE_STATUTORY_ROUNDING",
  "EDINBURGH_RENT_SOURCE_UNRESOLVED", "LONDON_CITY_DEFAULT_UNRESOLVED", "AUTHORITY_SELECTION_REQUIRED",
  "NO_EXACT_EVIDENCE", "EVIDENCE_PERIOD_UNSUPPORTED", "RENT_PROPERTY_CROSS_UNSUPPORTED",
  "TAX_JURISDICTION_REQUIRED", "NI_SCOPE_UNSUPPORTED", "USER_OVERRIDE_APPLIED",
  "ENERGY_CITY_REGION_MAPPING_UNRESOLVED", "BIRMINGHAM_WATER_APPLICABILITY_UNRESOLVED", "WATER_APPLICABILITY_UNRESOLVED",
  "HOUSEHOLD_SPENDING_MODEL_NOT_IMPLEMENTED", "TRANSPORT_CITY_DEFAULT_PRODUCT_UNRESOLVED",
  "CALCULATOR_NOT_IMPLEMENTED", "SOURCE_PERIOD_QUALIFICATION", "INVALID_PRODUCT_SELECTION",
]);
export const diagnosticSchema = z.strictObject({
  code: diagnosticCodeSchema,
  severity: z.enum(["info", "warning", "blocking"]),
  kind: z.enum(["calculation_policy", "validation", "evidence_gap", "applicability_unresolved", "source_age", "user_override", "model_required", "unsupported_combination"]),
  category: categorySchema.optional(), cityId: mvpCityIdSchema.optional(),
  metric: z.enum(["take_home", "household_cost", "residual", "category", "comparison"]).optional(),
  scenarioRole: z.enum(["current", "destination"]).optional(),
  currentState: z.string().min(1).optional(), destinationState: z.string().min(1).optional(),
  canResolveWithUserInput: z.boolean().optional(),
  message: z.string().min(1), path: z.array(z.union([z.string(), z.number()])).optional(),
});
export type Diagnostic = z.infer<typeof diagnosticSchema>;
export type DiagnosticCode = z.infer<typeof diagnosticCodeSchema>;
