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
  ruleType: z.enum(["personal_allowance", "personal_allowance_taper", "tax_band"]),
  bandName: z.string().min(1).optional(),
  threshold: z.number().finite().nonnegative().optional(),
  lowerBound: z.number().finite().nonnegative().optional(),
  upperBound: z.number().finite().nonnegative().optional(),
  rate: z.number().finite().nonnegative().optional(),
  effectiveFrom: z.iso.date(),
  effectiveTo: z.iso.date(),
});

export const nationalInsuranceRuleRecordSchema = z.object({
  ...recordBase,
  category: z.literal("national_insurance_rule"),
  taxYear: z.string().regex(/^\d{4}\/\d{2}$/),
  class: z.literal("Class 1"),
  categoryLetter: z.string().min(1),
  payPeriod: z.enum(["weekly", "monthly", "annual"]),
  lowerThreshold: z.number().finite().nonnegative(),
  upperThreshold: z.number().finite().nonnegative().optional(),
  employeeRate: z.number().finite().nonnegative(),
  effectiveFrom: z.iso.date(),
  effectiveTo: z.iso.date(),
});

export const auditRecordSchema = z.discriminatedUnion("category", [
  rentRecordSchema,
  coicopExpenditureRecordSchema,
  waterTariffRecordSchema,
  transportFareRecordSchema,
  incomeTaxRuleRecordSchema,
  nationalInsuranceRuleRecordSchema,
]);

export type AuditRecord = z.infer<typeof auditRecordSchema>;
