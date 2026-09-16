import { z } from "zod";
import { jurisdictionSchema } from "./enums";
import { recordBase } from "./record-base";
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

