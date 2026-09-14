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
  valueGbp: z.number().finite().nonnegative(),
  unit: z.literal("GBP/month"),
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

export const waterTariffRecordSchema = z.object({
  ...recordBase,
  category: z.literal("water_tariff"),
  geography: geographySchema,
  providerId: z.string().min(1),
  billingRegime: z.enum(["metered_volumetric", "rateable_value", "assessed_household", "council_tax_band"]),
  serviceComponent: z.enum(["clean_water", "wastewater", "surface_water_drainage", "highway_drainage", "combined"]),
  amount: z.number().finite().nonnegative().optional(),
  unit: z.string().min(1),
  councilTaxBand: z.enum(["A", "B", "C", "D", "E", "F", "G", "H"]).optional(),
});

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

export const auditRecordSchema = z.discriminatedUnion("category", [
  rentRecordSchema,
  coicopExpenditureRecordSchema,
  waterTariffRecordSchema,
  transportFareRecordSchema,
  incomeTaxRuleRecordSchema,
  nationalInsuranceRuleRecordSchema,
  councilTaxRecordSchema,
]);

export type AuditRecord = z.infer<typeof auditRecordSchema>;
