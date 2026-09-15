import { z } from "zod";
import { mvpCityIdSchema } from "../../data/schemas/enums";

export const categorySchema = z.enum(["income_tax", "national_insurance", "rent", "council_tax", "energy", "water", "groceries", "household_spending", "transport"]);
export type Category = z.infer<typeof categorySchema>;
export const diagnosticCodeSchema = z.enum([
  "INVALID_INPUT", "INVALID_ARTIFACT", "INCOMPATIBLE_DATA_RELEASE",
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
  kind: z.enum(["validation", "evidence_gap", "applicability_unresolved", "source_age", "user_override", "model_required", "unsupported_combination"]),
  category: categorySchema.optional(), cityId: mvpCityIdSchema.optional(),
  message: z.string().min(1), path: z.array(z.union([z.string(), z.number()])).optional(),
});
export type Diagnostic = z.infer<typeof diagnosticSchema>;
export type DiagnosticCode = z.infer<typeof diagnosticCodeSchema>;
