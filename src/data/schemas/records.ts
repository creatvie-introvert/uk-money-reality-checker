import { z } from "zod";

import { geographySchema } from "./geography";
import { confidenceClassSchema, jurisdictionSchema, releaseStatusSchema } from "./enums";
import { provenanceSchema } from "../provenance/model";

const recordBase = {
  recordId: z.string().min(1),
  dataset: z.string().min(1),
  valueType: confidenceClassSchema,
  releaseStatus: releaseStatusSchema,
  provenance: provenanceSchema,
  methodology: z.string().min(1).optional(),
  qa: z.record(z.string(), z.unknown()).default({}),
};

export const rentRecordSchema = z.object({
  ...recordBase,
  category: z.literal("rent"),
  geography: geographySchema,
  bedroomBand: z.enum(["one bed", "two bed", "three bed", "four or more bed"]).optional(),
  propertyType: z.enum(["detached", "semidetached", "terraced", "flat maisonette"]).optional(),
  measure: z.literal("rental_price"),
  valueGbp: z.number().finite().positive(),
  unit: z.literal("GBP/month"),
  sourcePeriod: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
}).superRefine((record, context) => {
  if (record.bedroomBand && record.propertyType) {
    context.addIssue({ code: "custom", path: ["propertyType"], message: "ONS bedroom and property-type measures are separate dimensions, not cross-tabs" });
  }
  if (record.provenance.sourcePeriod !== record.sourcePeriod) {
    context.addIssue({ code: "custom", path: ["sourcePeriod"], message: "Rent month must match provenance source period" });
  }
});

export const coicopExpenditureRecordSchema = z.object({
  ...recordBase,
  category: z.literal("coicop_expenditure"),
  geography: geographySchema.optional(),
  coicopCode: z.string().min(1),
  coicopLabel: z.string().min(1),
  profile: z.string().min(1),
  weeklyGbp: z.number().finite().nonnegative(),
  sourcePeriod: z.string().min(1),
  unit: z.literal("GBP/household/week"),
});

export const waterBillingRegimeSchema = z.enum(["metered_volumetric", "rateable_value", "assessed_household", "council_tax_band"]);
export const waterServiceComponentSchema = z.enum(["clean_water", "wastewater", "surface_water_drainage", "highway_drainage", "combined"]);
export const waterTariffComponentSchema = z.enum(["standing_charge", "fixed_charge", "volumetric_charge", "rateable_value_multiplier", "first_bedroom_charge", "additional_bedroom_charge", "council_tax_band_charge"]);
export const waterChargeUnitSchema = z.enum(["GBP/year", "GBP/m3", "pence/m3", "GBP/GBP-rateable-value/year", "GBP/additional-bedroom/year"]);

export const waterTariffRecordSchema = z.strictObject({
  ...recordBase,
  category: z.literal("water_tariff"),
  geography: geographySchema,
  providerId: z.string().min(1),
  regulatedCompany: z.string().min(1),
  billingRegime: waterBillingRegimeSchema,
  serviceComponent: waterServiceComponentSchema,
  tariffComponent: waterTariffComponentSchema,
  // Variant and band distinguish legitimate alternatives sharing a component.
  variant: z.string().min(1),
  aggregationRole: z.enum(["component", "alternative_total"]),
  applicability: z.strictObject({ sourceScope: z.string().min(1), conditions: z.array(z.string().min(1)).min(1) }),
  amount: z.number().finite().positive(),
  unit: waterChargeUnitSchema,
  councilTaxBand: z.enum(["A", "B", "C", "D", "E", "F", "G", "H"]).optional(),
  effectiveFrom: z.iso.date(),
  effectiveTo: z.iso.date(),
}).superRefine((r, ctx) => {
  const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
  if (r.effectiveFrom > r.effectiveTo) issue("effectiveTo", "Reversed effective dates");
  if (r.provenance.effectiveFrom !== r.effectiveFrom || r.provenance.effectiveTo !== r.effectiveTo) issue("effectiveFrom", "Water period must match provenance");
  if ((r.billingRegime === "council_tax_band") !== Boolean(r.councilTaxBand) || (r.billingRegime === "council_tax_band") !== (r.tariffComponent === "council_tax_band_charge")) issue("councilTaxBand", "Council tax band and tariff component must match the band-based regime");
  if ((r.serviceComponent === "combined") !== (r.aggregationRole === "alternative_total")) issue("aggregationRole", "Combined published total is an alternative, never additive");
  const units: Record<string, string[]> = {
    standing_charge: ["GBP/year"], fixed_charge: ["GBP/year"], volumetric_charge: ["GBP/m3", "pence/m3"],
    rateable_value_multiplier: ["GBP/GBP-rateable-value/year"], first_bedroom_charge: ["GBP/year"],
    additional_bedroom_charge: ["GBP/additional-bedroom/year"], council_tax_band_charge: ["GBP/year"],
  };
  if (!units[r.tariffComponent].includes(r.unit)) issue("unit", "Unit must preserve the source tariff component basis");
  if (r.tariffComponent === "volumetric_charge" && r.billingRegime !== "metered_volumetric") issue("billingRegime", "Volumetric charge requires metered regime");
  if (r.tariffComponent === "rateable_value_multiplier" && r.billingRegime !== "rateable_value") issue("billingRegime", "RV multiplier requires rateable-value regime");
  if (["first_bedroom_charge", "additional_bedroom_charge"].includes(r.tariffComponent) && r.billingRegime !== "assessed_household") issue("billingRegime", "Assessed bedroom charge requires assessed regime");
});

