import { z } from "zod";
import { sourceCatalog } from "../../provenance/catalog";
import { auditArtifactSchema, referenceArtifactSchema, directEvidenceReleaseSchema } from "../../schemas/artifacts";
import { energyConsumptionRecordSchema, energyPriceRecordSchema, type AuditRecord } from "../../schemas/records";
import { snapshotMetadataSchema, type SnapshotMetadata } from "../snapshot";
import { runIngestion } from "../run";
import type { ImportedPayload } from "../contracts";
import { needAdapter, priceAdapter, needExtractSchema, priceExtractSchema } from "./adapters";
import { needExtracts, priceExtracts } from "./sources";

export type EnergyFamily = "consumption" | "prices";
const extractsFor = (family: EnergyFamily) => family === "consumption" ? needExtracts : priceExtracts;
export const energySnapshots = [...needExtracts, ...priceExtracts].map((e) => snapshotMetadataSchema.parse(e.snapshot));
function ingest(family: EnergyFamily, raw: unknown) {
  const e = family === "consumption" ? needExtractSchema.parse(raw) : priceExtractSchema.parse(raw);
  const reviewed = extractsFor(family).find((source) => source.snapshot.snapshotId === e.snapshot.snapshotId);
  if (!reviewed || JSON.stringify(snapshotMetadataSchema.parse(reviewed.snapshot)) !== JSON.stringify(e.snapshot)) throw new Error("Unregistered or altered energy snapshot");
  // Source scope and page/header metadata are reviewed alongside the individual observations.
  const { rows: ignoredRows, ...metadata } = e;
  void ignoredRows;
  const parsedReviewed = family === "consumption" ? needExtractSchema.parse(reviewed) : priceExtractSchema.parse(reviewed);
  const { rows: ignoredReviewedRows, ...reviewedMetadata } = parsedReviewed;
  void ignoredReviewedRows;
  if (JSON.stringify(metadata) !== JSON.stringify(reviewedMetadata)) throw new Error("Energy controlled-extract metadata differs from reviewed source");
  const source = sourceCatalog.find((s) => s.sourceId === e.snapshot.sourceId)!;
  const input: ImportedPayload = { snapshot: e.snapshot, importedAt: e.importedAt, importVersion: e.importVersion, releaseStatus: e.releaseStatus, payload: JSON.stringify(e) };
  const run = family === "consumption" ? runIngestion(needAdapter, source, input) : runIngestion(priceAdapter, source, input);
  if ("officialPageUrl" in e) for (const record of run.records) {
    record.qa.officialPageUrl = e.officialPageUrl;
    record.qa.officialPageChecksum = e.officialPageChecksum;
  }
  return { input, run };
}
const expected = {
  consumption: needExtracts.flatMap<AuditRecord>((e) => ingest("consumption", e).run.records),
  prices: priceExtracts.flatMap<AuditRecord>((e) => ingest("prices", e).run.records),
};
const parseRecord = (family: EnergyFamily, raw: unknown) => family === "consumption" ? energyConsumptionRecordSchema.parse(raw) : energyPriceRecordSchema.parse(raw);

