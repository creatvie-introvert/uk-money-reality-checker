import { z } from "zod";
import england from "../../controlled/council-tax/2026-27/england-table9.json";
import scotland from "../../controlled/council-tax/2026-27/scotland-bands.json";
import { sourceCatalog } from "../../provenance/catalog";
import { auditArtifactSchema, directEvidenceReleaseSchema } from "../../schemas/artifacts";
import { councilTaxRecordSchema } from "../../schemas/records";
import { snapshotMetadataSchema, type SnapshotMetadata } from "../snapshot";
import { runIngestion } from "../run";
import type { ImportedPayload } from "../contracts";
import { councilTaxExtractSchema, englandCouncilTaxAdapter, scotlandCouncilTaxAdapter } from "./adapters";
import { validateCouncilTaxCoverage } from "./coverage";

export const councilTaxExtracts = [england, scotland];
export const councilTaxSnapshots = councilTaxExtracts.map((e) => snapshotMetadataSchema.parse(e.snapshot));

/** Deserialized production releases must pass this gate, not only the generic artifact shape. */
export function validateCouncilTaxRelease(input: unknown, snapshots: readonly SnapshotMetadata[] = councilTaxSnapshots) {
  const release = directEvidenceReleaseSchema.parse(input);
  const coverage = validateCouncilTaxCoverage(release.records);
  if (coverage.status !== "COMPLETE") throw new Error(JSON.stringify(coverage.diagnostics));
  const registry = z.array(snapshotMetadataSchema).parse(snapshots);
  if (new Set(registry.map((s) => s.snapshotId)).size !== registry.length) throw new Error("Duplicate snapshot registry IDs");
  for (const raw of release.records) {
    const r = councilTaxRecordSchema.parse(raw);
    const p = r.provenance;
    const snapshot = registry.find((s) => s.snapshotId === p.snapshotId);
    const extract = councilTaxExtracts.find((e) => e.snapshot.snapshotId === p.snapshotId);
    const source = sourceCatalog.find((s) => s.sourceId === p.sourceId);
    const sourceRow = extract?.rows.find((row) => row.authorityName === r.geography.official.name && row.band === r.band);
    if (!snapshot || !extract || !source || !sourceRow ||
        snapshot.sourceId !== p.sourceId || snapshot.sourceFormat !== p.sourceFormat ||
        snapshot.checksum !== p.snapshotChecksum || snapshot.retrievedAt !== p.retrievedAt ||
        snapshot.retention !== "METADATA_ONLY" || snapshot.sourceUrl !== p.sourceUrl || snapshot.sourceReference !== p.sourceReference ||
        JSON.stringify(snapshot) !== JSON.stringify(snapshotMetadataSchema.parse(extract.snapshot)) ||
        source.organisation !== p.organisation || source.publicationTitle !== p.publicationTitle || source.licenceReference !== p.licenceReference ||
        extract.importedAt !== p.importedAt || extract.importVersion !== p.importVersion || p.parserVersion !== "1.0.0" ||
        extract.methodologyNotes !== p.methodologyNotes ||
        sourceRow.rawSourceValue !== r.qa.rawSourceValue || sourceRow.displayedAnnualGbp !== r.qa.displayedAnnualGbp ||
        sourceRow.sourceCell !== r.qa.sourceCell || sourceRow.sourceTable !== r.qa.sourceTable ||
        sourceRow.sourceNumberFormat !== r.qa.sourceNumberFormat || sourceRow.sourceAuthorityName !== r.qa.sourceAuthorityName) {
      throw new Error(`Council-tax source/snapshot/precision reconciliation failed: ${r.recordId}`);
    }
  }
  return release;
}

export function buildCouncilTaxRelease(inputs: readonly unknown[] = councilTaxExtracts) {
  const imports: ImportedPayload[] = [];
  const runs = inputs.map((raw) => {
    const extract = councilTaxExtractSchema.parse(raw);
    const registered = councilTaxSnapshots.find((s) => s.snapshotId === extract.snapshot.snapshotId);
    if (JSON.stringify(registered) !== JSON.stringify(extract.snapshot)) throw new Error("Unregistered or altered council-tax snapshot");
    const source = sourceCatalog.find((s) => s.sourceId === extract.snapshot.sourceId)!;
    const input: ImportedPayload = {
      snapshot: extract.snapshot, importedAt: extract.importedAt, importVersion: extract.importVersion,
      releaseStatus: extract.releaseStatus, payload: JSON.stringify(extract),
    };
    imports.push(input);
    const result = runIngestion(source.sourceId === "SRC-002" ? englandCouncilTaxAdapter : scotlandCouncilTaxAdapter, source, input);
    result.records.forEach((r) => { r.provenance.methodologyNotes = extract.methodologyNotes; });
    return result;
  });
  const records = runs.flatMap((run) => run.records).sort((a, b) => a.recordId.localeCompare(b.recordId, "en"));
  const coverage = validateCouncilTaxCoverage(records);
  const manifest = {
    releaseId: "ukmr-council-tax-2026-27-v1", schemaVersion: "1.2.0", generatedAt: "2026-09-14T15:04:59Z",
    sourceSnapshotIds: [...new Set(records.map((r) => r.provenance.snapshotId))].sort(), recordCount: records.length,
  };
  const audit = auditArtifactSchema.parse({ kind: "AUDIT", manifest, records });
  const ingestionPassed = runs.every((run) => run.status === "SUCCESS" && run.rows.length === run.counts.inputRows && run.counts.inputRows === run.counts.acceptedRows + run.counts.rejectedRows);
  const validationDiagnostics: string[] = [];
  let release;
  if (ingestionPassed && coverage.status === "COMPLETE") {
    try { release = validateCouncilTaxRelease({ kind: "DIRECT_EVIDENCE_RELEASE", manifest, records }); }
    catch (error) { validationDiagnostics.push(error instanceof Error ? error.message : String(error)); }
  }
  return { status: release ? "SUCCESS" as const : "FAILED" as const, imports, runs, audit, coverage, validationDiagnostics, release };
}
