import { createEvidenceQueries } from "@/engine/loaders/queries";
import type { DatasetKey } from "@/engine/loaders/datasets";
import type { RuntimeEvidenceRecord } from "@/engine/loaders/runtime-types";
import type { CalculatorEvidenceDto } from "./types";
function freeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
/** Accepts only build/server-validated static props, never an uploaded artifact or form input. */
export function createCalculatorEvidence(dto: CalculatorEvidenceDto) {
  if (dto.version !== "calculator-evidence-v1" || dto.metadata.datasets.length !== 10) throw new Error("Unsupported calculator evidence");
  const unpacked = Object.fromEntries(dto.metadata.datasets.map(({ dataset }) => [dataset, dto.records[dataset].map((record) => {
    const { provenanceIndex, ...fields } = record;
    const provenance = dto.provenance[provenanceIndex];
    if (!Number.isInteger(provenanceIndex) || !provenance || record.valueType !== "OBSERVED_DATA" || !["RELEASE_READY", "REFERENCE_ONLY"].includes(record.releaseStatus)) throw new Error("Invalid calculator evidence");
    return freeze({ ...fields, provenance });
  })]));
  const records = <K extends DatasetKey>(key: K) => unpacked[key] as unknown as readonly RuntimeEvidenceRecord<K>[];
  return createEvidenceQueries(freeze(dto.metadata), records);
}
