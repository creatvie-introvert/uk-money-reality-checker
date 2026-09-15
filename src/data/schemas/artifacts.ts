import { z } from "zod";

import { auditRecordSchema } from "./records";

const manifestSchema = z.object({
  releaseId: z.string().min(1),
  schemaVersion: z.string().min(1),
  generatedAt: z.iso.datetime(),
  sourceSnapshotIds: z.array(z.string().min(1)).superRefine((snapshotIds, context) => {
    if (new Set(snapshotIds).size !== snapshotIds.length) {
      context.addIssue({ code: "custom", message: "Manifest sourceSnapshotIds must be unique" });
    }
  }),
  recordCount: z.number().int().nonnegative(),
  checksum: z.string().min(1).optional(),
});

const validateArtifactManifest = (manifest: z.infer<typeof manifestSchema>, records: z.infer<typeof auditRecordSchema>[], context: z.RefinementCtx) => {
  if (manifest.recordCount !== records.length) {
    context.addIssue({ code: "custom", path: ["manifest", "recordCount"], message: "Manifest recordCount must equal records.length" });
  }

  const referencedSnapshotIds = new Set(records.map((record) => record.provenance.snapshotId));
  const manifestSnapshotIds = new Set(manifest.sourceSnapshotIds);
  if (referencedSnapshotIds.size !== manifestSnapshotIds.size || [...referencedSnapshotIds].some((snapshotId) => !manifestSnapshotIds.has(snapshotId))) {
    context.addIssue({ code: "custom", path: ["manifest", "sourceSnapshotIds"], message: "Manifest sourceSnapshotIds must match record provenance snapshot IDs" });
  }
};

export const auditArtifactSchema = z.object({
  kind: z.literal("AUDIT"),
  manifest: manifestSchema,
  records: z.array(auditRecordSchema),
}).superRefine((artifact, context) => {
  validateArtifactManifest(artifact.manifest, artifact.records, context);
});

export const directEvidenceReleaseSchema = z.object({
  kind: z.literal("DIRECT_EVIDENCE_RELEASE"),
  manifest: manifestSchema,
  records: z.array(auditRecordSchema).superRefine((records, context) => {
    records.forEach((record, index) => {
      if (record.releaseStatus !== "RELEASE_READY") {
        context.addIssue({ code: "custom", path: [index, "releaseStatus"], message: "Direct evidence releases require RELEASE_READY records" });
      }
      if (record.valueType === "USER_ENTERED" || record.valueType === "MODELLED_ESTIMATE") {
        context.addIssue({ code: "custom", path: [index, "valueType"], message: "Direct evidence releases cannot contain USER_ENTERED or MODELLED_ESTIMATE records" });
      }
    });
  }),
}).superRefine((artifact, context) => {
  validateArtifactManifest(artifact.manifest, artifact.records, context);
});

export const referenceArtifactSchema = z.object({
  kind: z.literal("REFERENCE_ARTIFACT"),
  manifest: manifestSchema,
  records: z.array(auditRecordSchema).superRefine((records, context) => {
    records.forEach((record, index) => {
      if (record.releaseStatus !== "REFERENCE_ONLY") {
        context.addIssue({ code: "custom", path: [index, "releaseStatus"], message: "Reference artifacts require REFERENCE_ONLY records" });
      }
      if (record.valueType === "USER_ENTERED") {
        context.addIssue({ code: "custom", path: [index, "valueType"], message: "Reference artifacts cannot contain USER_ENTERED records" });
      }
    });
  }),
}).superRefine((artifact, context) => {
  validateArtifactManifest(artifact.manifest, artifact.records, context);
});

export const artifactSchema = z.discriminatedUnion("kind", [auditArtifactSchema, directEvidenceReleaseSchema, referenceArtifactSchema]);

export type AuditArtifact = z.infer<typeof auditArtifactSchema>;
export type DirectEvidenceRelease = z.infer<typeof directEvidenceReleaseSchema>;
export type ReferenceArtifact = z.infer<typeof referenceArtifactSchema>;
