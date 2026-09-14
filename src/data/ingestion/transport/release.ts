import { z } from "zod";
import { sourceCatalog } from "../../provenance/catalog";
import { auditArtifactSchema, directEvidenceReleaseSchema, referenceArtifactSchema } from "../../schemas/artifacts";
import { transportFareRecordSchema } from "../../schemas/records";
import { snapshotMetadataSchema, type SnapshotMetadata } from "../snapshot";
import { runIngestion } from "../run";
import type { ImportedPayload } from "../contracts";
import { transportAdapter, transportExtractSchema, transportIdentity } from "./adapters";
import { transportExtracts } from "./sources";
import { transportMonthlyEquivalent } from "./conversions";

export const transportSnapshots = transportExtracts.map((e) => snapshotMetadataSchema.parse(e.snapshot));
export function ingestTransport(raw: unknown) {
  const e = transportExtractSchema.parse(raw);
  const registered = transportExtracts.find((s) => s.key === e.key);
  if (!registered) throw new Error("Unregistered transport source extract");
  const metadata = (value: z.infer<typeof transportExtractSchema>) => { const { rows, ...rest } = value; void rows; return rest; };
  if (JSON.stringify(metadata(e)) !== JSON.stringify(metadata(transportExtractSchema.parse(registered)))) throw new Error("Altered reviewed source/snapshot metadata");
  const input: ImportedPayload = { snapshot: e.snapshot, importedAt: e.importedAt, importVersion: e.importVersion, releaseStatus: e.releaseStatus, payload: JSON.stringify(e) };
  const source = sourceCatalog.find((s) => s.sourceId === e.sourceId)!;
  return { input, run: runIngestion(transportAdapter(e.key), source, input) };
}
const expected = transportExtracts.flatMap((e) => ingestTransport(e).run.records);
const expectedById = new Map(expected.map((r) => [r.recordId, r]));
const cities = [
  ["LOC-LON", "London"], ["LOC-BIR", "Birmingham"], ["LOC-MAN", "Manchester"], ["LOC-LEE", "Leeds"],
  ["LOC-LIV", "Liverpool"], ["LOC-BRS", "Bristol"], ["LOC-EDI", "Edinburgh"], ["LOC-GLA", "Glasgow"],
] as const;
/** City is a consumer index into conditional products, never the published geography. */
export const transportCityMappings = cities.map(([cityId, city]) => ({
  cityId, city, cityDefault: "UNRESOLVED" as const,
  scope: "Selected adult products only; route/zone/operator eligibility remains conditional",
  products: expected.filter((r) => r.applicability.cityIds.includes(cityId)).map((r) => ({ recordId: r.recordId, operator: r.operator, network: r.network, mode: r.mode, zonesOrArea: r.zonesOrArea, sourceId: r.provenance.sourceId })),
}));
export function validateTransportCoverage(records: readonly unknown[], mappings: unknown = transportCityMappings) {
  const diagnostics: { code: string; message: string }[] = [];
  const identities = new Set<string>(); const seenIds = new Set<string>(); const validIds = new Set<string>();
  for (const raw of records) {
    const parsed = transportFareRecordSchema.safeParse(raw);
    if (!parsed.success) { diagnostics.push({ code: "INVALID_TRANSPORT_FARE", message: parsed.error.message }); continue; }
    const r = parsed.data; const identity = transportIdentity(r);
    if (identities.has(identity) || seenIds.has(r.recordId)) diagnostics.push({ code: "DUPLICATE_TRANSPORT_PRODUCT_IDENTITY", message: r.recordId });
    identities.add(identity); seenIds.add(r.recordId);
    if (JSON.stringify(r) !== JSON.stringify(expectedById.get(r.recordId))) diagnostics.push({ code: "TRANSPORT_SOURCE_RECONCILIATION_FAILED", message: r.recordId });
    else validIds.add(r.recordId);
  }
  for (const id of expectedById.keys()) if (!validIds.has(id)) diagnostics.push({ code: "MISSING_REVIEWED_TRANSPORT_PRODUCT", message: id });
  if (expected.length !== 25 || expectedById.size !== 25 || records.length !== 25) diagnostics.push({ code: "TRANSPORT_COUNT_MISMATCH", message: "Expected exactly 25 reviewed products" });
  if (JSON.stringify(mappings) !== JSON.stringify(transportCityMappings)) diagnostics.push({ code: "UNSUPPORTED_TRANSPORT_CITY_MAPPING", message: "City mappings must preserve reviewed product scope and unresolved default status" });
  return {
    status: diagnostics.length ? "FAILED" as const : "COMPLETE" as const,
    scope: "Selected fare evidence completeness only; not exhaustive fares or city-default coverage", expectedRecordCount: 25, actualRecordCount: records.length, diagnostics,
    cityCoverage: transportCityMappings.map((m) => ({ ...m,
      evidenceStatus: m.products.length && m.products.every((p) => validIds.has(p.recordId)) && !diagnostics.length ? "COMPLETE_FOR_SELECTED_PRODUCTS" : "INCOMPLETE",
      diagnostics: [{ code: "TRANSPORT_CITY_DEFAULT_PRODUCT_UNRESOLVED", message: `${m.city}: no canonical fare product approved; product existence does not resolve city-default coverage.` }],
    })),
  };
}
export function validateTransportArtifact(raw: unknown, snapshots: readonly SnapshotMetadata[] = transportSnapshots) {
  const a = directEvidenceReleaseSchema.parse(raw);
  const coverage = validateTransportCoverage(a.records);
  if (coverage.status !== "COMPLETE") throw new Error(JSON.stringify(coverage.diagnostics));
  const registry = z.array(snapshotMetadataSchema).parse(snapshots);
  if (registry.length !== transportSnapshots.length || new Set(registry.map((s) => s.snapshotId)).size !== registry.length) throw new Error("Transport snapshot identity/count mismatch");
  for (const s of transportSnapshots) if (JSON.stringify(registry.find((r) => r.snapshotId === s.snapshotId)) !== JSON.stringify(s)) throw new Error("Transport snapshot provenance mismatch");
  return a;
}
export function validateTransportCalculatedArtifact(raw: unknown, parents: readonly unknown[]) {
  const artifact = referenceArtifactSchema.parse(raw);
  if (validateTransportCoverage(parents).status !== "COMPLETE") throw new Error("Calculated artifact requires the reconciled parent fare release");
  const expectedConversions = parents.map((p) => transportFareRecordSchema.parse(p)).filter((p) => ["weekly", "annual"].includes(p.fareType)).map(transportMonthlyEquivalent).sort((a, b) => a.recordId.localeCompare(b.recordId, "en"));
  if (JSON.stringify(artifact.records) !== JSON.stringify(expectedConversions)) throw new Error("Calculated rows do not match exact parent fares, formulas and provenance");
  return artifact;
}
export function buildTransportRelease(inputs: readonly unknown[] = transportExtracts) {
  const ingestions = inputs.map(ingestTransport);
  const records = ingestions.flatMap((i) => i.run.records).sort((a, b) => a.recordId.localeCompare(b.recordId, "en"));
  const coverage = validateTransportCoverage(records);
  const manifest = { releaseId: "ukmr-transport-2026-09-v1", schemaVersion: "1.7.0", generatedAt: "2026-09-14T17:49:38Z", sourceSnapshotIds: [...new Set(records.map((r) => r.provenance.snapshotId))].sort(), recordCount: records.length };
  const audit = auditArtifactSchema.parse({ kind: "AUDIT", manifest, records });
  let release; let calculated;
  const validationDiagnostics: string[] = [];
  if (coverage.status === "COMPLETE" && ingestions.length === transportExtracts.length && ingestions.every(({ run }) => run.status === "SUCCESS" && run.rows.length === run.counts.inputRows && run.counts.inputRows === run.counts.acceptedRows + run.counts.rejectedRows)) {
    try {
      release = validateTransportArtifact({ kind: "DIRECT_EVIDENCE_RELEASE", manifest, records });
      const conversions = records.filter((p) => ["weekly", "annual"].includes(p.fareType)).map(transportMonthlyEquivalent);
      calculated = validateTransportCalculatedArtifact({ kind: "REFERENCE_ARTIFACT", manifest: { ...manifest, releaseId: `${manifest.releaseId}-calculated`, recordCount: conversions.length, sourceSnapshotIds: [...new Set(conversions.map((r) => r.provenance.snapshotId))].sort() }, records: conversions }, records);
    } catch (error) { validationDiagnostics.push(error instanceof Error ? error.message : String(error)); release = undefined; }
  }
  return { status: release && calculated ? "SUCCESS" as const : "FAILED" as const, imports: ingestions.map((i) => i.input), runs: ingestions.map((i) => i.run), audit, release, calculated, coverage, validationDiagnostics };
}
