import type { DatasetKey } from "@/engine/loaders/datasets";
import type { RuntimeEvidence, RuntimeEvidenceRecord, EvidenceMetadata } from "@/engine/loaders/runtime-types";
export type PackedRecord<K extends DatasetKey> = Omit<RuntimeEvidenceRecord<K>, "provenance"> & { readonly provenanceIndex: number };
export interface CalculatorEvidenceDto {
  readonly version: "calculator-evidence-v1";
  readonly metadata: EvidenceMetadata;
  readonly provenance: readonly RuntimeEvidence["provenance"][];
  readonly records: { readonly [K in DatasetKey]: readonly PackedRecord<K>[] };
}
