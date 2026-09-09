import { z } from "zod";

export const sourceAccessMechanismSchema = z.enum(["API", "CSV", "JSON", "XLSX", "ODS", "HTML", "PDF"]);

export const sourceSuitabilitySchema = z.enum(["PRIMARY_CONTROLLED_IMPORT", "REFERENCE_INPUT", "OBSERVED_SOURCE_INPUT"]);

export const sourceCatalogEntrySchema = z.object({
  sourceId: z.string().min(1),
  category: z.string().min(1),
  organisation: z.string().min(1),
  publicationTitle: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  sourceReference: z.string().min(1).optional(),
  authority: z.literal("PRIMARY"),
  accessMechanisms: z.array(sourceAccessMechanismSchema).min(1).optional(),
  suitability: sourceSuitabilitySchema.optional(),
  publicationDate: z.iso.date().optional(),
  effectiveFrom: z.iso.date().optional(),
  effectiveTo: z.iso.date().optional(),
  sourcePeriod: z.string().min(1).optional(),
  refreshCadence: z.string().min(1).optional(),
  licenceReference: z.string().min(1).optional(),
  sourceStatus: z.string().min(1).optional(),
  unresolvedMetadata: z.array(z.string().min(1)).default([]),
  useNote: z.string().min(1).optional(),
  rawSnapshotPolicy: z.enum(["RETAIN", "METADATA_ONLY", "PENDING_REVIEW"]),
}).superRefine((source, context) => {
  if (source.effectiveFrom && source.effectiveTo && source.effectiveFrom > source.effectiveTo) {
    context.addIssue({ code: "custom", path: ["effectiveTo"], message: "effectiveTo must not precede effectiveFrom" });
  }
  if ((!source.accessMechanisms || !source.sourceStatus) && source.unresolvedMetadata.length === 0) {
    context.addIssue({ code: "custom", path: ["unresolvedMetadata"], message: "Explain unresolved source access or governance metadata" });
  }
});

export const sourceCatalogSchema = z.array(sourceCatalogEntrySchema).superRefine((sources, context) => {
  const ids = new Set<string>();
  sources.forEach((source, index) => {
    if (ids.has(source.sourceId)) {
      context.addIssue({ code: "custom", path: [index, "sourceId"], message: "Source catalogue IDs must be unique" });
    }
    ids.add(source.sourceId);
  });
});

export type SourceCatalogEntry = z.infer<typeof sourceCatalogEntrySchema>;
