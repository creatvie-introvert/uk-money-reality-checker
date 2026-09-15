import { locationInputSchema, monthlyOverrideSchema, nonnegativeMonthlyOverrideSchema, type MonthlyOverride } from "../contracts/input";
import type { BaselineEvidence, CategoryResult, EngineEvidence } from "../contracts/output";
import { householdCostCategorySchema, requiredHouseholdCostCategories, type HouseholdCostCategory, type HouseholdMonthlyCosts, type MonthlyCostResult, type ProductionCostClassification, type HouseholdCostContext } from "../contracts/household";
import type { Diagnostic, DiagnosticCode } from "../diagnostics";
import { addMoney, compareMoney, fromGbp, monthlyEquivalent, type Money } from "../money";
import { calculateRent, calculateCouncilTax } from "./housing";

const version = "household-monthly-v1" as const;
const costScenarioSchema = locationInputSchema.omit({ income: true });
type Context = Pick<HouseholdCostContext, "evidence"> & { location: ReturnType<typeof costScenarioSchema.parse> };
const unique = <T>(values: readonly T[]) => [...new Set(values)];
function sourceMetadata(records: readonly EngineEvidence[]) {
  return {
    sourceIds: unique(records.map((r) => r.provenance.sourceId)),
    sourcePeriods: unique(records.flatMap((r) => r.provenance.sourcePeriod ? [r.provenance.sourcePeriod] : [])),
  };
}
function gap(context: Context, category: HouseholdCostCategory, code: DiagnosticCode, message: string, records: readonly EngineEvidence[] = [], kind: Diagnostic["kind"] = "model_required"): MonthlyCostResult {
  const diagnostic: Diagnostic = { code, category, cityId: context.location.cityId, severity: "blocking", kind, message, canResolveWithUserInput: true };
  return {
    category, cityId: context.location.cityId, status: "UNRESOLVED", inputUsed: structuredClone(context.location),
    baselineEvidence: { status: "UNAVAILABLE", records, diagnostics: [diagnostic] }, evidenceLineage: records,
    ...sourceMetadata(records), canResolveWithUserInput: true, diagnostics: [diagnostic],
    limitations: unique([message, ...records.flatMap((r) => r.provenance.limitations)]),
  };
}
function overrideResult(baseline: MonthlyCostResult, override?: MonthlyOverride): MonthlyCostResult {
  if (!override) return baseline;
  const schema = ["transport", "essentials", "lifestyle"].includes(baseline.category) ? nonnegativeMonthlyOverrideSchema : monthlyOverrideSchema;
  const input = schema.parse(override);
  const amount = fromGbp(input.amountGbp);
  return {
    ...baseline, status: "RESOLVED", monthlyAmount: amount, classification: "USER_ENTERED",
    resolutionSource: "USER_OVERRIDE", overrideStatus: "USER_OVERRIDE", amountBasis: "USER_DECLARED_MONTHLY",
    effectiveInput: { valueType: "USER_ENTERED", amount, period: "MONTHLY", ...(input.note ? { note: input.note } : {}) },
    lineageClassifications: unique([...baseline.evidenceLineage.map((r) => r.valueType as ProductionCostClassification), "USER_ENTERED"]),
    // A baseline formula must not describe the effective override amount.
    formula: undefined,
    diagnostics: [...baseline.diagnostics.map((d) => ({ ...d, severity: d.severity === "blocking" ? "warning" as const : d.severity })),
      { code: "USER_OVERRIDE_APPLIED", category: baseline.category, cityId: baseline.cityId, severity: "info", kind: "user_override", message: "Used the explicit monthly amount; source records and unresolved baseline remain visible.", canResolveWithUserInput: true }],
  };
}
function observedMonthly(context: Context, category: HouseholdCostCategory, records: readonly EngineEvidence[], amount: Money, period: "ANNUAL" | "WEEKLY" | "MONTHLY", limitations: string[]): MonthlyCostResult {
  const converted = period !== "MONTHLY";
  return {
    category, cityId: context.location.cityId, status: "RESOLVED", monthlyAmount: monthlyEquivalent(amount, period),
    classification: converted ? "CALCULATED" : "OBSERVED_DATA", resolutionSource: converted ? "CALCULATED_FROM_EVIDENCE" : "EVIDENCE",
    lineageClassifications: converted ? ["OBSERVED_DATA", "CALCULATED"] : ["OBSERVED_DATA"],
    baselineEvidence: { status: "AVAILABLE", records }, effectiveInput: { valueType: "OBSERVED_DATA", records },
    evidenceLineage: records, ...sourceMetadata(records), inputUsed: structuredClone(context.location),
    overrideStatus: "NONE", amountBasis: converted ? "MATHEMATICAL_MONTHLY_EQUIVALENT" : "SOURCE_MONTH",
    ...(converted ? { formula: { expression: period === "ANNUAL" ? "annualGbp / 12" : "weeklyGbp * 52 / 12", version } } : {}),
    canResolveWithUserInput: true, diagnostics: [],
    limitations: unique([...limitations, ...records.flatMap((r) => [...r.provenance.limitations, ...(r.provenance.methodologyNotes ? [r.provenance.methodologyNotes] : [])])]),
  };
}
function housingResult(result: CategoryResult, category: "rent" | "council_tax"): MonthlyCostResult {
  const records = result.evidenceLineage;
  const baselineEvidence: BaselineEvidence<EngineEvidence> = result.status === "RESOLVED" ? result.baselineEvidence : { status: "UNAVAILABLE", records, diagnostics: result.diagnostics };
  const common = { category, ...sourceMetadata(records), baselineEvidence, canResolveWithUserInput: true,
    diagnostics: result.diagnostics.map((d) => ({ ...d, canResolveWithUserInput: true })) };
  if (result.status !== "RESOLVED") return { ...result, ...common, status: "UNRESOLVED" };
  const override = result.overrideStatus === "USER_OVERRIDE";
  return {
    ...result, ...common, status: "RESOLVED",
    classification: result.classification as ProductionCostClassification,
    lineageClassifications: result.lineageClassifications as readonly ProductionCostClassification[],
    resolutionSource: override ? "USER_OVERRIDE" : result.classification === "CALCULATED" ? "CALCULATED_FROM_EVIDENCE" : "EVIDENCE",
    effectiveInput: override ? { valueType: "USER_ENTERED", amount: result.monthlyAmount, period: "MONTHLY" } : { valueType: "OBSERVED_DATA", records },
  };
}
function water(context: Context): MonthlyCostResult {
  const { location, evidence } = context;
  const selection = location.housing.water;
  if (location.cityId === "LOC-BIR") return gap(context, "water", "BIRMINGHAM_WATER_APPLICABILITY_UNRESOLVED", "Birmingham tariff zone and drainage applicability are unresolved; no tariff is selected.", [], "applicability_unresolved");
  if (!["LOC-EDI", "LOC-GLA"].includes(location.cityId)) return gap(context, "water", "WATER_USAGE_REQUIRED", "English tariff evidence does not establish a monthly household bill: usage, provider/regime and all service components are required.");
  if (!selection) return gap(context, "water", "WATER_APPLICABILITY_UNRESOLVED", "Declare the unmetered Scottish council-tax-band regime, actual band and connected services.", [], "applicability_unresolved");
  if (location.housing.councilTax && location.housing.councilTax.band !== selection.band) return gap(context, "water", "WATER_SELECTION_CONFLICT", "Water and council tax must use the same actual property band.", [], "validation");
  const records = evidence.getWaterEvidence("scottish-water").filter((r) =>
    r.billingRegime === selection.billingRegime && r.councilTaxBand === selection.band &&
    r.serviceComponent === selection.connectedServices && r.variant === "standard" &&
    r.tariffComponent === "council_tax_band_charge" && r.unit === "GBP/year" &&
    r.aggregationRole === (selection.connectedServices === "combined" ? "alternative_total" : "component") &&
    r.effectiveFrom <= location.effectiveOn && r.effectiveTo >= location.effectiveOn);
  if (records.length !== 1) return gap(context, "water", "NO_EXACT_EVIDENCE", "Exactly one supported Scottish service/band/date charge is required; missing or ambiguous evidence is not substituted.", records, "evidence_gap");
  return observedMonthly(context, "water", records, fromGbp(String(records[0].amount)), "ANNUAL", [
    "Scottish unmetered connected services at the declared actual band, before discounts/reductions; annual charge / 12, not an instalment schedule.",
    "The published combined charge replaces the separate water/sewerage charges; it is never added to them.",
  ]);
}
function transport(context: Context): MonthlyCostResult {
  const { location, evidence } = context;
  const selection = location.transport;
  if (selection.status === "NOT_APPLICABLE") {
    return {
      category: "transport", cityId: location.cityId, status: "NOT_APPLICABLE", resolutionSource: "NOT_APPLICABLE",
      reason: "User explicitly declared no transport cost.", effectiveInput: { declaration: selection.reason },
      inputUsed: structuredClone(selection), evidenceLineage: [], baselineEvidence: { status: "UNAVAILABLE", records: [], diagnostics: [] },
      sourceIds: [], sourcePeriods: [], canResolveWithUserInput: true, limitations: ["No transport expenditure is explicitly declared; this is not inferred from missing fares."],
      diagnostics: [{ code: "TRANSPORT_NOT_APPLICABLE", category: "transport", cityId: location.cityId, severity: "info", kind: "user_override", message: "No transport cost explicitly declared.", canResolveWithUserInput: true }],
    };
  }
  if (selection.status !== "SELECTED") return gap(context, "transport", "TRANSPORT_CITY_DEFAULT_PRODUCT_UNRESOLVED", "Select a supported period ticket or enter a monthly household transport amount; no fare is selected automatically.", [], "applicability_unresolved");
  const records = evidence.getTransportProducts({ cityId: location.cityId, effectiveOn: location.effectiveOn }).filter((r) => r.recordId === selection.productId);
  if (records.length !== 1) return gap(context, "transport", "INVALID_PRODUCT_SELECTION", "The selected product must have exactly one match for this city and evidence date.", records, "evidence_gap");
  if (selection.frequency) return gap(context, "transport", "TRANSPORT_FREQUENCY_MODEL_UNSUPPORTED", "Frequency profiles are development models and cannot enter production household costs.", records);
  const r = records[0];
  const period = r.fareUnit !== "GBP/ticket" ? undefined
    : r.fareType === "weekly" && r.validityPeriod === "week" ? "WEEKLY"
    : r.fareType === "annual" && r.validityPeriod === "year" ? "ANNUAL"
    : r.fareType === "monthly" && r.validityPeriod === "month" ? "MONTHLY" : undefined;
  if (!period) return gap(context, "transport", "TRANSPORT_PERIOD_UNSUPPORTED", "Caps, daily and journey fares do not establish monthly spending; no trip count or cap attainment is assumed.", records);
  return observedMonthly(context, "transport", records, fromGbp(String(r.fareGbp)), period, [
    ...r.applicability.conditions,
    "Mathematical equivalent of one explicitly selected adult period ticket; no household-headcount multiplier, usage forecast, extra fares or card fees are included. Use a household monthly override for other transport expenditure.",
    "Ticket validity does not extend the fare evidence date; this result uses the recorded as-of price only.",
  ]);
}
/** Typed normalized scenario boundary; malformed direct calls throw ZodError as in housing resolvers. */
export function calculateMonthlyCostCategory(context: HouseholdCostContext, rawCategory: HouseholdCostCategory): MonthlyCostResult {
  const category = householdCostCategorySchema.parse(rawCategory);
  const { cityId, effectiveOn, housing, spending } = context.location;
  const scenario = { cityId, effectiveOn, housing, transport: context.location.transport, spending };
  const location = costScenarioSchema.parse(scenario);
  const ctx = { location, evidence: context.evidence };
  if (category === "rent") return housingResult(calculateRent(ctx.evidence, { cityId: location.cityId, bedrooms: location.housing.bedrooms, sourcePeriod: location.housing.rentSourceMonth, propertyType: location.housing.propertyType, override: location.housing.overrides.rent }), category);
  if (category === "council_tax") return housingResult(calculateCouncilTax(ctx.evidence, { cityId: location.cityId, effectiveOn: location.effectiveOn, selection: location.housing.councilTax, override: location.housing.overrides.councilTax }), category);
  if (category === "water") return overrideResult(water(ctx), location.housing.overrides.water);
  if (category === "transport") return overrideResult(transport(ctx), location.transport.status === "NOT_APPLICABLE" ? undefined : location.transport.override);
  if (category === "energy") return overrideResult(gap(ctx, category, "ENERGY_MODEL_REQUIRED", "No approved household consumption model or city-to-Ofgem region selection; NEED and Ofgem references are not combined into a bill."), location.housing.overrides.energy);
  const groceries = category === "groceries";
  return overrideResult(gap(ctx, category, groceries ? "GROCERIES_MODEL_REQUIRED" : "SPENDING_MODEL_REQUIRED",
    groceries ? "National per-person reference is not a household/city grocery budget; enter a monthly household amount." : "Essentials/Lifestyle membership is unapproved; no COICOP rows are aggregated. Enter a monthly amount exclusive of the other categories.",
    groceries ? ctx.evidence.getGroceryReference() : ctx.evidence.getHouseholdSpendingReference()), location.spending[category]);
}

