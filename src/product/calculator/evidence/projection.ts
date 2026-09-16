import { validateDataset } from "@/engine/loaders";
import { activeDatasets, engineDatasetVersion, type DatasetKey } from "@/engine/loaders/datasets";
import type { RuntimeEvidence } from "@/engine/loaders/runtime-types";
import type { CalculatorEvidenceDto } from "./types";

/** Static evidence only. User financial state never crosses this boundary. */
export function buildCalculatorEvidence(inputs?: Partial<Record<DatasetKey, unknown>>): CalculatorEvidenceDto {
  const provenance: RuntimeEvidence["provenance"][] = [];
  const lookup = new Map<string, number>();
  const records: Record<string, unknown[]> = {};
  const metadata: CalculatorEvidenceDto["metadata"]["datasets"][number][] = [];
  for (const key of Object.keys(activeDatasets) as DatasetKey[]) {
    const artifact = validateDataset(key, inputs && key in inputs ? inputs[key] : activeDatasets[key].artifact);
    metadata.push({ dataset: key, ...artifact.manifest, kind: artifact.kind, sourcePeriod: activeDatasets[key].sourcePeriod });
    // No calculator resolver reads energy reference records. Scottish water is the only bill path.
    // Other reference records remain because spending results retain their baseline provenance.
    const selected = artifact.records.filter((record) => key !== "energyPrice" && key !== "energyConsumption"
      && (record.category !== "water_tariff" || record.providerId === "scottish-water")
      && (record.category !== "rent" || Boolean(record.bedroomBand)));
    records[key] = selected.map((record) => {
      const p = record.provenance;
      const publicProvenance = {
        sourceId: p.sourceId, organisation: p.organisation, publicationTitle: p.publicationTitle,
        ...(p.sourceUrl ? { sourceUrl: p.sourceUrl } : {}), sourceFormat: p.sourceFormat,
        ...(p.publicationDate ? { publicationDate: p.publicationDate } : {}),
        ...(p.sourcePeriod ? { sourcePeriod: p.sourcePeriod } : {}),
        ...(p.effectiveFrom ? { effectiveFrom: p.effectiveFrom } : {}), ...(p.effectiveTo ? { effectiveTo: p.effectiveTo } : {}),
        // Existing income validation and exact lineage require these audited identities/timestamps.
        retrievedAt: p.retrievedAt, importedAt: p.importedAt, snapshotId: p.snapshotId,
        ...(p.licenceReference ? { licenceReference: p.licenceReference } : {}),
        ...(p.methodologyNotes ? { methodologyNotes: p.methodologyNotes } : {}), limitations: [...p.limitations],
      };
      const identity = JSON.stringify(publicProvenance);
      let provenanceIndex = lookup.get(identity);
      if (provenanceIndex === undefined) { provenanceIndex = provenance.length; lookup.set(identity, provenanceIndex); provenance.push(publicProvenance); }
      const fields = Object.fromEntries(Object.entries(record).filter(([name]) => name !== "qa" && name !== "provenance"));
      // This one field is exact monetary input, despite its historical QA container name.
      return { ...fields, ...(record.category === "council_tax" ? { qa: { displayedAnnualGbp: record.qa.displayedAnnualGbp } } : {}), provenanceIndex };
    });
  }
  // All source shapes/classifications are fully validated above. Packing only replaces provenance.
  return { version: "calculator-evidence-v1", metadata: { version: engineDatasetVersion, datasets: metadata }, provenance, records } as unknown as CalculatorEvidenceDto;
}
