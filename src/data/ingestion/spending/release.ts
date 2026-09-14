import { z } from "zod";
import { sourceCatalog } from "../../provenance/catalog";
import { auditArtifactSchema, referenceArtifactSchema } from "../../schemas/artifacts";
import { groceryExpenditureRecordSchema, coicopExpenditureRecordSchema, expenditurePeriodConversionRecordSchema, type AuditRecord } from "../../schemas/records";
import { snapshotMetadataSchema, type SnapshotMetadata } from "../snapshot";
import { runIngestion } from "../run";
import type { ImportedPayload } from "../contracts";
import { groceryAdapter, coicopAdapter, spendingExtractSchema } from "./adapters";
import { spendingExtracts, type SpendingFamily } from "./sources";
import { monthlyEquivalent } from "./conversions";

export const spendingSnapshots = Object.values(spendingExtracts).flatMap((e) => [e.snapshot, ...e.supportingSources.map((s) => s.snapshot)]).map((s) => snapshotMetadataSchema.parse(s));
export function ingestSpending(family: SpendingFamily, raw: unknown) {
  const e = spendingExtractSchema.parse(raw);
  const trusted = spendingExtractSchema.parse(spendingExtracts[family]);
  const metadata = (value: typeof e) => { const { rows, ...rest } = value; void rows; return rest; };
  if (e.family !== family || JSON.stringify(metadata(e)) !== JSON.stringify(metadata(trusted))) throw new Error("Spending snapshot, selection accounting or source metadata differs from reviewed evidence");
  const source = sourceCatalog.find((s) => s.sourceId === e.snapshot.sourceId)!;
  const input: ImportedPayload = { snapshot: e.snapshot, importedAt: e.importedAt, importVersion: e.importVersion, releaseStatus: e.releaseStatus, payload: JSON.stringify(e) };
  const run = family === "defra" ? runIngestion(groceryAdapter, source, input) : runIngestion(coicopAdapter, source, input);
  for (const record of run.records) {
    record.qa.supportingSources = e.supportingSources;
    record.qa.sourceHeaders = e.sourceHeaders;
    record.provenance.limitations = [...record.provenance.limitations, ...e.limitations];
  }
  return { input, run };
}
const expected = {
  defra: ingestSpending("defra", spendingExtracts.defra).run.records,
  ons: ingestSpending("ons", spendingExtracts.ons).run.records,
};
export type SpendingLayer = "observed" | "calculated";
const parseRecord = (family: SpendingFamily, layer: SpendingLayer, raw: unknown) => layer === "calculated" ? expenditurePeriodConversionRecordSchema.parse(raw) : family === "defra" ? groceryExpenditureRecordSchema.parse(raw) : coicopExpenditureRecordSchema.parse(raw);
export function validateSpendingCoverage(family: SpendingFamily, layer: SpendingLayer, records: readonly unknown[]) {
  const required = layer === "observed" ? expected[family] : expected[family].map(monthlyEquivalent);
  const wanted = new Map<string, AuditRecord>(required.map((r) => [r.recordId, r]));
  const diagnostics: { code: string; message: string }[] = [];
  const validIds = new Set<string>();
  const identities = new Set<string>();
  for (const raw of records) {
    try {
      const r = parseRecord(family, layer, raw);
      const identity = r.category === "expenditure_period_conversion" ? r.observedRecordId : `${r.provenance.sourceId}:${r.sourcePeriod}:${r.sourceCategoryCode}`;
      if (identities.has(identity)) diagnostics.push({ code: "DUPLICATE_SPENDING_IDENTITY", message: identity });
      identities.add(identity);
      if (!wanted.has(r.recordId) || JSON.stringify(r) !== JSON.stringify(wanted.get(r.recordId))) diagnostics.push({ code: "SPENDING_SOURCE_RECONCILIATION_FAILED", message: `Source identity, hierarchy, value, unit, period, geography, provenance or calculated linkage mismatch: ${r.recordId}` });
      else validIds.add(r.recordId);
    } catch (error) { diagnostics.push({ code: "INVALID_SPENDING_RECORD", message: error instanceof Error ? error.message : String(error) }); }
  }
  for (const id of wanted.keys()) if (!validIds.has(id)) diagnostics.push({ code: "MISSING_REQUIRED_SPENDING_ROW", message: id });
  const count = family === "defra" ? 32 : 53;
  if (wanted.size !== count || records.length !== count) diagnostics.push({ code: "SPENDING_COUNT_MISMATCH", message: `Expected ${count} selected ${layer} records; received ${records.length}` });
  return {
    status: diagnostics.length ? "FAILED" as const : "COMPLETE" as const, scope: spendingExtracts[family].scope,
    expectedRecordCount: count, actualRecordCount: records.length, diagnostics,
    cityCoverage: { status: "NOT_APPLICABLE", reason: "National source survey evidence; no city observations or eight-city coverage requirement." },
    householdProfileCoverage: { status: "NOT_ESTABLISHED", diagnostic: "HOUSEHOLD_SPENDING_MODEL_NOT_IMPLEMENTED", reason: "No fixed headcounts, open-ended composition conversion, OECD, child/adult or city multipliers." },
    productMapping: { status: "NOT_APPROVED", diagnostic: "ESSENTIALS_LIFESTYLE_MAPPING_NOT_APPROVED" },
  };
}
/** Mandatory category-specific gate for deserialized observed and calculated artifacts. */
export function validateSpendingArtifact(family: SpendingFamily, layer: SpendingLayer, raw: unknown, snapshots: readonly SnapshotMetadata[] = spendingSnapshots) {
  const artifact = referenceArtifactSchema.parse(raw);
  const coverage = validateSpendingCoverage(family, layer, artifact.records);
  if (coverage.status !== "COMPLETE") throw new Error(JSON.stringify(coverage.diagnostics));
  const registry = z.array(snapshotMetadataSchema).parse(snapshots);
  if (new Set(registry.map((s) => s.snapshotId)).size !== registry.length) throw new Error("Duplicate spending snapshot registry IDs");
  const extract = spendingExtracts[family];
  const needed = [extract.snapshot, ...extract.supportingSources.map((s) => s.snapshot)].map((s) => snapshotMetadataSchema.parse(s));
  for (const trusted of needed) if (JSON.stringify(registry.find((s) => s.snapshotId === trusted.snapshotId)) !== JSON.stringify(trusted)) throw new Error("Spending source/supporting snapshot registry does not reconcile");
  return artifact;
}
export function buildSpendingRelease(family: SpendingFamily, inputs: readonly unknown[] = [spendingExtracts[family]]) {
  const ingestions = inputs.map((e) => ingestSpending(family, e));
  const records = ingestions.flatMap<AuditRecord>((e) => e.run.records).sort((a,b) => a.recordId.localeCompare(b.recordId,"en"));
  const coverage = validateSpendingCoverage(family,"observed",records);
  const manifest = { releaseId: `ukmr-${family === "defra" ? "groceries-fye2024" : "household-spending-fye2025"}-v1`, schemaVersion: "1.6.0", generatedAt: "2026-09-14T17:18:07Z", sourceSnapshotIds: [...new Set(records.map((r) => r.provenance.snapshotId))].sort(), recordCount: records.length };
  const audit = auditArtifactSchema.parse({ kind: "AUDIT", manifest, records });
  let reference;
  let calculated;
  let calculatedCoverage;
  const validationDiagnostics: string[] = [];
  if (coverage.status === "COMPLETE" && ingestions.every(({run}) => run.status === "SUCCESS" && run.rows.length === run.counts.inputRows && run.counts.inputRows === run.counts.acceptedRows + run.counts.rejectedRows)) {
    try {
      reference = validateSpendingArtifact(family,"observed",{ kind: "REFERENCE_ARTIFACT", manifest, records });
      const monthly = records.map(monthlyEquivalent);
      calculatedCoverage = validateSpendingCoverage(family,"calculated",monthly);
      calculated = validateSpendingArtifact(family,"calculated",{ kind: "REFERENCE_ARTIFACT", manifest: { ...manifest, releaseId: `${manifest.releaseId}-monthly` }, records: monthly });
    } catch (error) { validationDiagnostics.push(error instanceof Error ? error.message : String(error)); }
  }
  const source = spendingExtracts[family];
  return { status: reference && calculated ? "SUCCESS" as const : "FAILED" as const, imports: ingestions.map((e) => e.input), runs: ingestions.map((e) => e.run), audit, reference, calculated, coverage, calculatedCoverage, validationDiagnostics,
    sourceSelection: { scope: source.scope, accounting: source.selectionAccounting, excludedRows: source.excludedRows, supportingSources: source.supportingSources } };
}
