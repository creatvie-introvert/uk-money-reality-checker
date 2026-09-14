import { z } from "zod";

import type { AdapterContext, IngestionAdapter } from "../contracts";
import { snapshotMetadataSchema } from "../snapshot";
import { incomeTaxRuleRecordSchema, nationalInsuranceRuleRecordSchema } from "../../schemas/records";

export const defaultMethodologyNotes = "UKMR-controlled transcription of official reference values; no liability calculation or threshold derivation.";

export const extractSchema = z.strictObject({
  extractKind: z.literal("UKMR_CONTROLLED_EXTRACT"),
  extractVersion: z.literal("1.0.0"),
  description: z.string().min(1),
  snapshot: snapshotMetadataSchema,
  importedAt: z.iso.datetime(),
  importVersion: z.literal("2026-27-v1"),
  releaseStatus: z.literal("REFERENCE_ONLY"),
  limitations: z.array(z.string().min(1)),
  methodologyNotes: z.string().min(1).optional(),
  // Rows are deliberately unknown here: the framework must account for every rejection.
  rows: z.array(z.unknown()),
});

const dates = {
  taxYear: z.literal("2026/27"),
  effectiveFrom: z.literal("2026-04-06"),
  effectiveTo: z.literal("2027-04-05"),
};
const amount = z.number().finite().nonnegative();
const rate = amount.max(1);
const taxRowSchema = z.strictObject({
  ...dates, id: z.string().min(1),
  jurisdiction: z.enum(["rUK", "Scotland"]),
  ruleType: z.enum(["personal_allowance", "personal_allowance_taper", "personal_allowance_zero_point", "tax_band"]),
  bandName: z.string().min(1),
  thresholdBasis: z.enum(["allowance_amount", "adjusted_net_income", "published_income_with_standard_allowance"]),
  threshold: amount.optional(), lowerBound: amount.optional(), upperBound: amount.optional(),
  lowerInclusive: z.boolean().optional(), upperInclusive: z.boolean().optional(), rate: rate.optional(),
});
const niRowSchema = z.strictObject({
  ...dates, id: z.string().min(1), class: z.literal("Class 1"), categoryLetter: z.literal("A"),
  payPeriod: z.enum(["weekly", "monthly", "annual"]),
  bandName: z.enum(["LEL_TO_PT", "PT_TO_UEL", "ABOVE_UEL"]),
  lowerThreshold: amount, upperThreshold: amount.optional(), employeeRate: rate,
  lowerInclusive: z.boolean(), upperInclusive: z.boolean().optional(),
});

function parsePayload(payload: unknown): unknown[] {
  if (typeof payload !== "string") throw new Error("Expected a UKMR-controlled extract JSON string");
  return extractSchema.parse(JSON.parse(payload)).rows;
}

function base(context: AdapterContext, id: string, dataset: string) {
  const { source, snapshot, importedAt, importVersion } = context;
  return {
    recordId: `${source.sourceId}:${id}`, dataset,
    valueType: "OBSERVED_DATA", releaseStatus: "REFERENCE_ONLY",
    provenance: {
      sourceId: source.sourceId, organisation: source.organisation,
      publicationTitle: source.publicationTitle,
      sourceUrl: snapshot.retention === "METADATA_ONLY" ? snapshot.sourceUrl : source.sourceUrl,
      sourceReference: snapshot.retention === "METADATA_ONLY" ? snapshot.sourceReference : source.sourceReference,
      sourceFormat: snapshot.sourceFormat, sourcePeriod: "2026/27",
      effectiveFrom: "2026-04-06", effectiveTo: "2027-04-05",
      snapshotId: snapshot.snapshotId, snapshotChecksum: snapshot.checksum,
      retrievedAt: snapshot.retrievedAt, importedAt, importVersion, parserVersion: "1.0.0",
      licenceReference: source.licenceReference,
      methodologyNotes: defaultMethodologyNotes,
    },
  };
}

type Tax = z.infer<typeof incomeTaxRuleRecordSchema>;
type NI = z.infer<typeof nationalInsuranceRuleRecordSchema>;

function taxAdapter(sourceId: "SRC-011" | "SRC-013"): IngestionAdapter<z.infer<typeof taxRowSchema>, Tax> {
  return {
    id: sourceId === "SRC-011" ? "hmrc-income-tax-2026-27" : "scottish-income-tax-2026-27",
    version: "1.0.0", sourceId, category: "income_tax_rule", kind: "SOURCE",
    acceptedSourceFormats: ["HTML"], rowSchema: taxRowSchema, outputSchema: incomeTaxRuleRecordSchema,
    parsePayload, sourceIdentifier: (row) => row.id,
    normalize: (row, context) => {
      if (context.releaseStatus !== "REFERENCE_ONLY" ||
          (sourceId === "SRC-013" && (row.jurisdiction !== "Scotland" || row.ruleType !== "tax_band")) ||
          (sourceId === "SRC-011" && row.jurisdiction === "Scotland" && row.ruleType === "tax_band")) {
        return { diagnostics: [{ code: "SOURCE_REVIEW_REQUIRED", message: "Tax source/jurisdiction/rule or REFERENCE_ONLY scope mismatch" }] };
      }
      const { id, ...fields } = row;
      return { record: { ...base(context, id, "income-tax-2026-27"), category: "income_tax_rule", ...fields } };
    },
  };
}

export const hmrcIncomeTaxAdapter = taxAdapter("SRC-011");
export const scottishIncomeTaxAdapter = taxAdapter("SRC-013");
export const employeeNIAdapter: IngestionAdapter<z.infer<typeof niRowSchema>, NI> = {
  id: "hmrc-employee-class1-a-2026-27", version: "1.0.0", sourceId: "SRC-012",
  category: "national_insurance_rule", kind: "SOURCE", acceptedSourceFormats: ["HTML"],
  rowSchema: niRowSchema, outputSchema: nationalInsuranceRuleRecordSchema,
  parsePayload, sourceIdentifier: (row) => row.id,
  normalize: (row, context) => {
    if (context.releaseStatus !== "REFERENCE_ONLY") {
      return { diagnostics: [{ code: "SOURCE_REVIEW_REQUIRED", message: "NI production imports require REFERENCE_ONLY" }] };
    }
    const { id, ...fields } = row;
    return { record: { ...base(context, id, "employee-ni-category-a-2026-27"), category: "national_insurance_rule", ...fields } };
  },
};
