import extract from "../../controlled/rent/2026-07/ons-pipr.json";
import { sourceCatalog } from "../../provenance/catalog";
import { auditArtifactSchema, directEvidenceReleaseSchema } from "../../schemas/artifacts";
import { rentRecordSchema } from "../../schemas/records";
import { snapshotMetadataSchema, type SnapshotMetadata } from "../snapshot";
import { runIngestion } from "../run";
import type { ImportedPayload } from "../contracts";
import { rentAdapter, rentExtractSchema } from "./adapter";
import { validateRentCoverage } from "./coverage";

export const rentExtract = extract;
export const rentSnapshot = snapshotMetadataSchema.parse(extract.snapshot);
const source = sourceCatalog.find((s) => s.sourceId === "SRC-001")!;

function ingest(raw: unknown) {
  const e = rentExtractSchema.parse(raw);
  if (JSON.stringify(e.snapshot) !== JSON.stringify(rentSnapshot)) throw new Error("Unregistered or altered rent snapshot");
  const input: ImportedPayload = { snapshot: e.snapshot, importedAt: e.importedAt, importVersion: e.importVersion, releaseStatus: e.releaseStatus, payload: JSON.stringify(e) };
  const run = runIngestion(rentAdapter, source, input);
  for (const r of run.records) {
    r.provenance.methodologyNotes = e.methodologyNotes;
    r.provenance.limitations = e.limitations;
  }
  return { input, run };
}

/** Reconcile deserialized production artifacts to the reviewed cells as well as shape/coverage. */
export function validateRentRelease(input: unknown, snapshots: readonly SnapshotMetadata[] = [rentSnapshot]) {
  const release = directEvidenceReleaseSchema.parse(input);
  const coverage = validateRentCoverage(release.records);
  if (coverage.status !== "COMPLETE") throw new Error(JSON.stringify(coverage.diagnostics));
  if (snapshots.length !== 1 || JSON.stringify(snapshotMetadataSchema.parse(snapshots[0])) !== JSON.stringify(rentSnapshot)) throw new Error("Rent snapshot registry does not reconcile");
  const expected = ingest(rentExtract).run;
  if (expected.status !== "SUCCESS") throw new Error("Reviewed rent extract failed ingestion");
  for (const raw of release.records) {
    const r = rentRecordSchema.parse(raw);
    const reviewed = expected.records.find((record) => record.recordId === r.recordId);
    if (!reviewed || JSON.stringify(r) !== JSON.stringify(rentRecordSchema.parse(reviewed))) {
      throw new Error(`Rent source cell/value/provenance reconciliation failed: ${r.recordId}`);
    }
  }
  return release;
}

export function buildRentRelease(input: unknown = rentExtract) {
  const { input: imported, run } = ingest(input);
  const records = [...run.records].sort((a, b) => a.recordId.localeCompare(b.recordId, "en"));
  const coverage = validateRentCoverage(records);
  const manifest = {
    releaseId: "ukmr-rent-2026-07-v1", schemaVersion: "1.3.0", generatedAt: "2026-09-14T15:25:23Z",
    sourceSnapshotIds: [...new Set(records.map((r) => r.provenance.snapshotId))].sort(), recordCount: records.length,
  };
  const audit = auditArtifactSchema.parse({ kind: "AUDIT", manifest, records });
  const validationDiagnostics: string[] = [];
  let release;
  if (run.status === "SUCCESS" && run.rows.length === run.counts.inputRows && run.counts.inputRows === run.counts.acceptedRows + run.counts.rejectedRows && coverage.status === "COMPLETE") {
    try { release = validateRentRelease({ kind: "DIRECT_EVIDENCE_RELEASE", manifest, records }); }
    catch (error) { validationDiagnostics.push(error instanceof Error ? error.message : String(error)); }
  }
  return { status: release ? "SUCCESS" as const : "FAILED" as const, imports: [imported], runs: [run], audit, coverage, validationDiagnostics, release };
}
