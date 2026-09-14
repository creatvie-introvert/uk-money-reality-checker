import { z } from "zod";
import { rentRecordSchema } from "../../schemas/records";
import type { IngestionAdapter } from "../contracts";
import { snapshotMetadataSchema } from "../snapshot";
import { rentGeographies, rentMeasures, rentSourcePeriod } from "./mappings";

export const rentExtractSchema = z.strictObject({
  extractKind: z.literal("UKMR_CONTROLLED_EXTRACT"), extractVersion: z.literal("1.0.0"),
  description: z.string().min(1), snapshot: snapshotMetadataSchema,
  publicationDate: z.literal("2026-08-19"), sourcePeriod: z.literal(rentSourcePeriod),
  importedAt: z.iso.datetime(), importVersion: z.literal("rent-2026-07-v1"),
  releaseStatus: z.literal("RELEASE_READY"), methodologyNotes: z.string().min(1),
  limitations: z.array(z.string().min(1)), rows: z.array(z.unknown()),
});
export const rentSourceRowSchema = z.strictObject({
  areaCode: z.string().min(1), areaName: z.string().min(1), regionOrCountryName: z.string().min(1),
  sourcePeriod: z.string(), rawTimePeriod: z.string(), sourceMeasure: z.string().min(1),
  rawSourceValue: z.string().nullable(), sourceState: z.enum(["NUMERIC", "NOT_AVAILABLE", "NOT_APPLICABLE", "MISSING"]),
  sourceTable: z.string(), sourceRow: z.number().int().positive(), sourceCell: z.string().min(1),
});
export type RentRecord = z.infer<typeof rentRecordSchema>;
export const rentAdapter: IngestionAdapter<z.infer<typeof rentSourceRowSchema>, RentRecord> = {
  id: "ons-pipr-rent", version: "1.0.0", sourceId: "SRC-001", category: "rent", kind: "SOURCE",
  acceptedSourceFormats: ["XLSX"], rowSchema: rentSourceRowSchema, outputSchema: rentRecordSchema,
  parsePayload: (payload) => {
    if (typeof payload !== "string") throw new Error("Expected controlled extract JSON string");
    return rentExtractSchema.parse(JSON.parse(payload)).rows;
  },
  sourceIdentifier: (row) => `${row.areaCode}:${row.sourcePeriod}:${row.sourceMeasure}`,
  normalize: (row, context) => {
    const geo = rentGeographies.find((g) => g.code === row.areaCode);
    if (!geo || geo.name !== row.areaName || geo.region !== row.regionOrCountryName) {
      return { diagnostics: [{ code: "GEOGRAPHY_MAPPING_FAILURE", message: "Exact reviewed ONS geography required; no substitution or Edinburgh fallback" }] };
    }
    if (row.sourcePeriod !== rentSourcePeriod || row.rawTimePeriod !== "46204") {
      return { diagnostics: [{ code: "INVALID_DATE", message: "Expected July 2026 source month and corresponding Excel date" }] };
    }
    const measure = rentMeasures.find((m) => m.source === row.sourceMeasure);
    if (!measure || row.sourceTable !== "Table 1" || row.sourceCell !== `${measure.column}${row.sourceRow}` || context.releaseStatus !== "RELEASE_READY") {
      return { diagnostics: [{ code: "SOURCE_REVIEW_REQUIRED", message: "Reviewed rental-price column/cell and RELEASE_READY scope required; no crossed dimensions" }] };
    }
    const expectedState = row.rawSourceValue === "[x]" ? "NOT_AVAILABLE" : row.rawSourceValue === "[z]" ? "NOT_APPLICABLE" : row.rawSourceValue === null ? "MISSING" : "NUMERIC";
    if (row.sourceState !== expectedState) {
      return { diagnostics: [{ code: "UNSUPPORTED_SOURCE_VALUE", field: "sourceState", message: "Source marker/state mismatch" }] };
    }
    if (row.sourceState !== "NUMERIC") {
      return { diagnostics: [{ code: "UNSUPPORTED_SOURCE_VALUE", field: "rawSourceValue", message: `ONS ${row.rawSourceValue ?? "blank"}: ${row.sourceState}; no numeric evidence and no zero substitution` }] };
    }
    if (!row.rawSourceValue || !/^[0-9]+$/.test(row.rawSourceValue) || !Number.isSafeInteger(Number(row.rawSourceValue)) || Number(row.rawSourceValue) <= 0) {
      return { diagnostics: [{ code: "INVALID_NUMERIC_VALUE", field: "rawSourceValue", message: "Expected positive ONS whole-pound monthly rent" }] };
    }
    const { source, snapshot, importedAt, importVersion } = context;
    return { record: {
      recordId: `SRC-001:${geo.code}:${row.sourcePeriod}:${measure.column}`,
      category: "rent", dataset: "ons-pipr-rent-2026-07", valueType: "OBSERVED_DATA", releaseStatus: context.releaseStatus,
      geography: { mvpCityId: geo.cityId, consumerLabel: geo.consumerLabel, official: { geographyType: geo.type, name: geo.name, code: geo.code, sourceId: source.sourceId } },
      bedroomBand: measure.bedroomBand, measure: "rental_price", valueGbp: Number(row.rawSourceValue), unit: "GBP/month", sourcePeriod: row.sourcePeriod,
      qa: { ...row, geographyRelationship: geo.code === "S33000009" ? "Greater Glasgow BRMA applicability to Glasgow; not Glasgow City equality" : geo.type === "region" ? "London regional applicability; not local-authority observation" : "Exact local-authority mapping" },
      provenance: {
        sourceId: source.sourceId, organisation: source.organisation, publicationTitle: source.publicationTitle,
        sourceUrl: snapshot.retention === "METADATA_ONLY" ? snapshot.sourceUrl : source.sourceUrl,
        sourceReference: snapshot.retention === "METADATA_ONLY" ? snapshot.sourceReference : source.sourceReference,
        sourceFormat: snapshot.sourceFormat, publicationDate: "2026-08-19", sourcePeriod: row.sourcePeriod,
        retrievedAt: snapshot.retrievedAt, importedAt, importVersion, parserVersion: "1.0.0",
        snapshotId: snapshot.snapshotId, snapshotChecksum: snapshot.checksum, licenceReference: source.licenceReference,
      },
    } };
  },
};
