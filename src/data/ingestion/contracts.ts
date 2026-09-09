import { z } from "zod";

import type { SourceCatalogEntry } from "../provenance/source-catalog";
import { releaseStatusSchema } from "../schemas/enums";
import type { AuditRecord } from "../schemas/records";
import type { IngestionDiagnostic } from "./diagnostics";
import { snapshotMetadataSchema } from "./snapshot";

export const importedPayloadSchema = z.object({
  snapshot: snapshotMetadataSchema,
  importedAt: z.iso.datetime(),
  importVersion: z.string().min(1),
  releaseStatus: releaseStatusSchema,
  payload: z.unknown(),
});

export type ImportedPayload = z.infer<typeof importedPayloadSchema>;
export type AdapterContext = Omit<ImportedPayload, "payload"> & { source: SourceCatalogEntry };

/** One source row produces one record or an explicit rejection in this foundation. */
export interface IngestionAdapter<Row, Record extends AuditRecord> {
  id: string;
  version: string;
  sourceId: string;
  category: Record["category"];
  kind: "SOURCE" | "MODEL";
  acceptedSourceFormats: readonly string[];
  rowSchema: z.ZodType<Row>;
  outputSchema: z.ZodType<Record>;
  parsePayload: (payload: unknown) => unknown[];
  sourceIdentifier: (row: Row) => string;
  normalize: (row: Row, context: AdapterContext) =>
    | { record: unknown }
    | { diagnostics: IngestionDiagnostic[] };
}

export type RowOutcome<Record extends AuditRecord> =
  | { rowIndex: number; raw: unknown; status: "ACCEPTED"; record: Record }
  | { rowIndex: number; raw: unknown; status: "REJECTED"; diagnostics: IngestionDiagnostic[] };

export interface IngestionResult<Record extends AuditRecord> {
  adapter: { id: string; version: string };
  sourceId: string;
  snapshotId: string;
  status: "SUCCESS" | "FAILED";
  records: Record[];
  rows: RowOutcome<Record>[];
  diagnostics: IngestionDiagnostic[];
  counts: { inputRows: number | null; acceptedRows: number; rejectedRows: number };
}
