import { rentSourceRowSchema } from "./adapter";
import { rentRecordSchema } from "../../schemas/records";
import { rentGeographies, rentMeasures, rentSourcePeriod } from "./mappings";

export function validateRentCoverage(records: readonly unknown[]) {
  const diagnostics: { code: string; message: string }[] = [];
  const seen = new Set<string>();
  const ids = new Set<string>();
  for (const raw of records) {
    const parsed = rentRecordSchema.safeParse(raw);
    if (!parsed.success) {
      diagnostics.push({ code: "INVALID_RENT_RECORD", message: parsed.error.message });
      continue;
    }
    const r = parsed.data;
    const geo = rentGeographies.find((g) => g.cityId === r.geography.mvpCityId);
    const measure = rentMeasures.find((m) => m.bedroomBand === r.bedroomBand);
    if (!geo || geo.code !== r.geography.official.code || geo.name !== r.geography.official.name || geo.type !== r.geography.official.geographyType || geo.consumerLabel !== r.geography.consumerLabel || r.geography.official.sourceId !== "SRC-001") {
      diagnostics.push({ code: "GEOGRAPHY_MAPPING_FAILURE", message: `Unapproved geography: ${r.recordId}` });
      continue;
    }
    if (!measure || r.propertyType !== undefined || r.sourcePeriod !== rentSourcePeriod || r.provenance.sourceId !== "SRC-001" || !r.provenance.snapshotChecksum || !r.provenance.snapshotId || r.releaseStatus !== "RELEASE_READY" || r.valueType !== "OBSERVED_DATA") {
      diagnostics.push({ code: "INVALID_RENT_EVIDENCE", message: `Wrong measure, month, provenance or release classification: ${r.recordId}` });
      continue;
    }
    const qa = rentSourceRowSchema.safeParse(Object.fromEntries(Object.entries(r.qa).filter(([key]) => key !== "geographyRelationship")));
    if (!qa.success || qa.data.sourceState !== "NUMERIC" || !qa.data.rawSourceValue ||
        !/^[0-9]+$/.test(qa.data.rawSourceValue) || Number(qa.data.rawSourceValue) !== r.valueGbp ||
        qa.data.areaCode !== geo.code || qa.data.areaName !== geo.name || qa.data.regionOrCountryName !== geo.region ||
        qa.data.sourcePeriod !== rentSourcePeriod || qa.data.rawTimePeriod !== "46204" ||
        qa.data.sourceMeasure !== measure.source || qa.data.sourceTable !== "Table 1" ||
        qa.data.sourceCell !== `${measure.column}${qa.data.sourceRow}`) {
      diagnostics.push({ code: "INVALID_RENT_SOURCE_STATE", message: `Numeric source state and matching source fields required: ${r.recordId}` });
      continue;
    }
    const key = `${geo.code}:${measure.column}`;
    if (seen.has(key) || ids.has(r.recordId)) diagnostics.push({ code: "DUPLICATE_RENT_MEASURE", message: key });
    seen.add(key);
    ids.add(r.recordId);
  }
  for (const geo of rentGeographies) for (const measure of rentMeasures) {
    const key = `${geo.code}:${measure.column}`;
    if (!seen.has(key)) diagnostics.push({ code: "MISSING_REQUIRED_RENT_MEASURE", message: `${geo.consumerLabel}: ${measure.source}` });
  }
  return {
    status: diagnostics.length ? "FAILED" as const : "COMPLETE" as const,
    sourcePeriod: rentSourcePeriod, requiredRecordCount: 35, actualRecordCount: records.length,
    supportedCityIds: rentGeographies.map((g) => g.cityId), diagnostics,
    mvpCoverage: { status: "INCOMPLETE" as const, diagnostics: [{ code: "EDINBURGH_RENT_SOURCE_UNRESOLVED", cityId: "LOC-EDI", message: "No exact Edinburgh / City of Edinburgh PIPR row or closer current ONS city source verified. Excluded from supported release scope; no fallback." }] },
  };
}
