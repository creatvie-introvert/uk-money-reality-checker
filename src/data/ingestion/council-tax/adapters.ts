import { z } from "zod";

import type { IngestionAdapter } from "../contracts";
import { snapshotMetadataSchema } from "../snapshot";
import { councilTaxBandSchema, councilTaxRecordSchema, type CouncilTaxRecord } from "../../schemas/records";
import { councilTaxAuthorities } from "./authorities";

export const councilTaxExtractSchema = z.strictObject({
  extractKind: z.literal("UKMR_CONTROLLED_EXTRACT"), extractVersion: z.literal("1.0.0"),
  description: z.string().min(1), snapshot: snapshotMetadataSchema,
  importedAt: z.iso.datetime(), importVersion: z.literal("council-tax-2026-27-v1"),
  releaseStatus: z.literal("RELEASE_READY"), methodologyNotes: z.string().min(1),
  rows: z.array(z.unknown()),
});
const rowSchema = z.strictObject({
  authorityName: z.string().min(1), authorityCode: z.string().min(1).optional(),
  nation: z.enum(["England", "Scotland"]), taxYear: z.literal("2026/27"), band: councilTaxBandSchema,
  chargeScope: councilTaxRecordSchema.shape.chargeScope,
  ...councilTaxRecordSchema.shape.qa.shape,
  effectiveFrom: z.literal("2026-04-01"), effectiveTo: z.literal("2027-03-31"),
});

function adapter(nation: "England" | "Scotland"): IngestionAdapter<z.infer<typeof rowSchema>, CouncilTaxRecord> {
  const sourceId = nation === "England" ? "SRC-002" : "SRC-020";
  return {
    id: nation === "England" ? "mhclg-table9-council-tax" : "scottish-council-tax-bands",
    version: "1.0.0", sourceId, category: "council_tax", kind: "SOURCE",
    acceptedSourceFormats: nation === "England" ? ["ODS"] : ["XLSX"],
    rowSchema, outputSchema: councilTaxRecordSchema,
    parsePayload: (payload) => {
      if (typeof payload !== "string") throw new Error("Expected controlled extract JSON string");
      return councilTaxExtractSchema.parse(JSON.parse(payload)).rows;
    },
    sourceIdentifier: (row) => `${row.nation}:${row.authorityName}:${row.band}:${row.taxYear}`,
    normalize: (row, context) => {
      const authority = councilTaxAuthorities.find((a) => a.name === row.authorityName && a.nation === nation);
      if (!authority || row.nation !== nation || row.authorityCode !== authority.code || row.sourceAuthorityName.trim() !== authority.name) {
        return { diagnostics: [{ code: "GEOGRAPHY_MAPPING_FAILURE", message: "Authority name/code/nation does not exactly match the reviewed source mapping" }] };
      }
      const expectedTable = nation === "England" ? "Table_9" : "CT by Band, 2026-27";
      if (row.sourceTable !== expectedTable || context.releaseStatus !== "RELEASE_READY") {
        return { diagnostics: [{ code: "SOURCE_REVIEW_REQUIRED", message: "Council-tax table and RELEASE_READY import scope required" }] };
      }
      const { source, snapshot, importedAt, importVersion } = context;
      return { record: {
        recordId: `${sourceId}:${authority.code ?? authority.name}:${row.taxYear}:${row.band}`,
        category: "council_tax", dataset: "council-tax-2026-27", valueType: "OBSERVED_DATA", releaseStatus: context.releaseStatus,
        nation, taxYear: row.taxYear, band: row.band, unit: "GBP/year", chargeScope: row.chargeScope,
        annualChargeGbp: Number(row.displayedAnnualGbp),
        effectiveFrom: row.effectiveFrom, effectiveTo: row.effectiveTo,
        geography: { mvpCityId: authority.cityId, official: { geographyType: "local_authority", name: authority.name, code: authority.code, sourceId } },
        qa: {
          rawSourceValue: row.rawSourceValue, displayedAnnualGbp: row.displayedAnnualGbp,
          sourceTable: row.sourceTable, sourceCell: row.sourceCell, sourceNumberFormat: row.sourceNumberFormat,
          sourceAuthorityName: row.sourceAuthorityName,
        },
        provenance: {
          sourceId, organisation: source.organisation, publicationTitle: source.publicationTitle,
          sourceUrl: snapshot.retention === "METADATA_ONLY" ? snapshot.sourceUrl : source.sourceUrl,
          sourceReference: snapshot.retention === "METADATA_ONLY" ? snapshot.sourceReference : source.sourceReference,
          sourceFormat: snapshot.sourceFormat, sourcePeriod: row.taxYear,
          effectiveFrom: row.effectiveFrom, effectiveTo: row.effectiveTo,
          retrievedAt: snapshot.retrievedAt, importedAt, importVersion, parserVersion: "1.0.0",
          snapshotId: snapshot.snapshotId, snapshotChecksum: snapshot.checksum,
          licenceReference: source.licenceReference,
        },
      } };
    },
  };
}
export const englandCouncilTaxAdapter = adapter("England");
export const scotlandCouncilTaxAdapter = adapter("Scotland");