export type WaterTariffRecord = z.infer<typeof waterTariffRecordSchema>;

export const transportFareRecordSchema = z.object({
  ...recordBase,
  category: z.literal("transport_fare"),
  publishedGeography: geographySchema,
  authorityOrOperator: z.string().min(1),
  mode: z.string().min(1),
  productName: z.string().min(1),
  fareType: z.enum(["single", "return", "daily_cap", "weekly_cap", "monthly", "season", "multi_day"]),
  fareGbp: z.number().finite().nonnegative(),
  passengerType: z.string().min(1),
  paymentMethod: z.string().min(1).optional(),
  zonesOrArea: z.string().min(1).optional(),
  effectiveFrom: z.iso.date(),
  effectiveTo: z.iso.date().optional(),
});

export const incomeTaxRuleRecordSchema = z.object({
  ...recordBase,
  category: z.literal("income_tax_rule"),
  jurisdiction: jurisdictionSchema,
  taxYear: z.string().regex(/^\d{4}\/\d{2}$/),
  ruleType: z.enum(["personal_allowance", "personal_allowance_taper", "personal_allowance_zero_point", "tax_band"]),
  bandName: z.string().min(1).optional(),
  thresholdBasis: z.enum(["allowance_amount", "adjusted_net_income", "published_income_with_standard_allowance"]).optional(),
  lowerInclusive: z.boolean().optional(),
  upperInclusive: z.boolean().optional(),
  threshold: z.number().finite().nonnegative().optional(),
  lowerBound: z.number().finite().nonnegative().optional(),
  upperBound: z.number().finite().nonnegative().optional(),
  rate: z.number().finite().nonnegative().optional(),
  effectiveFrom: z.iso.date(),
  effectiveTo: z.iso.date(),
}).superRefine((record, context) => {
  if (record.effectiveFrom > record.effectiveTo) {
    context.addIssue({ code: "custom", path: ["effectiveTo"], message: "effectiveTo must not precede effectiveFrom" });
  }
  if (record.lowerBound !== undefined && record.upperBound !== undefined && record.lowerBound > record.upperBound) {
    context.addIssue({ code: "custom", path: ["upperBound"], message: "Upper bound must not precede lower bound" });
  }
});

export const nationalInsuranceRuleRecordSchema = z.object({
  ...recordBase,
  category: z.literal("national_insurance_rule"),
  taxYear: z.string().regex(/^\d{4}\/\d{2}$/),
  class: z.literal("Class 1"),
  categoryLetter: z.string().min(1),
  payPeriod: z.enum(["weekly", "monthly", "annual"]),
  bandName: z.enum(["LEL_TO_PT", "PT_TO_UEL", "ABOVE_UEL"]).optional(),
  lowerInclusive: z.boolean().optional(),
  upperInclusive: z.boolean().optional(),
  lowerThreshold: z.number().finite().nonnegative(),
  upperThreshold: z.number().finite().nonnegative().optional(),
  employeeRate: z.number().finite().nonnegative(),
  effectiveFrom: z.iso.date(),
  effectiveTo: z.iso.date(),
}).superRefine((record, context) => {
  if (record.effectiveFrom > record.effectiveTo) {
    context.addIssue({ code: "custom", path: ["effectiveTo"], message: "effectiveTo must not precede effectiveFrom" });
  }
  if (record.lowerThreshold !== undefined && record.upperThreshold !== undefined && record.lowerThreshold > record.upperThreshold) {
    context.addIssue({ code: "custom", path: ["upperThreshold"], message: "Upper bound must not precede lower bound" });
  }
});

export const councilTaxBandSchema = z.enum(["A", "B", "C", "D", "E", "F", "G", "H"]);

