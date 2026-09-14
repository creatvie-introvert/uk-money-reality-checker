import { z } from "zod";
import { waterTariffRecordSchema, waterBillingRegimeSchema, waterServiceComponentSchema, waterTariffComponentSchema, waterChargeUnitSchema, type WaterTariffRecord } from "../../schemas/records";
import type { IngestionAdapter } from "../contracts";
import { snapshotMetadataSchema } from "../snapshot";
import { waterExtracts } from "./sources";

export const waterExtractSchema = z.strictObject({
  extractKind: z.literal("UKMR_CONTROLLED_EXTRACT"), extractVersion: z.literal("1.0.0"),
  key: z.string(), providerId: z.string(), providerName: z.string(), regulatedCompany: z.string(),
  sourceId: z.string(), publicationTitle: z.string(), scope: z.string(), conditions: z.array(z.string()),
  sourceReference: z.string(), sourcePeriod: z.literal("2026/27"), effectiveFrom: z.literal("2026-04-01"), effectiveTo: z.literal("2027-03-31"),
  importedAt: z.iso.datetime(), importVersion: z.literal("water-v1"), releaseStatus: z.literal("RELEASE_READY"),
  excludedSourceContent: z.string(), snapshot: snapshotMetadataSchema,
  reviewMethod: z.literal("MANUAL_PRIMARY_SOURCE_CELL_REVIEW"), captureFile: z.string().optional(),
  periodEvidence: z.strictObject({ url: z.url(), reference: z.string(), captureFile: z.string(), checksum: z.string() }).optional(),
  rows: z.array(z.unknown()),
});
export const waterRowSchema = z.strictObject({
  rowId: z.string().min(1), providerId: z.string().min(1), billingRegime: waterBillingRegimeSchema,
  serviceComponent: waterServiceComponentSchema, tariffComponent: waterTariffComponentSchema,
  variant: z.string().min(1), rawAmount: z.string().regex(/^\d+(\.\d+)?$/).refine((s) => Number.isFinite(Number(s)) && Number(s) > 0),
  unit: waterChargeUnitSchema, effectiveFrom: z.iso.date(), effectiveTo: z.iso.date(),
  sourceReference: z.string().min(1), conditions: z.array(z.string().min(1)),
  aggregationRole: z.enum(["component", "alternative_total"]), councilTaxBand: z.enum(["A", "B", "C", "D", "E", "F", "G", "H"]).optional(),
});
type Row = z.infer<typeof waterRowSchema>;
/** Variants/bands represent different conditional tariffs, not duplicate charges. */
export function waterTariffIdentity(r: Pick<WaterTariffRecord, "providerId" | "billingRegime" | "serviceComponent" | "tariffComponent" | "variant" | "councilTaxBand" | "effectiveFrom" | "effectiveTo">) {
  return [r.providerId, r.billingRegime, r.serviceComponent, r.tariffComponent, r.variant, r.councilTaxBand ?? "", r.effectiveFrom, r.effectiveTo].join(":");
}
export function waterAdapter(sourceId: string): IngestionAdapter<Row, WaterTariffRecord> {
  const extract = waterExtractSchema.parse(waterExtracts.find((s) => s.sourceId === sourceId));
  const reviewedRows = extract.rows.map((r) => waterRowSchema.parse(r));
  return {
    id: `water-${extract.key}`, version: "1.0.0", sourceId, category: "water_tariff", kind: "SOURCE",
    acceptedSourceFormats: [extract.snapshot.sourceFormat], rowSchema: waterRowSchema, outputSchema: waterTariffRecordSchema,
    parsePayload: (payload) => waterExtractSchema.parse(JSON.parse(String(payload))).rows,
    sourceIdentifier: waterTariffIdentity,
    normalize: (r, context) => {
      const reviewed = reviewedRows.find((candidate) => candidate.rowId === r.rowId);
      if (!reviewed || JSON.stringify(reviewed) !== JSON.stringify(r)) return { diagnostics: [{ code: "SOURCE_REVIEW_REQUIRED", message: "Tariff row must match reviewed provider, scope, period, component, unit, value and conditions; no fallback or occupancy model" }] };
      if (context.releaseStatus !== "RELEASE_READY") return { diagnostics: [{ code: "SOURCE_REVIEW_REQUIRED", message: "Published tariff facts require reviewed direct-evidence classification" }] };
      const { source, snapshot, importedAt, importVersion } = context;
      return { record: {
        recordId: `${sourceId}:${r.rowId}:2026-27`, dataset: "water-household-2026-27", category: "water_tariff", valueType: "OBSERVED_DATA", releaseStatus: context.releaseStatus,
        providerId: r.providerId, regulatedCompany: extract.regulatedCompany,
        geography: { official: { geographyType: extract.key === "scottish-water" ? "country" : "provider_supply_area", name: extract.scope, sourceId } },
        billingRegime: r.billingRegime, serviceComponent: r.serviceComponent, tariffComponent: r.tariffComponent, variant: r.variant,
        aggregationRole: r.aggregationRole, applicability: { sourceScope: extract.scope, conditions: [...extract.conditions, ...r.conditions] },
        amount: Number(r.rawAmount), unit: r.unit, councilTaxBand: r.councilTaxBand, effectiveFrom: r.effectiveFrom, effectiveTo: r.effectiveTo,
        qa: { ...r, reviewMethod: extract.reviewMethod, ...(extract.periodEvidence ? { periodEvidence: extract.periodEvidence } : {}) },
        provenance: {
          sourceId, organisation: source.organisation, publicationTitle: extract.publicationTitle,
          sourceUrl: snapshot.retention === "METADATA_ONLY" ? snapshot.sourceUrl : source.sourceUrl,
          sourceReference: r.sourceReference, sourceFormat: snapshot.sourceFormat, sourcePeriod: extract.sourcePeriod,
          effectiveFrom: r.effectiveFrom, effectiveTo: r.effectiveTo, retrievedAt: snapshot.retrievedAt, importedAt, importVersion,
          parserVersion: "1.0.0", snapshotId: snapshot.snapshotId, snapshotChecksum: snapshot.checksum, licenceReference: source.licenceReference,
          methodologyNotes: "Manual review of official source cells; decimal text normalized to numbers in source-native units. No bill, consumption or monthly arithmetic. Source charge year 2026/27 represented as 1 April 2026–31 March 2027. RELEASE_READY applies to the stated provider tariff scope, not automatic city/address selection.",
          limitations: [...extract.conditions, "Provider reuse/licensing unresolved; originals not retained in Git.", ...(!snapshot.checksum ? ["Browser-reviewed page; original bytes unavailable for checksum. Revalidation requires the official page."] : [])],
        },
      } };
    },
  };
}
