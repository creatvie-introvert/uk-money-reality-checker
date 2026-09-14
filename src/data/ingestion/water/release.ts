import { z } from "zod";
import { sourceCatalog } from "../../provenance/catalog";
import { auditArtifactSchema, directEvidenceReleaseSchema } from "../../schemas/artifacts";
import { waterTariffRecordSchema, type WaterTariffRecord } from "../../schemas/records";
import { snapshotMetadataSchema, type SnapshotMetadata } from "../snapshot";
import { runIngestion } from "../run";
import type { ImportedPayload } from "../contracts";
import { waterAdapter, waterExtractSchema, waterTariffIdentity } from "./adapters";
import { waterExtracts } from "./sources";
import { waterCityMappings, type WaterCityMapping } from "./mappings";

export const waterSnapshots = waterExtracts.map((e) => snapshotMetadataSchema.parse(e.snapshot));
export function ingestWater(raw: unknown) {
  const e = waterExtractSchema.parse(raw);
  const registered = waterExtracts.find((s) => s.snapshot.snapshotId === e.snapshot.snapshotId);
  if (!registered) throw new Error("Unregistered water snapshot");
  const withoutRows = (value: z.infer<typeof waterExtractSchema>) => { const { rows, ...metadata } = value; void rows; return metadata; };
  if (JSON.stringify(withoutRows(e)) !== JSON.stringify(withoutRows(waterExtractSchema.parse(registered)))) throw new Error("Altered water snapshot or reviewed source metadata");
  const input: ImportedPayload = { snapshot: e.snapshot, importedAt: e.importedAt, importVersion: e.importVersion, releaseStatus: e.releaseStatus, payload: JSON.stringify(e) };
  const source = sourceCatalog.find((s) => s.sourceId === e.sourceId)!;
  return { input, run: runIngestion(waterAdapter(e.sourceId), source, input) };
}
const expected = waterExtracts.flatMap((e) => ingestWater(e).run.records);
const expectedById = new Map(expected.map((r) => [r.recordId, r]));
export function validateWaterCoverage(records: readonly unknown[], mappings: readonly WaterCityMapping[] = waterCityMappings) {
  const diagnostics: { code: string; message: string }[] = [];
  const identities = new Set<string>();
  const validIds = new Set<string>();
  const seenIds = new Set<string>();
  for (const raw of records) {
    const parsed = waterTariffRecordSchema.safeParse(raw);
    if (!parsed.success) { diagnostics.push({ code: "INVALID_WATER_RECORD", message: parsed.error.message }); continue; }
    const r = parsed.data;
    const identity = waterTariffIdentity(r);
    if (identities.has(identity) || seenIds.has(r.recordId)) diagnostics.push({ code: "DUPLICATE_WATER_TARIFF_IDENTITY", message: identity });
    identities.add(identity); seenIds.add(r.recordId);
    if (r.releaseStatus !== "RELEASE_READY" || r.valueType !== "OBSERVED_DATA") diagnostics.push({ code: "NON_RELEASE_READY_WATER_EVIDENCE", message: r.recordId });
    const trusted = expectedById.get(r.recordId);
    if (!trusted || JSON.stringify(r) !== JSON.stringify(trusted)) {
      diagnostics.push({ code: "WATER_SOURCE_RECONCILIATION_FAILED", message: `Provider/service/regime/component/value/unit/period/provenance/applicability mismatch: ${r.recordId}` });
    } else validIds.add(r.recordId);
  }
  for (const id of expectedById.keys()) if (!validIds.has(id)) diagnostics.push({ code: "MISSING_REQUIRED_WATER_TARIFF", message: id });
  if (expectedById.size !== 56 || records.length !== 56) diagnostics.push({ code: "WATER_COUNT_MISMATCH", message: `Expected 56 reviewed tariff facts; received ${records.length}` });
  const mappingValid = JSON.stringify(mappings) === JSON.stringify(waterCityMappings);
  if (!mappingValid) diagnostics.push({ code: "UNSUPPORTED_CITY_PROVIDER_MAPPING", message: "Mappings and supported regimes must match the reviewed city/path registry" });
  const cityCoverage = waterCityMappings.map((m) => {
    const missingRecordIds = m.requiredRecordIds.filter((id) => !validIds.has(id));
    const cityDiagnostics: { code: string; message: string }[] = [];
    if (m.cityId === "LOC-BIR") cityDiagnostics.push({ code: "BIRMINGHAM_WATER_APPLICABILITY_UNRESOLVED", message: "Zones 1–8 source facts do not establish Birmingham's zone or surface drainage tariff; no city-default selection." });
    if (missingRecordIds.length) cityDiagnostics.push({ code: m.cityId === "LOC-BRS" && missingRecordIds.some((id) => id.startsWith("SRC-BRISTOL-WATER:")) ? "BRISTOL_CLEAN_WATER_TARIFF_UNRESOLVED" : "MISSING_REQUIRED_WATER_TARIFF", message: missingRecordIds.join(", ") });
    if (!mappingValid || diagnostics.some((d) => d.code === "DUPLICATE_WATER_TARIFF_IDENTITY")) cityDiagnostics.push({ code: "WATER_RELEASE_RECONCILIATION_FAILED", message: "Invalid mapping or duplicate tariff identity prevents coverage approval" });
    return { ...m, status: cityDiagnostics.length ? "INCOMPLETE" as const : "COMPLETE_FOR_SUPPORTED_PATH" as const, addressDefaultSelection: "NOT_ESTABLISHED" as const, missingRecordIds, diagnostics: cityDiagnostics };
  });
  return {
    status: diagnostics.length ? "FAILED" as const : "COMPLETE" as const,
    scope: "56 selected provider tariff facts, not exhaustive provider tariffs or unconditional address coverage",
    expectedRecordCount: 56, actualRecordCount: records.length, diagnostics, cityCoverage,
    additionalPaths: [
      { city: "Bristol", billingRegime: "rateable_value", status: "INCOMPLETE", reason: "Clean-water fixed/RV facts only; wastewater regime not selected or verified." },
      { city: "Bristol", billingRegime: "assessed_household", status: "INCOMPLETE", reason: "Clean-water standing/bedroom facts only; wastewater regime not selected or verified." },
      { cities: ["Edinburgh", "Glasgow"], billingRegime: "metered_volumetric", status: "NOT_INGESTED", reason: "Scottish metered regime is separate from band-based unmetered evidence." },
    ],
  };
}
export function validateWaterArtifact(raw: unknown, snapshots: readonly SnapshotMetadata[] = waterSnapshots) {
  const artifact = directEvidenceReleaseSchema.parse(raw);
  const coverage = validateWaterCoverage(artifact.records);
  if (coverage.status !== "COMPLETE") throw new Error(JSON.stringify(coverage.diagnostics));
  const registry = z.array(snapshotMetadataSchema).parse(snapshots);
  if (registry.length !== waterSnapshots.length || new Set(registry.map((s) => s.snapshotId)).size !== registry.length) throw new Error("Water snapshot registry count/identity mismatch");
  for (const trusted of waterSnapshots) if (JSON.stringify(registry.find((s) => s.snapshotId === trusted.snapshotId)) !== JSON.stringify(trusted)) throw new Error("Water snapshot registry does not reconcile");
  return artifact;
}
export function buildWaterRelease(inputs: readonly unknown[] = waterExtracts) {
  const ingestions = inputs.map(ingestWater);
  const records: WaterTariffRecord[] = ingestions.flatMap((e) => e.run.records).sort((a, b) => a.recordId.localeCompare(b.recordId, "en"));
  const coverage = validateWaterCoverage(records);
  const manifest = { releaseId: "ukmr-water-2026-27-v1", schemaVersion: "1.5.0", generatedAt: "2026-09-14T16:29:27Z", sourceSnapshotIds: [...new Set(records.map((r) => r.provenance.snapshotId))].sort(), recordCount: records.length };
  const audit = auditArtifactSchema.parse({ kind: "AUDIT", manifest, records });
  let release;
  const validationDiagnostics: string[] = [];
  if (coverage.status === "COMPLETE" && ingestions.every(({ run }) => run.status === "SUCCESS" && run.rows.length === run.counts.inputRows && run.counts.inputRows === run.counts.acceptedRows + run.counts.rejectedRows)) {
    try { release = validateWaterArtifact({ kind: "DIRECT_EVIDENCE_RELEASE", manifest, records }); }
    catch (error) { validationDiagnostics.push(error instanceof Error ? error.message : String(error)); }
  }
  return { status: release ? "SUCCESS" as const : "FAILED" as const, imports: ingestions.map((e) => e.input), runs: ingestions.map((e) => e.run), audit, coverage, validationDiagnostics, release };
}