export const councilTaxRecordSchema = z.object({
  ...recordBase,
  category: z.literal("council_tax"),
  geography: geographySchema,
  nation: z.enum(["England", "Scotland"]),
  taxYear: z.string().regex(/^\d{4}\/\d{2}$/),
  band: councilTaxBandSchema,
  annualChargeGbp: z.number().finite().positive().refine((value) => Number(value.toFixed(2)) === value, "Annual charge must use two-decimal monetary precision"),
  unit: z.literal("GBP/year"),
  chargeScope: z.enum(["AREA_TWO_ADULTS_INCLUDING_PRECEPTS", "COUNCIL_TAX_EXCLUDING_WATER_SEWERAGE"]),
  effectiveFrom: z.iso.date(),
  effectiveTo: z.iso.date(),
  qa: z.object({
    rawSourceValue: z.string().regex(/^\d+(\.\d+)?$/),
    displayedAnnualGbp: z.string().regex(/^\d+\.\d{2}$/),
    sourceTable: z.string().min(1),
    sourceCell: z.string().regex(/^[A-Z]+[1-9]\d*$/),
    sourceNumberFormat: z.string().min(1),
    sourceAuthorityName: z.string().min(1),
  }),
}).superRefine((record, context) => {
  if (record.effectiveFrom > record.effectiveTo) context.addIssue({ code: "custom", path: ["effectiveTo"], message: "effectiveTo must not precede effectiveFrom" });
  if (record.annualChargeGbp !== Number(record.qa.displayedAnnualGbp)) context.addIssue({ code: "custom", path: ["annualChargeGbp"], message: "Annual charge must equal the source displayed GBP value" });
  if (!Number.isFinite(Number(record.qa.rawSourceValue)) || Number(record.qa.rawSourceValue) <= 0) context.addIssue({ code: "custom", path: ["qa", "rawSourceValue"], message: "Raw source value must be finite and positive" });
  if (record.nation === "England" && !/^E\d{8}$/.test(record.geography.official.code ?? "")) context.addIssue({ code: "custom", path: ["geography", "official", "code"], message: "England requires the official authority code" });
  const scope = record.nation === "England" ? "AREA_TWO_ADULTS_INCLUDING_PRECEPTS" : "COUNCIL_TAX_EXCLUDING_WATER_SEWERAGE";
  if (record.chargeScope !== scope) context.addIssue({ code: "custom", path: ["chargeScope"], message: "Source charge regime must match nation" });
});

export type CouncilTaxRecord = z.infer<typeof councilTaxRecordSchema>;

// Energy evidence has source geography only. City applicability belongs to a future reviewed layer.
const energyGeographySchema = z.strictObject({
  official: z.strictObject({ geographyType: z.string().min(1), name: z.string().min(1), code: z.string().min(1).optional(), sourceId: z.string().min(1) }),
});
export const energyConsumptionRecordSchema = z.strictObject({
  ...recordBase, category: z.literal("energy_consumption"),
  valueType: z.literal("OBSERVED_DATA"), releaseStatus: z.literal("REFERENCE_ONLY"),
  geography: energyGeographySchema, sourceYear: z.number().int().min(1900).max(2100),
  sourceNationGroup: z.enum(["England and Wales", "Scotland"]),
  propertyType: z.string().min(1), propertyAge: z.string().min(1), bedroomBand: z.string().min(1),
  gasPresent: z.enum(["Yes", "No"]), electricityType: z.enum(["Standard", "E7"]),
  fuel: z.enum(["gas", "electricity"]), statistic: z.enum(["mean", "lower_quartile", "median", "upper_quartile"]),
  annualKwh: z.number().finite().positive(), sampleCount: z.number().int().nonnegative().optional(), unit: z.literal("kWh/year"),
}).superRefine((r, ctx) => {
  if (r.fuel === "gas" && r.gasPresent === "No") ctx.addIssue({ code: "custom", path: ["fuel"], message: "No observed gas consumption without a matched gas meter" });
  if (r.provenance.sourcePeriod !== String(r.sourceYear)) ctx.addIssue({ code: "custom", path: ["sourceYear"], message: "Source year must match provenance" });
});
export const energyPriceRecordSchema = z.strictObject({
  ...recordBase, category: z.literal("energy_price"), valueType: z.literal("OBSERVED_DATA"),
  geography: energyGeographySchema, fuel: z.enum(["gas", "electricity"]),
  paymentMethod: z.enum(["Direct Debit", "standard credit", "prepayment meter"]),
  electricityTariffType: z.enum(["single rate", "multi-rate"]).optional(),
  unitRateGbpPerKwh: z.number().finite().positive(), standingChargeGbpPerDay: z.number().finite().positive(),
  rateBasis: z.literal("published_cap_rate"), effectiveFrom: z.iso.date(), effectiveTo: z.iso.date(),
}).superRefine((r, ctx) => {
  if (r.effectiveFrom > r.effectiveTo) ctx.addIssue({ code: "custom", path: ["effectiveTo"], message: "Reversed effective dates" });
  if ((r.fuel === "gas" && r.electricityTariffType !== undefined) || (r.fuel === "electricity" && !r.electricityTariffType)) ctx.addIssue({ code: "custom", path: ["electricityTariffType"], message: "Electricity requires its source tariff type; gas has no electricity tariff type" });
  if (r.provenance.effectiveFrom !== r.effectiveFrom || r.provenance.effectiveTo !== r.effectiveTo) ctx.addIssue({ code: "custom", path: ["effectiveFrom"], message: "Effective period must match provenance" });
});

export const auditRecordSchema = z.discriminatedUnion("category", [
  rentRecordSchema,
  energyConsumptionRecordSchema,
  energyPriceRecordSchema,
  coicopExpenditureRecordSchema,
  waterTariffRecordSchema,
  transportFareRecordSchema,
  incomeTaxRuleRecordSchema,
  nationalInsuranceRuleRecordSchema,
  councilTaxRecordSchema,
]);

export type AuditRecord = z.infer<typeof auditRecordSchema>;
