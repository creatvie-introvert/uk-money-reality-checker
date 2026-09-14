import { z } from "zod";

import allowances from "../../controlled/2026-27/hmrc-allowances.json";
import currentRates from "../../controlled/2026-27/hmrc-current-rates.json";
import scottishBands from "../../controlled/2026-27/scottish-bands.json";
import nationalInsurance from "../../controlled/2026-27/hmrc-ni-category-a.json";
import { sourceCatalog } from "../../provenance/catalog";
import { auditArtifactSchema, referenceArtifactSchema } from "../../schemas/artifacts";
import type { AuditRecord } from "../../schemas/records";
import type { ImportedPayload, IngestionResult } from "../contracts";
import { runIngestion } from "../run";
import { snapshotMetadataSchema, type SnapshotMetadata } from "../snapshot";
import { defaultMethodologyNotes, employeeNIAdapter, extractSchema, hmrcIncomeTaxAdapter, scottishIncomeTaxAdapter } from "./adapters";
import { validateReferenceCoverage, type ReferenceDataset } from "./coverage";

export const controlledExtracts = [allowances, currentRates, scottishBands, nationalInsurance];
export const productionSnapshots = controlledExtracts.map((extract) => snapshotMetadataSchema.parse(extract.snapshot));
const generatedAt = "2026-09-14T13:59:29Z";

/** Specialized release gate, also used to validate deserialized generated references. */
export function validateProductionReference(dataset: ReferenceDataset, input: unknown, snapshots: readonly SnapshotMetadata[] = productionSnapshots) {
  const artifact = referenceArtifactSchema.parse(input);
  const diagnostics = validateReferenceCoverage(dataset, artifact.records);
  const registry = z.array(snapshotMetadataSchema).parse(snapshots);
  if (new Set(registry.map((s) => s.snapshotId)).size !== registry.length) throw new Error("Duplicate snapshot registry ID");
  for (const record of artifact.records) {
    const provenance = record.provenance;
    const snapshot = registry.find((entry) => entry.snapshotId === provenance.snapshotId);
    const source = sourceCatalog.find((entry) => entry.sourceId === provenance.sourceId);
    const rawCapture = controlledExtracts.find((entry) => entry.snapshot.snapshotId === provenance.snapshotId);
    const capture = rawCapture ? extractSchema.parse(rawCapture) : undefined;
    if (!snapshot || !source || !capture || provenance.importedAt !== capture.importedAt ||
        provenance.methodologyNotes !== (capture.methodologyNotes ?? defaultMethodologyNotes) ||
        JSON.stringify(provenance.limitations) !== JSON.stringify(capture.limitations) || snapshot.sourceId !== provenance.sourceId ||
        snapshot.retrievedAt !== provenance.retrievedAt || snapshot.checksum !== provenance.snapshotChecksum ||
        snapshot.sourceFormat !== provenance.sourceFormat ||
        (snapshot.retention === "METADATA_ONLY" && (snapshot.sourceUrl !== provenance.sourceUrl || snapshot.sourceReference !== provenance.sourceReference)) ||
        source.organisation !== provenance.organisation || source.publicationTitle !== provenance.publicationTitle ||
        provenance.sourcePeriod !== "2026/27" || provenance.effectiveFrom !== "2026-04-06" || provenance.effectiveTo !== "2027-04-05" ||
        provenance.importVersion !== "2026-27-v1" || provenance.parserVersion !== "1.0.0") {
      throw new Error(`Snapshot/provenance reconciliation failed: ${record.recordId}`);
    }
  }
  if (diagnostics.length) throw new Error(JSON.stringify(diagnostics));
  return artifact;
}

/** In-memory build. Filesystem writes occur only after BOTH datasets pass all gates. */
export function buildProductionReferences(inputs: readonly unknown[] = controlledExtracts) {
  const runs: IngestionResult<AuditRecord>[] = [];
  const imports: ImportedPayload[] = [];
  for (const raw of inputs) {
    const extract = extractSchema.parse(raw);
    const source = sourceCatalog.find((entry) => entry.sourceId === extract.snapshot.sourceId);
    if (!source) throw new Error(`Unknown source: ${extract.snapshot.sourceId}`);
    const registered = productionSnapshots.find((entry) => entry.snapshotId === extract.snapshot.snapshotId);
    if (JSON.stringify(registered) !== JSON.stringify(extract.snapshot)) throw new Error(`Unregistered or altered snapshot: ${extract.snapshot.snapshotId}`);
    const input: ImportedPayload = {
      snapshot: extract.snapshot, importedAt: extract.importedAt, importVersion: extract.importVersion,
      releaseStatus: extract.releaseStatus, payload: JSON.stringify(extract),
    };
    imports.push(input);
    const result = source.sourceId === "SRC-012"
      ? runIngestion(employeeNIAdapter, source, input)
      : runIngestion(source.sourceId === "SRC-013" ? scottishIncomeTaxAdapter : hmrcIncomeTaxAdapter, source, input);
    // Retain capture qualifications on every normalized audit/reference record.
    result.records.forEach((record) => {
      record.provenance.limitations = [...extract.limitations];
      record.provenance.methodologyNotes = extract.methodologyNotes ?? defaultMethodologyNotes;
    });
    runs.push(result);
  }
  const allRecords = runs.flatMap((run) => run.records);
  const build = (dataset: ReferenceDataset) => {
    const records = allRecords.filter((record) => record.category === (dataset === "income-tax" ? "income_tax_rule" : "national_insurance_rule"))
      .sort((a, b) => a.recordId.localeCompare(b.recordId, "en"));
    const manifest = {
      releaseId: `ukmr-${dataset}-2026-27-v1`, schemaVersion: "1.1.0", generatedAt,
      sourceSnapshotIds: [...new Set(records.map((record) => record.provenance.snapshotId))].sort(), recordCount: records.length,
    };
    const audit = auditArtifactSchema.parse({ kind: "AUDIT", manifest, records });
    const coverageDiagnostics = validateReferenceCoverage(dataset, records);
    const failedRuns = runs.filter((run) => run.status !== "SUCCESS" || run.counts.inputRows !== run.rows.length || run.counts.inputRows !== run.counts.acceptedRows + run.counts.rejectedRows);
    const reference = failedRuns.length || coverageDiagnostics.length ? undefined
      : validateProductionReference(dataset, { kind: "REFERENCE_ARTIFACT", manifest, records });
    return { audit, coverageDiagnostics, reference };
  };
  const incomeTax = build("income-tax");
  const ni = build("national-insurance");
  return { status: incomeTax.reference && ni.reference ? "SUCCESS" as const : "FAILED" as const, imports, runs, incomeTax, nationalInsurance: ni };
}
