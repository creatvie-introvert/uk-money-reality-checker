import { z } from "zod";

const snapshotBase = {
  snapshotId: z.string().min(1),
  sourceId: z.string().min(1),
  retrievedAt: z.iso.datetime(),
  sourceFormat: z.string().min(1),
};

export const snapshotMetadataSchema = z.discriminatedUnion("retention", [
  z.object({
    ...snapshotBase,
    retention: z.literal("RETAINED"),
    localReference: z.string().min(1),
    checksum: z.string().min(1),
  }),
  z.object({
    ...snapshotBase,
    retention: z.literal("METADATA_ONLY"),
    sourceUrl: z.string().url().optional(),
    sourceReference: z.string().min(1).optional(),
    checksum: z.string().min(1).optional(),
    nonRetentionReason: z.string().min(1),
  }).refine((snapshot) => Boolean(snapshot.sourceUrl || snapshot.sourceReference), {
    message: "Metadata-only snapshots require a source URL or reference",
    path: ["sourceReference"],
  }),
]);

export type SnapshotMetadata = z.infer<typeof snapshotMetadataSchema>;