/** Completeness is scoped to reviewed source combinations, never MVP cities. */
export function validateEnergyCoverage(family: EnergyFamily, records: readonly unknown[]) {
  const diagnostics: { code: string; message: string }[] = [];
  const wanted = new Map<string, AuditRecord>(expected[family].map((r) => [r.recordId, r]));
  const seen = new Set<string>();
  for (const raw of records) {
    try {
      const r = parseRecord(family, raw);
      if (seen.has(r.recordId)) diagnostics.push({ code: "DUPLICATE_ENERGY_RECORD", message: r.recordId });
      seen.add(r.recordId);
      const match = wanted.get(r.recordId);
      if (!match || JSON.stringify(parseRecord(family, match)) !== JSON.stringify(r)) diagnostics.push({ code: "ENERGY_SOURCE_RECONCILIATION_FAILED", message: `Source geography/year/dimensions/value/provenance must match reviewed evidence: ${r.recordId}` });
    } catch (error) { diagnostics.push({ code: "INVALID_ENERGY_RECORD", message: error instanceof Error ? error.message : String(error) }); }
  }
  for (const id of wanted.keys()) if (!seen.has(id)) diagnostics.push({ code: "MISSING_REQUIRED_ENERGY_OBSERVATION", message: id });
  const expectedCount = family === "consumption" ? 784 : 126;
  if (wanted.size !== expectedCount || records.length !== expectedCount) diagnostics.push({ code: "ENERGY_COUNT_MISMATCH", message: `Expected ${expectedCount} reviewed observations; received ${records.length}` });
  return {
    status: diagnostics.length ? "FAILED" as const : "COMPLETE" as const,
    scope: family === "consumption" ? "100 selected 2024 NEED profiles; full joint-table coverage remains PARTIAL" : "14 regions × 3 payment methods × gas/single-rate electricity/multi-rate electricity; 2026-Q3",
    expectedRecordCount: expectedCount, actualRecordCount: records.length, diagnostics,
    cityCoverage: family === "prices"
      ? { status: "UNRESOLVED", diagnostics: [{ code: "ENERGY_CITY_REGION_MAPPING_UNRESOLVED", message: "Authoritative postcode/DNO evidence is required. No city-only region mapping or city coverage is claimed." }] }
      : { status: "NOT_APPLICABLE", diagnostics: [{ code: "NEED_CITY_JOINT_PROFILE_UNAVAILABLE", message: "No city-level joint geography or adult occupancy in these source workbooks. Scotland is national only." }] },
  };
}

/** Required gate for deserialized reference/direct energy artifacts. */
export function validateEnergyArtifact(family: EnergyFamily, raw: unknown, snapshots: readonly SnapshotMetadata[] = energySnapshots) {
  const artifact = family === "consumption" ? referenceArtifactSchema.parse(raw) : directEvidenceReleaseSchema.parse(raw);
  const coverage = validateEnergyCoverage(family, artifact.records);
  if (coverage.status !== "COMPLETE") throw new Error(JSON.stringify(coverage.diagnostics));
  const registry = z.array(snapshotMetadataSchema).parse(snapshots);
  if (new Set(registry.map((s) => s.snapshotId)).size !== registry.length) throw new Error("Duplicate snapshot registry IDs");
  for (const id of artifact.manifest.sourceSnapshotIds) {
    const registered = registry.find((s) => s.snapshotId === id);
    const trusted = energySnapshots.find((s) => s.snapshotId === id);
    if (!trusted || JSON.stringify(registered) !== JSON.stringify(trusted)) throw new Error("Energy snapshot registry does not reconcile");
  }
  return artifact;
}

export function buildEnergyRelease(family: EnergyFamily, inputs: readonly unknown[] = extractsFor(family)) {
  const ingestions = inputs.map((e) => ingest(family, e));
  const records = ingestions.flatMap<AuditRecord>((e) => e.run.records).sort((a, b) => a.recordId.localeCompare(b.recordId, "en"));
  const coverage = validateEnergyCoverage(family, records);
  const manifest = {
    releaseId: family === "consumption" ? "ukmr-need-2024-v1" : "ukmr-ofgem-2026-q3-v1",
    schemaVersion: "1.4.0", generatedAt: "2026-09-14T15:45:55Z",
    sourceSnapshotIds: [...new Set(records.map((r) => r.provenance.snapshotId))].sort(), recordCount: records.length,
  };
  const audit = auditArtifactSchema.parse({ kind: "AUDIT", manifest, records });
  const validationDiagnostics: string[] = [];
  let release;
  if (coverage.status === "COMPLETE" && ingestions.every(({ run }) => run.status === "SUCCESS" && run.rows.length === run.counts.inputRows && run.counts.inputRows === run.counts.acceptedRows + run.counts.rejectedRows)) {
    try { release = validateEnergyArtifact(family, { kind: family === "consumption" ? "REFERENCE_ARTIFACT" : "DIRECT_EVIDENCE_RELEASE", manifest, records }); }
    catch (error) { validationDiagnostics.push(error instanceof Error ? error.message : String(error)); }
  }
  return { status: release ? "SUCCESS" as const : "FAILED" as const, imports: ingestions.map((e) => e.input), runs: ingestions.map((e) => e.run), audit, coverage, validationDiagnostics, release };
}