/** Reject malformed category sets rather than silently omitting, duplicating or mixing cities. */
export function aggregateHouseholdMonthlyCosts(context: HouseholdCostContext, results: readonly MonthlyCostResult[]): HouseholdMonthlyCosts {
  const categories = requiredHouseholdCostCategories;
  if (results.length !== categories.length || new Set(results.map((r) => r.category)).size !== categories.length || results.some((r) => !categories.includes(r.category) || r.cityId !== context.location.cityId)) throw new Error("Household aggregation requires exactly one result per canonical cost category for one city");
  for (const r of results) {
    if (!["RESOLVED", "UNRESOLVED", "NOT_APPLICABLE"].includes(r.status)) throw new Error("Unknown monthly category result status");
    if (r.status === "RESOLVED") {
      if (!["OBSERVED_DATA", "CALCULATED", "USER_ENTERED"].includes(r.classification) || r.lineageClassifications.some((c) => !["OBSERVED_DATA", "CALCULATED", "USER_ENTERED"].includes(c)) || compareMoney(r.monthlyAmount, fromGbp("0")) < 0) throw new Error("Only nonnegative production category amounts can enter household costs");
    } else if ("monthlyAmount" in r || (r.status === "NOT_APPLICABLE" && (r.category !== "transport" || r.effectiveInput.declaration !== "NO_TRANSPORT_COST"))) throw new Error("Unresolved/not-applicable categories cannot carry amounts; only explicit no-transport applicability is supported");
  }
  const ordered = categories.map((category) => results.find((r) => r.category === category)!);
  const resolved = ordered.filter((r) => r.status === "RESOLVED");
  const unresolvedCategories = ordered.filter((r) => r.status === "UNRESOLVED").map((r) => r.category);
  const notApplicableCategories = ordered.filter((r) => r.status === "NOT_APPLICABLE").map((r) => r.category);
  const base = {
    cityId: context.location.cityId, categoryResults: ordered, requiredCategories: categories,
    includedCategories: resolved.map((r) => r.category), unresolvedCategories, notApplicableCategories,
    requiredCategoryCount: categories.length, resolvedCategoryCount: resolved.length,
    unresolvedCategoryCount: unresolvedCategories.length, notApplicableCategoryCount: notApplicableCategories.length,
    diagnostics: ordered.flatMap((r) => r.diagnostics), dataReleaseMetadata: context.evidence.metadata, calculationVersion: version,
  };
  if (!resolved.length) return { ...base, completeness: "UNRESOLVED", diagnostics: [...base.diagnostics, { code: "HOUSEHOLD_COST_UNRESOLVED", cityId: base.cityId, severity: "blocking", kind: "evidence_gap", message: "No category amount is resolved; no household subtotal is available.", canResolveWithUserInput: true }] };
  const subtotal = resolved.reduce((sum, r) => addMoney(sum, r.monthlyAmount), fromGbp("0"));
  if (unresolvedCategories.length) return { ...base, completeness: "PARTIAL", resolvedSubtotalMonthly: subtotal, classification: "CALCULATED", diagnostics: [...base.diagnostics, { code: "HOUSEHOLD_COST_PARTIAL", cityId: base.cityId, severity: "warning", kind: "evidence_gap", message: "Resolved subtotal only; required household costs remain unresolved.", canResolveWithUserInput: true }] };
  return { ...base, completeness: "COMPLETE", resolvedSubtotalMonthly: subtotal, totalMonthlyCost: subtotal, classification: "CALCULATED" };
}
export function calculateHouseholdMonthlyCosts(context: HouseholdCostContext): HouseholdMonthlyCosts {
  return aggregateHouseholdMonthlyCosts(context, requiredHouseholdCostCategories.map((category) => calculateMonthlyCostCategory(context, category)));
}
