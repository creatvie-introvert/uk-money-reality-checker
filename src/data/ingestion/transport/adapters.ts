import { z } from "zod";
import { transportFareRecordSchema, type TransportFareRecord } from "../../schemas/records";
import { mvpCityIdSchema } from "../../schemas/enums";
import type { IngestionAdapter } from "../contracts";
import { snapshotMetadataSchema } from "../snapshot";
import { transportExtracts } from "./sources";

export const transportExtractSchema = z.strictObject({
  extractKind: z.literal("UKMR_CONTROLLED_EXTRACT"), extractVersion: z.literal("1.0.0"),
  key: z.string().min(1), sourceId: z.string().min(1), organisation: z.string().min(1), publicationTitle: z.string().min(1),
  sourceReference: z.string().min(1), reviewMethod: z.literal("MANUAL_PRIMARY_SOURCE_CELL_REVIEW"),
  importedAt: z.iso.datetime(), importVersion: z.literal("transport-v1"), releaseStatus: z.literal("RELEASE_READY"),
  supportingEvidence: z.array(z.strictObject({ sourceUrl: z.url(), sourceReference: z.string(), publicationDate: z.iso.date().optional(), publishedEffectiveFrom: z.iso.date().optional(), captureFile: z.string(), checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/) })),
  limitations: z.array(z.string()), snapshot: snapshotMetadataSchema, captureFile: z.string().optional(), rows: z.array(z.unknown()),
});
const fields = transportFareRecordSchema.shape;
export const transportRowSchema = z.strictObject({
  rowId: z.string().min(1), cityId: mvpCityIdSchema, operator: fields.operator, network: fields.network,
  productName: fields.productName, rawAmount: z.string().regex(/^\d+(\.\d+)?$/).refine((s) => Number.isFinite(Number(s)) && Number(s) > 0),
  mode: fields.mode, includedModes: fields.includedModes, fareType: fields.fareType, fareUnit: fields.fareUnit,
  validityPeriod: fields.validityPeriod, validity: fields.validity, zonesOrArea: fields.zonesOrArea,
  paymentMethod: fields.paymentMethod, passengerType: fields.passengerType, peakStatus: fields.peakStatus,
  airportApplicability: fields.airportApplicability, conditions: z.array(z.string().min(1)),
  effectiveFrom: fields.effectiveFrom, effectiveTo: fields.effectiveTo, effectiveDateBasis: fields.effectiveDateBasis,
  verifiedAsOf: fields.verifiedAsOf, sourceReference: z.string().min(1),
});
type Row = z.infer<typeof transportRowSchema>;
/** Payment, passenger and cap/season variants are materially different products. */
export function transportIdentity(r: Pick<TransportFareRecord, "operator" | "network" | "productName" | "zonesOrArea" | "includedModes" | "paymentMethod" | "passengerType" | "fareType" | "validityPeriod" | "peakStatus" | "effectiveFrom" | "effectiveTo">) {
  return JSON.stringify([r.operator, r.network, r.productName, r.zonesOrArea, [...r.includedModes].sort(), r.paymentMethod, r.passengerType, r.fareType, r.validityPeriod, r.peakStatus, r.effectiveFrom, r.effectiveTo]);
}
export function transportAdapter(key: string): IngestionAdapter<Row, TransportFareRecord> {
  const e = transportExtractSchema.parse(transportExtracts.find((s) => s.key === key));
  const reviewedRows = e.rows.map((r) => transportRowSchema.parse(r));
  return {
    id: `transport-${key}`, version: "1.0.0", sourceId: e.sourceId, category: "transport_fare", kind: "SOURCE",
    acceptedSourceFormats: ["HTML"], rowSchema: transportRowSchema, outputSchema: transportFareRecordSchema,
    parsePayload: (payload) => transportExtractSchema.parse(JSON.parse(String(payload))).rows,
    sourceIdentifier: transportIdentity,
    normalize: (r, context) => {
      const reviewed = reviewedRows.find((candidate) => candidate.rowId === r.rowId);
      if (!reviewed || JSON.stringify(reviewed) !== JSON.stringify(r) || context.releaseStatus !== "RELEASE_READY") return { diagnostics: [{ code: "SOURCE_REVIEW_REQUIRED", message: "Fare must match reviewed amount, product, payment, modes, network, scope, date and eligibility; no substitute or model fallback" }] };
      const { rowId, rawAmount, cityId, sourceReference, conditions, ...fact } = r;
      const { snapshot, importedAt, importVersion, source } = context;
      return { record: {
        ...fact, recordId: `${e.sourceId}:${key}:${rowId}:2026-09`, dataset: "transport-reviewed-2026-09", category: "transport_fare",
        valueType: "OBSERVED_DATA", releaseStatus: "RELEASE_READY", authorityOrOperator: e.organisation, fareGbp: Number(rawAmount),
        publishedGeography: { official: { geographyType: "fare_network_scope", name: r.zonesOrArea, sourceId: e.sourceId } },
        applicability: { cityIds: [cityId], basis: "CONDITIONAL_NETWORK_PRODUCT", cityDefault: false, conditions: [...conditions, "Applies only to journeys eligible for this product within the stated network/zone; not a universal city fare."] },
        qa: { rawAmount, sourceReference, reviewMethod: e.reviewMethod, supportingEvidence: e.supportingEvidence },
        provenance: {
          sourceId: e.sourceId, organisation: e.organisation, publicationTitle: e.publicationTitle,
          sourceUrl: snapshot.retention === "METADATA_ONLY" ? snapshot.sourceUrl : undefined,
          sourceReference, sourceFormat: snapshot.sourceFormat, sourcePeriod: `Current fare verified ${r.verifiedAsOf}`,
          effectiveFrom: r.effectiveFrom, effectiveTo: r.effectiveTo, retrievedAt: snapshot.retrievedAt, importedAt, importVersion,
          parserVersion: "1.0.0", snapshotId: snapshot.snapshotId, snapshotChecksum: snapshot.checksum, licenceReference: source.licenceReference,
          methodologyNotes: "Manual review of current official product facts. Bounds represent the verified date only, not fare commencement or withdrawal. No city default, fare optimization, trip count, or frequency arithmetic.",
          limitations: [...e.limitations, "Original redistribution/licensing unresolved; metadata-only snapshot.", "Historic fare commencement and future validity are not asserted by this as-of extract."],
        },
      } };
    },
  };
}
