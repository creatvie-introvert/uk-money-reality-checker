import { z } from "zod";

export const sourceAccessMechanismSchema = z.enum(["API", "CSV", "JSON", "XLSX", "ODS", "HTML", "PDF"]);

export const sourceCatalogEntrySchema = z.object({
  sourceId: z.string().min(1),
  category: z.string().min(1),
  organisation: z.string().min(1),
  publicationTitle: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  authority: z.literal("PRIMARY"),
  accessMechanisms: z.array(sourceAccessMechanismSchema).min(1),
  publicationDate: z.iso.date().optional(),
  sourcePeriod: z.string().min(1).optional(),
  refreshCadence: z.string().min(1).optional(),
  licenceReference: z.string().min(1).optional(),
  sourceStatus: z.string().min(1),
  useNote: z.string().min(1).optional(),
  rawSnapshotPolicy: z.enum(["RETAIN", "METADATA_ONLY", "PENDING_REVIEW"]),
});

export type SourceCatalogEntry = z.infer<typeof sourceCatalogEntrySchema>;