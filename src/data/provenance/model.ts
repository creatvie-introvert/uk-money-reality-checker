import { z } from "zod";

export const provenanceSchema = z.object({
  sourceId: z.string().min(1),
  organisation: z.string().min(1),
  publicationTitle: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  sourceReference: z.string().min(1).optional(),
  sourceFormat: z.string().min(1),
  publicationDate: z.iso.date().optional(),
  sourcePeriod: z.string().min(1).optional(),
  effectiveFrom: z.iso.date().optional(),
  effectiveTo: z.iso.date().optional(),
  retrievedAt: z.iso.datetime(),
  importedAt: z.iso.datetime(),
  ukmrReleaseDate: z.iso.date().optional(),
  snapshotId: z.string().min(1),
  snapshotChecksum: z.string().min(1).optional(),
  parserVersion: z.string().min(1).optional(),
  importVersion: z.string().min(1).optional(),
  licenceReference: z.string().min(1).optional(),
  methodologyNotes: z.string().min(1).optional(),
  limitations: z.array(z.string().min(1)).default([]),
}).superRefine((value, context) => {
  if (value.effectiveFrom && value.effectiveTo && value.effectiveFrom > value.effectiveTo) {
    context.addIssue({ code: "custom", path: ["effectiveTo"], message: "effectiveTo must not precede effectiveFrom" });
  }
});

export type Provenance = z.infer<typeof provenanceSchema>;