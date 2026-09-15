import { z } from "zod";

import { sourceCatalogEntrySchema, type SourceCatalogEntry } from "../provenance/source-catalog";
import { auditRecordSchema, type AuditRecord } from "../schemas/records";
import { importedPayloadSchema, type ImportedPayload, type IngestionAdapter, type IngestionResult } from "./contracts";
import { ingestionDiagnosticSchema, type IngestionDiagnostic } from "./diagnostics";

function validationDiagnostics(error: z.ZodError, rowIndex: number): IngestionDiagnostic[] {
  return error.issues.map((issue) => ({
    code: issue.code === "invalid_type" && issue.input === undefined
      ? "MISSING_REQUIRED_SOURCE_FIELD"
      : issue.code === "invalid_format" && (issue.format === "date" || issue.format === "datetime")
        ? "INVALID_DATE"
        : (issue.code === "invalid_type" && issue.expected === "number") ||
            ((issue.code === "too_small" || issue.code === "too_big") && issue.origin === "number")
          ? "INVALID_NUMERIC_VALUE" : "UNSUPPORTED_SOURCE_VALUE",
    rowIndex,
    field: issue.path.map(String).join("."),
    message: issue.message,
  }));
}

/** Offline normalization only. This function neither fetches nor retains source content. */
export function runIngestion<Row, Record extends AuditRecord>(
  adapter: IngestionAdapter<Row, Record>,
  sourceInput: SourceCatalogEntry,
  input: ImportedPayload,
): IngestionResult<Record> {
  const result: IngestionResult<Record> = {
    adapter: { id: adapter.id, version: adapter.version },
    sourceId: adapter.sourceId,
    snapshotId: input.snapshot.snapshotId,
    status: "FAILED", records: [], rows: [], diagnostics: [],
    counts: { inputRows: null, acceptedRows: 0, rejectedRows: 0 },
  };
  const parsedSource = sourceCatalogEntrySchema.safeParse(sourceInput);
  const parsedInput = importedPayloadSchema.safeParse(input);
  if (!parsedSource.success || !parsedInput.success) {
    result.diagnostics.push({ code: "SOURCE_PARSE_FAILURE", message: "Invalid source definition or import metadata" });
    return result;
  }
  const source = parsedSource.data;
  const { payload, ...context } = parsedInput.data;
  if (source.sourceId !== adapter.sourceId || context.snapshot.sourceId !== adapter.sourceId ||
      !adapter.acceptedSourceFormats.includes(context.snapshot.sourceFormat)) {
    result.diagnostics.push({ code: "UNSUPPORTED_SOURCE_VALUE", message: "Adapter source or source format does not match the input snapshot" });
    return result;
  }
  if (!source.sourceStatus || !["POPULATED", "MODELLED", "POPULATED_DEV", "POPULATED_PARTIAL"].includes(source.sourceStatus)) {
    result.diagnostics.push({ code: "SOURCE_REVIEW_REQUIRED", message: "Source governance status requires review before ingestion" });
    return result;
  }
  let rawRows: unknown[];
  try {
    rawRows = adapter.parsePayload(payload);
    if (!Array.isArray(rawRows)) throw new Error("Payload parser must return an array of rows");
    rawRows = Array.from(rawRows);
  } catch (error) {
    result.diagnostics.push({ code: "SOURCE_PARSE_FAILURE", message: error instanceof Error ? error.message : "Source payload could not be parsed" });
    return result;
  }
  result.counts.inputRows = rawRows.length;
  const parsedRows = rawRows.map((raw) => {
    try {
      return { parsed: adapter.rowSchema.safeParse(raw, { reportInput: true }) };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Row schema failed" };
    }
  });
  const identifiers = parsedRows.map(({ parsed: row }) => {
    if (!row?.success) return undefined;
    try { return adapter.sourceIdentifier(row.data); } catch { return undefined; }
  });
  const occurrences = new Map<string, number>();
  identifiers.forEach((id) => { if (id) occurrences.set(id, (occurrences.get(id) ?? 0) + 1); });
  const reject = (rowIndex: number, diagnostics: IngestionDiagnostic[]) => {
    result.rows.push({ rowIndex, raw: rawRows[rowIndex], status: "REJECTED", diagnostics });
    result.diagnostics.push(...diagnostics);
    result.counts.rejectedRows += 1;
  };
  parsedRows.forEach(({ parsed: row, failure }, rowIndex) => {
    if (!row) return reject(rowIndex, [{ code: "SOURCE_PARSE_FAILURE", rowIndex, message: failure! }]);
    if (!row.success) return reject(rowIndex, validationDiagnostics(row.error, rowIndex));
    const id = identifiers[rowIndex];
    if (!id) return reject(rowIndex, [{ code: "MISSING_REQUIRED_SOURCE_FIELD", rowIndex, message: "Source identifier is missing" }]);
    if (occurrences.get(id)! > 1) {
      return reject(rowIndex, [{ code: "DUPLICATE_SOURCE_IDENTIFIER", rowIndex, message: `Duplicate source identifier: ${id}` }]);
    }
    try {
      const normalized = adapter.normalize(row.data, { ...context, source });
      if ("diagnostics" in normalized) {
        const diagnostics = z.array(ingestionDiagnosticSchema).min(1).parse(normalized.diagnostics);
        return reject(rowIndex, diagnostics.map((diagnostic) => ({ ...diagnostic, rowIndex })));
      }
      const parsed = adapter.outputSchema.safeParse(normalized.record, { reportInput: true });
      if (!parsed.success) return reject(rowIndex, validationDiagnostics(parsed.error, rowIndex));
      const canonical = auditRecordSchema.safeParse(parsed.data, { reportInput: true });
      if (!canonical.success) return reject(rowIndex, validationDiagnostics(canonical.error, rowIndex));
      const record = parsed.data;
      if (record.category !== adapter.category || record.releaseStatus !== context.releaseStatus ||
          (record.valueType === "MODELLED_ESTIMATE" && adapter.kind !== "MODEL") ||
          record.provenance.sourceId !== source.sourceId ||
          record.provenance.snapshotId !== context.snapshot.snapshotId ||
          record.provenance.snapshotChecksum !== context.snapshot.checksum ||
          record.provenance.sourceFormat !== context.snapshot.sourceFormat ||
          record.provenance.retrievedAt !== context.snapshot.retrievedAt ||
          record.provenance.importedAt !== context.importedAt ||
          record.provenance.importVersion !== context.importVersion ||
          record.provenance.parserVersion !== adapter.version) {
        return reject(rowIndex, [{ code: "SOURCE_REVIEW_REQUIRED", rowIndex, message: "Adapter changed category, release status, snapshot provenance, or introduced an undeclared model" }]);
      }
      result.records.push(record);
      result.rows.push({ rowIndex, raw: rawRows[rowIndex], status: "ACCEPTED", record });
      result.counts.acceptedRows += 1;
    } catch (error) {
      reject(rowIndex, [{ code: "SOURCE_PARSE_FAILURE", rowIndex, message: error instanceof Error ? error.message : "Adapter failed to normalize row" }]);
    }
  });
  result.status = result.diagnostics.length === 0 ? "SUCCESS" : "FAILED";
  return result;
}
