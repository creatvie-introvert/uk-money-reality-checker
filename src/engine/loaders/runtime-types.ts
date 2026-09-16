import type { AuditRecord } from "../../data/schemas/records";
import type { DatasetKey, activeDatasets } from "./datasets";
import type { DeepReadonly } from "./index";
// Required provenance fields remain for existing income-schema validation and result lineage.
// Optional extraction/QA baggage is not part of the calculator port.
type RuntimeRecord<R extends AuditRecord> = R extends AuditRecord ? Omit<R, "qa" | "provenance"> & {
  provenance: Pick<R["provenance"], "sourceId" | "organisation" | "publicationTitle" | "sourceUrl" | "sourceFormat" | "publicationDate" | "sourcePeriod" | "effectiveFrom" | "effectiveTo" | "retrievedAt" | "importedAt" | "snapshotId" | "licenceReference" | "methodologyNotes" | "limitations">;
} & (R extends { category: "council_tax" } ? { qa: { displayedAnnualGbp: string } } : object) : never;
export type RuntimeEvidence = DeepReadonly<RuntimeRecord<AuditRecord>>;
export type RuntimeEvidenceRecord<K extends DatasetKey> = Extract<RuntimeEvidence, { category: typeof activeDatasets[K]["category"] }>;
export interface EvidenceMetadata {
  readonly version: string;
  readonly datasets: readonly {
    readonly dataset: DatasetKey; readonly releaseId: string; readonly schemaVersion: string;
    readonly generatedAt: string; readonly sourceSnapshotIds: readonly string[]; readonly recordCount: number;
    readonly checksum?: string; readonly kind: "DIRECT_EVIDENCE_RELEASE" | "REFERENCE_ARTIFACT" | "AUDIT"; readonly sourcePeriod: string;
  }[];
}
