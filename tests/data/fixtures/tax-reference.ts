import { z } from "zod";

import { incomeTaxRuleRecordSchema, jurisdictionSchema } from "@/data";
import type { IngestionAdapter } from "@/data/ingestion";

// Synthetic JSON shape and values: architecture fixture, not an HMRC feed or tax dataset.
const rowSchema = z.object({
  id: z.string().min(1),
  jurisdiction: jurisdictionSchema,
  taxYear: z.string().regex(/^\d{4}\/\d{2}$/),
  threshold: z.number().finite().nonnegative(),
  effectiveFrom: z.iso.date(),
  effectiveTo: z.iso.date(),
});

export const taxReferenceAdapter: IngestionAdapter<z.infer<typeof rowSchema>, z.infer<typeof incomeTaxRuleRecordSchema>> = {
  id: "test-tax-reference",
  version: "1.0.0",
  sourceId: "TEST-TAX",
  category: "income_tax_rule",
  kind: "SOURCE",
  acceptedSourceFormats: ["JSON"],
  rowSchema,
  outputSchema: incomeTaxRuleRecordSchema,
  parsePayload: (payload) => {
    if (typeof payload !== "string") throw new Error("Expected a JSON string");
    const parsed: unknown = JSON.parse(payload);
    if (!Array.isArray(parsed)) throw new Error("Expected an array of tax reference rows");
    return parsed;
  },
  sourceIdentifier: (row) => row.id,
  normalize: (row, { source, snapshot, importedAt, importVersion, releaseStatus }) => ({
    record: {
      recordId: row.id,
      dataset: "test-tax-reference",
      category: "income_tax_rule",
      valueType: "OBSERVED_DATA",
      releaseStatus,
      jurisdiction: row.jurisdiction,
      taxYear: row.taxYear,
      ruleType: "personal_allowance",
      threshold: row.threshold,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
      provenance: {
        sourceId: source.sourceId,
        organisation: source.organisation,
        publicationTitle: source.publicationTitle,
        sourceFormat: snapshot.sourceFormat,
        snapshotId: snapshot.snapshotId,
        snapshotChecksum: snapshot.checksum,
        retrievedAt: snapshot.retrievedAt,
        importedAt,
        importVersion,
        parserVersion: "1.0.0",
      },
    },
  }),
};

export const taxReferenceRow = {
  id: "TEST-ALLOWANCE",
  jurisdiction: "rUK",
  taxYear: "2026/27",
  threshold: 100,
  effectiveFrom: "2026-04-06",
  effectiveTo: "2027-04-05",
};
