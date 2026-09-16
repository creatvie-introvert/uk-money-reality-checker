import type { EvidenceRecord } from "@/engine/loaders";
import type { DatasetKey } from "@/engine/loaders/datasets";

export interface PublicSource {
  organisation: string;
  title: string;
  url: string;
  period: string;
  linkContext?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  classification: "Published evidence" | "Reference evidence only";
}
// Explicit allowlist projection: never serialize price fields, QA payloads or modelled fixtures.
// Source context is editorial coverage copy, not a redistribution of provider tariff tables.
export function projectSourceCitations(records: readonly EvidenceRecord<DatasetKey>[]): PublicSource[] {
  const projected = records.map((record): PublicSource => {
    if (record.valueType !== "OBSERVED_DATA" || !["RELEASE_READY", "REFERENCE_ONLY"].includes(record.releaseStatus)) throw new Error("Unsupported public evidence");
    if (!record.provenance.sourceUrl || !record.provenance.sourcePeriod) throw new Error("Public evidence requires a source URL and period");
    return {
      organisation: record.provenance.organisation,
      title: record.provenance.publicationTitle,
      url: record.provenance.sourceUrl,
      period: record.provenance.sourcePeriod,
      effectiveFrom: record.provenance.effectiveFrom,
      effectiveTo: record.provenance.effectiveTo,
      classification: record.releaseStatus === "REFERENCE_ONLY" ? "Reference evidence only" : "Published evidence",
    };
  });
  return [...new Map(projected.map((source) => [JSON.stringify(source), source])).values()];
}
