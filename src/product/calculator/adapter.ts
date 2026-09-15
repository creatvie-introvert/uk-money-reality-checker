import { z } from "zod";
import { scenarioInputSchema } from "@/engine/contracts/scenario";
import type { AdapterResult, AdaptedSide, CalculatorFormState, FormLocation, MonthlyChoice, ProductIssue, ScenarioRole } from "./contracts";

const unknownChoice = z.strictObject({ mode: z.literal("UNKNOWN") });
const enteredChoice = z.strictObject({ mode: z.literal("AMOUNT"), amountGbp: z.string(), note: z.string().optional() });
const sourceChoice = z.strictObject({ mode: z.literal("SOURCE") });
const monthlyChoice = z.discriminatedUnion("mode", [unknownChoice, enteredChoice]);
const councilSelection = z.strictObject({ authorityName: z.string(), authorityCode: z.string().optional(), band: z.string() });
const waterSelection = z.strictObject({ band: z.string(), connectedServices: z.enum(["combined", "clean_water", "wastewater"]) });
const locationSchema = z.strictObject({
  cityId: z.string(), effectiveOn: z.string(), bedrooms: z.string(), rentSourceMonth: z.string(),
  rent: z.discriminatedUnion("mode", [unknownChoice, enteredChoice, sourceChoice]),
  council: z.discriminatedUnion("mode", [unknownChoice, enteredChoice.extend({ selection: councilSelection.optional() }), sourceChoice.extend({ authorityName: z.string(), authorityCode: z.string().optional(), band: z.string() })]),
  water: z.discriminatedUnion("mode", [unknownChoice, enteredChoice.extend({ selection: waterSelection.optional() }), sourceChoice.extend({ band: z.string(), connectedServices: z.enum(["", "combined", "clean_water", "wastewater"]) })]),
  energy: monthlyChoice, spending: z.strictObject({ groceries: monthlyChoice, essentials: monthlyChoice, lifestyle: monthlyChoice }),
  transport: z.discriminatedUnion("mode", [unknownChoice, enteredChoice, z.strictObject({ mode: z.literal("PRODUCT"), productId: z.string(), override: z.strictObject({ amountGbp: z.string(), note: z.string().optional() }).optional() }), z.strictObject({ mode: z.literal("NONE") })]),
  income: z.strictObject({ grossAnnualSalaryGbp: z.string(), taxJurisdiction: z.string(), taxYear: z.string(), niCategory: z.string(), scope: z.string(), calculationBasis: z.string(), netOverride: z.strictObject({ amountGbp: z.string(), note: z.string().optional() }).optional() }),
});
export const calculatorFormSchema = z.strictObject({ household: z.strictObject({ adults: z.string(), children: z.string() }), current: locationSchema, destination: locationSchema });
const issue = (code: string, message: string, path: readonly (string | number)[], role?: ScenarioRole, severity: ProductIssue["severity"] = "blocking"): ProductIssue => ({ code, message, path, role, severity, action: "REVIEW_INPUT", userActionPossible: true });
const entered = (choice: MonthlyChoice | { mode: string }) => choice.mode === "AMOUNT" && "amountGbp" in choice ? { amountGbp: (choice.amountGbp as string).trim(), period: "MONTHLY" as const, ...("note" in choice && choice.note ? { note: choice.note as string } : {}) } : undefined;
const optionalText = (value: string) => value.trim() || undefined;
/** Structural absence prevents an engine call; supported optional gaps remain explicit engine gaps. */
export function buildCalculatorInputsFromForm(raw: unknown): AdapterResult {
  const parsed = calculatorFormSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => issue("ADAPTER_INVALID_FORM", i.message, i.path.map(String)));
    return { current: { state: "INVALID", issues }, destination: { state: "INVALID", issues } };
  }
  const form: CalculatorFormState = parsed.data;
  const adapt = (role: ScenarioRole, q: FormLocation): AdaptedSide => {
    const issues: ProductIssue[] = [];
    const required = { cityId: q.cityId, effectiveOn: q.effectiveOn, bedrooms: q.bedrooms, rentSourceMonth: q.rentSourceMonth };
    for (const [key, value] of Object.entries(required)) if (!value.trim()) issues.push(issue("ADAPTER_REQUIRED_INPUT", `Enter ${key === "effectiveOn" ? "the evidence applicability date" : key === "rentSourceMonth" ? "the rent source month" : key === "cityId" ? "a city" : "the bedroom band"}.`, [role, key], role));
    for (const key of ["adults", "children"] as const) if (!form.household[key].trim()) issues.push(issue("ADAPTER_REQUIRED_INPUT", `Enter the number of ${key}.`, ["household", key], role));
    if (q.rent.mode === "UNKNOWN") issues.push(issue("ADAPTER_RENT_BASIS_REQUIRED", "Choose the published rent source or enter your rent amount; no rent option is assumed.", [role, "rent"], role));
    if (issues.length) return { state: "INCOMPLETE", issues };
    const count = (text: string) => /^\d+$/.test(text.trim()) ? Number(text.trim()) : Number.NaN;
    if (!q.income.netOverride && q.income.taxJurisdiction.trim() === "") issues.push(issue("ADAPTER_TAX_JURISDICTION_REQUIRED", "Confirm your tax jurisdiction to calculate employment income; it is not inferred from your city.", [role, "income", "taxJurisdiction"], role, "warning"));
    let councilTax = q.council.mode === "AMOUNT" ? q.council.selection : undefined;
    if (q.council.mode === "SOURCE") {
      if (q.council.authorityName.trim() && q.council.band.trim()) councilTax = { authorityName: q.council.authorityName.trim(), authorityCode: optionalText(q.council.authorityCode ?? ""), band: q.council.band.trim() };
      else issues.push({ ...issue("ADAPTER_COUNCIL_SELECTION_REQUIRED", "Select both authority and band, or enter your monthly council tax.", [role, "council"], role, "warning"), action: q.council.authorityName.trim() ? "SELECT_BAND" : "SELECT_AUTHORITY", category: "council_tax" });
    }
    let water = q.water.mode === "AMOUNT" && q.water.selection ? { billingRegime: "council_tax_band", ...q.water.selection } : undefined;
    if (q.water.mode === "SOURCE") {
      if (q.water.band.trim() && q.water.connectedServices) water = { billingRegime: "council_tax_band", band: q.water.band.trim(), connectedServices: q.water.connectedServices };
      else issues.push({ ...issue("ADAPTER_WATER_SELECTION_REQUIRED", "Select the actual water band and connected services.", [role, "water"], role, "warning"), action: "SELECT_WATER_OPTION", category: "water" });
    }
    const input = {
      household: { adults: count(form.household.adults), children: count(form.household.children) },
      location: {
        cityId: q.cityId.trim(), effectiveOn: q.effectiveOn.trim(),
        housing: { bedrooms: count(q.bedrooms), rentSourceMonth: q.rentSourceMonth.trim(), councilTax, water,
          overrides: { rent: entered(q.rent), councilTax: entered(q.council), water: entered(q.water), energy: entered(q.energy) } },
        spending: { groceries: entered(q.spending.groceries), essentials: entered(q.spending.essentials), lifestyle: entered(q.spending.lifestyle) },
        transport: q.transport.mode === "NONE" ? { status: "NOT_APPLICABLE", reason: "NO_TRANSPORT_COST" }
          : q.transport.mode === "PRODUCT" ? { status: "SELECTED", productId: q.transport.productId.trim(), ...(q.transport.override ? { override: { ...q.transport.override, amountGbp: q.transport.override.amountGbp.trim(), period: "MONTHLY" } } : {}) }
          : { status: "UNRESOLVED", override: entered(q.transport) },
        income: { grossAnnualSalaryGbp: optionalText(q.income.grossAnnualSalaryGbp), taxJurisdiction: optionalText(q.income.taxJurisdiction),
          taxYear: optionalText(q.income.taxYear), niCategory: optionalText(q.income.niCategory), scope: optionalText(q.income.scope), calculationBasis: optionalText(q.income.calculationBasis),
          ...(q.income.netOverride ? { netMonthlyIncomeOverride: { ...q.income.netOverride, amountGbp: q.income.netOverride.amountGbp.trim(), period: "MONTHLY" } } : {}) },
      },
    };
    const validated = scenarioInputSchema.safeParse(input);
    if (!validated.success) return { state: "INVALID", issues: [...issues, ...validated.error.issues.map((i) => issue("ADAPTER_INVALID_INPUT", i.message, [role, ...i.path.map(String)], role))] };
    return { state: "READY", input: validated.data, issues };
  };
  return { current: adapt("current", form.current), destination: adapt("destination", form.destination) };
}
