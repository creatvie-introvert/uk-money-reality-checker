import { z } from "zod";
import { mvpCityIdSchema, jurisdictionSchema } from "../../data/schemas/enums";
import { fromGbp, type Money } from "../money";
import type { EvidenceLoader } from "../loaders";
import { yearMonthSchema } from "../loaders";
import type { Diagnostic } from "../diagnostics";

export const gbpText = z.string().max(128).regex(/^\d+(\.\d{1,2})?$/);
export const monthlyOverrideSchema = z.strictObject({
  amountGbp: gbpText.refine((s) => /[1-9]/.test(s), "Override must be positive; no implicit free-cost assumption"),
  period: z.literal("MONTHLY"), note: z.string().max(1000).optional(),
});
/** Explicit zero is supported for net income, discretionary spending and transport inputs. */
export const nonnegativeMonthlyOverrideSchema = monthlyOverrideSchema.extend({ amountGbp: gbpText });
export type MonthlyOverride = z.infer<typeof monthlyOverrideSchema>;
export const authoritySelectionSchema = z.strictObject({
  authorityName: z.string().min(1), authorityCode: z.string().regex(/^[ESW]\d{8}$/).optional(),
  band: z.enum(["A", "B", "C", "D", "E", "F", "G", "H"]),
});
export const bedroomSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export const propertyTypeSchema = z.enum(["detached", "semidetached", "terraced", "flat maisonette"]);
const transportSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("UNRESOLVED"), override: nonnegativeMonthlyOverrideSchema.optional() }),
  z.strictObject({ status: z.literal("NOT_APPLICABLE"), reason: z.literal("NO_TRANSPORT_COST") }),
  z.strictObject({ status: z.literal("SELECTED"), productId: z.string().min(1), override: nonnegativeMonthlyOverrideSchema.optional(),
    frequency: z.strictObject({ daysPerWeek: z.number().finite().min(0).max(7), valueType: z.literal("MODELLED_ESTIMATE"), releaseStatus: z.literal("DEV_ONLY") }).optional(),
  }),
]);
export const locationInputSchema = z.strictObject({
  cityId: mvpCityIdSchema,
  effectiveOn: z.iso.date(),
  housing: z.strictObject({
    bedrooms: bedroomSchema, rentSourceMonth: yearMonthSchema, propertyType: propertyTypeSchema.optional(),
    councilTax: authoritySelectionSchema.optional(),
    water: z.strictObject({
      billingRegime: z.literal("council_tax_band"),
      band: authoritySelectionSchema.shape.band,
      connectedServices: z.enum(["clean_water", "wastewater", "combined"]),
    }).optional(),
    overrides: z.strictObject({ rent: monthlyOverrideSchema.optional(), councilTax: monthlyOverrideSchema.optional(), water: monthlyOverrideSchema.optional(), energy: monthlyOverrideSchema.optional() }),
  }),
  income: z.strictObject({
    grossAnnualSalaryGbp: gbpText,
    calculationBasis: z.literal("ANNUAL_COMPARISON"),
    scope: z.literal("ONE_EMPLOYEE_ONE_EMPLOYMENT"),
    taxYear: z.string().regex(/^\d{4}\/\d{2}$/), taxJurisdiction: jurisdictionSchema.optional(),
    // This is net disposable income, never a replacement gross salary or tax rule.
    netMonthlyIncomeOverride: nonnegativeMonthlyOverrideSchema.optional(),
    niCategory: z.string().regex(/^[A-Z]$/), payPeriod: z.enum(["weekly", "monthly", "annual"]),
  }),
  transport: transportSchema,
  spending: z.strictObject({ groceries: monthlyOverrideSchema.optional(), essentials: nonnegativeMonthlyOverrideSchema.optional(), lifestyle: nonnegativeMonthlyOverrideSchema.optional() }),
});
export const calculatorInputSchema = z.strictObject({
  household: z.strictObject({ adults: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER), children: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER), childAges: z.array(z.number().int().min(0).max(17)).optional() }).superRefine((h, ctx) => {
    if (h.childAges && h.childAges.length !== h.children) ctx.addIssue({ code: "custom", path: ["childAges"], message: "Child ages must account for every child when supplied" });
  }),
  currentLocation: locationInputSchema,
  destinationLocation: locationInputSchema,
});
export type CalculatorInput = z.infer<typeof calculatorInputSchema>;
export type LocationInput = z.infer<typeof locationInputSchema>;
export type NormalizedLocation = LocationInput & { grossAnnualSalary: Money };
export type NormalizedInput = Omit<CalculatorInput, "currentLocation" | "destinationLocation"> & { currentLocation: NormalizedLocation; destinationLocation: NormalizedLocation };
export type InputValidation = { status: "VALID"; input: NormalizedInput; diagnostics: Diagnostic[] } | { status: "INVALID"; diagnostics: Diagnostic[] };
export function normalizeCalculatorInput(raw: unknown, loader: EvidenceLoader): InputValidation {
  const parsed = calculatorInputSchema.safeParse(raw);
  if (!parsed.success) return { status: "INVALID", diagnostics: parsed.error.issues.map((issue) => ({ code: "INVALID_INPUT", severity: "blocking", kind: "validation", message: issue.message, path: issue.path.map((p) => typeof p === "number" ? p : String(p)) })) };
  const input = parsed.data;
  const diagnostics: Diagnostic[] = [];
  for (const key of ["currentLocation", "destinationLocation"] as const) {
    const location = input[key], selection = location.transport;
    if (selection.status === "SELECTED" && !selection.override && (!loader.hasTransportProduct(selection.productId) || !loader.getTransportProducts({ cityId: location.cityId, effectiveOn: location.effectiveOn }).some((p) => p.recordId === selection.productId))) {
      diagnostics.push({ code: "INVALID_PRODUCT_SELECTION", severity: "blocking", kind: "validation", category: "transport", cityId: location.cityId, message: "Product ID must exist and match the selected city and evidence date; route eligibility still requires confirmation", path: [key, "transport", "productId"] });
    }
  }
  if (diagnostics.length) return { status: "INVALID", diagnostics };
  const normalize = (location: LocationInput): NormalizedLocation => ({ ...location, grossAnnualSalary: fromGbp(location.income.grossAnnualSalaryGbp) });
  return { status: "VALID", input: { ...input, currentLocation: normalize(input.currentLocation), destinationLocation: normalize(input.destinationLocation) }, diagnostics: [] };
}
