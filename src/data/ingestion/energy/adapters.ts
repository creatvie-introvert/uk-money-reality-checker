import { z } from "zod";
import { energyConsumptionRecordSchema, energyPriceRecordSchema } from "../../schemas/records";
import type { AdapterContext, IngestionAdapter } from "../contracts";
import { snapshotMetadataSchema } from "../snapshot";
import { needVocabulary } from "./sources";

const extractBase = {
  extractKind: z.literal("UKMR_CONTROLLED_EXTRACT"), extractVersion: z.literal("1.0.0"),
  snapshot: snapshotMetadataSchema, importedAt: z.iso.datetime(), importVersion: z.literal("energy-v1"), rows: z.array(z.unknown()),
};
export const needExtractSchema = z.strictObject({
  ...extractBase, publicationDate: z.literal("2026-06-11"), sourcePeriod: z.literal("2024"), releaseStatus: z.literal("REFERENCE_ONLY"),
  scope: z.record(z.string(), z.unknown()), sourceHeaders: z.record(z.string(), z.string()), profiles: z.array(z.unknown()),
});
export const priceExtractSchema = z.strictObject({
  ...extractBase, sourcePeriod: z.literal("2026-Q3"), releaseStatus: z.literal("RELEASE_READY"),
  officialPageUrl: z.url(), officialPageChecksum: z.string().min(1), excludedSourceRows: z.array(z.unknown()),
});
export const needRowSchema = z.strictObject({
  profileId: z.string().min(1), sourceYear: z.literal(2024), sourceNationGroup: z.enum(["England and Wales", "Scotland"]),
  region: z.string().min(1), regionCode: z.string().nullable(),
  propertyType: z.string().min(1), propertyAge: z.string().min(1), bedroomBand: z.string().min(1),
  gasPresent: z.enum(["Yes", "No"]), electricityType: z.enum(["Standard", "E7"]),
  sampleCount: z.number().int().nonnegative(), sourceTable: z.literal("Table"), sourceRow: z.number().int().positive(),
  fuel: z.enum(["gas", "electricity"]), statistic: z.enum(["mean", "lower_quartile", "median", "upper_quartile"]),
  rawAnnualKwh: z.string(), sourceCell: z.string().regex(/^[A-Q][1-9]\d*$/), sourceHeading: z.string().min(1),
});
export const priceRowSchema = z.strictObject({
  region: z.string().min(1), fuel: z.enum(["gas", "electricity"]),
  paymentMethod: z.enum(["Direct Debit", "prepayment meter", "standard credit"]),
  electricityTariffType: z.enum(["single rate", "multi-rate"]).optional(),
  effectiveFrom: z.iso.date(), effectiveTo: z.iso.date(), rawStandingCharge: z.string(), rawUnitRate: z.string(),
  sourceTableId: z.string().min(1), sourceTableTitle: z.string().min(1), sourceRow: z.number().int().min(2),
  standingChargeColumn: z.literal("Daily standing charge July to September 2026"), unitRateColumn: z.literal("Unit rate July to September 2026"),
});
const regions: Record<string, string> = {
  "North East": "E12000001", "North West": "E12000002", "Yorkshire and The Humber": "E12000003", "East Midlands": "E12000004", "West Midlands": "E12000005", "East of England": "E12000006", "London": "E12000007", "South East": "E12000008", "South West": "E12000009", "Wales": "W92000004",
};
export const priceRegions = ["North Western England", "North Eastern England", "Yorkshire", "Northern Scotland", "Southern England", "Southern Scotland", "Merseyside and Northern Wales", "London", "South Eastern England", "Eastern England", "East Midlands", "West Midlands", "South Western England", "Southern Wales"];
export const needMethodology = "Observed NEED source combinations, not modelled household defaults. Native vocabularies retained. No adult occupancy, heating type or city-level joint coverage. Source year 2024: gas mid-May 2024 to mid-May 2025; electricity February 2024 to January 2025. Only reviewed selected profiles are retained, not the full joint table.";
export const priceMethodology = "Published regional price-cap rates, converted from pence to GBP by division by 100. No bill calculation, tax adjustment or city mapping. Multi-rate is the published combined cap measure, not an individual day/night tariff rate. Effective period follows the selected table column headings.";
function provenance(context: AdapterContext, sourcePeriod: string, methodologyNotes: string) {
  const { source, snapshot, importedAt, importVersion } = context;
  return {
    sourceId: source.sourceId, organisation: source.organisation, publicationTitle: source.publicationTitle,
    sourceUrl: snapshot.retention === "METADATA_ONLY" ? snapshot.sourceUrl : source.sourceUrl,
    sourceReference: source.sourceReference, sourceFormat: snapshot.sourceFormat, sourcePeriod,
    retrievedAt: snapshot.retrievedAt, importedAt, importVersion, parserVersion: "1.0.0",
    snapshotId: snapshot.snapshotId, snapshotChecksum: snapshot.checksum, licenceReference: source.licenceReference, methodologyNotes,
  };
}
export type NeedRecord = z.infer<typeof energyConsumptionRecordSchema>;
export type PriceRecord = z.infer<typeof energyPriceRecordSchema>;
export const needAdapter: IngestionAdapter<z.infer<typeof needRowSchema>, NeedRecord> = {
  id: "desnz-need-multiple-attributes", version: "1.0.0", sourceId: "SRC-003", category: "energy_consumption", kind: "SOURCE", acceptedSourceFormats: ["XLSX"],
  rowSchema: needRowSchema, outputSchema: energyConsumptionRecordSchema,
  parsePayload: (payload) => needExtractSchema.parse(JSON.parse(String(payload))).rows,
  sourceIdentifier: (r) => [r.sourceYear, r.sourceNationGroup, r.region, r.propertyType, r.propertyAge, r.bedroomBand, r.gasPresent, r.electricityType, r.fuel, r.statistic].join(":"),
  normalize: (r, context) => {
    const ew = r.sourceNationGroup === "England and Wales";
    const vocabulary = ew ? [needVocabulary.ew.D, needVocabulary.ew.E, needVocabulary.ew.F] : [needVocabulary.scotland.B, needVocabulary.scotland.C, needVocabulary.scotland.D];
    if ([r.propertyType, r.propertyAge, r.bedroomBand].some((value, i) => !(vocabulary[i] as readonly string[]).includes(value))) return { diagnostics: [{ code: "UNSUPPORTED_SOURCE_VALUE", message: "Unreviewed or harmonized source category" }] };
    if (ew ? regions[r.region] !== r.regionCode : r.region !== "Scotland" || r.regionCode !== null) return { diagnostics: [{ code: "GEOGRAPHY_MAPPING_FAILURE", message: "NEED requires exact source region; Scotland has national geography only" }] };
    if (!/^\d+(\.\d+)?$/.test(r.rawAnnualKwh) || !Number.isFinite(Number(r.rawAnnualKwh)) || Number(r.rawAnnualKwh) <= 0) return { diagnostics: [{ code: "INVALID_NUMERIC_VALUE", field: "rawAnnualKwh", message: "Positive observed kWh required; source markers never become zero" }] };
    const statisticIndex = ["mean", "lower_quartile", "median", "upper_quartile"].indexOf(r.statistic);
    const column = (r.fuel === "gas" ? ew ? "JKLM" : "HIJK" : ew ? "NOPQ" : "LMNO")[statisticIndex];
    if (r.sourceCell !== `${column}${r.sourceRow}` || context.releaseStatus !== "REFERENCE_ONLY") return { diagnostics: [{ code: "SOURCE_REVIEW_REQUIRED", message: "Wrong source cell or reference classification" }] };
    return { record: {
      recordId: `SRC-003:${r.profileId}:${r.fuel}:${r.statistic}`, dataset: "need-2026-selected-2024", category: "energy_consumption", valueType: "OBSERVED_DATA", releaseStatus: context.releaseStatus,
      geography: { official: { geographyType: ew && r.region !== "Wales" ? "region" : "country", name: r.region, ...(r.regionCode ? { code: r.regionCode } : {}), sourceId: "SRC-003" } },
      sourceYear: r.sourceYear, sourceNationGroup: r.sourceNationGroup, propertyType: r.propertyType, propertyAge: r.propertyAge, bedroomBand: r.bedroomBand, gasPresent: r.gasPresent, electricityType: r.electricityType,
      fuel: r.fuel, statistic: r.statistic, annualKwh: Number(r.rawAnnualKwh), sampleCount: r.sampleCount, unit: "kWh/year", qa: { ...r },
      provenance: { ...provenance(context, "2024", needMethodology), publicationDate: "2026-06-11", limitations: ["Partial controlled joint-table selection, not exhaustive profile coverage.", "Source excludes categories with fewer than 30 households and unmatched/imputed consumption as described in workbook cover. No city or adult-occupancy observations."] },
    } };
  },
};
export const priceAdapter: IngestionAdapter<z.infer<typeof priceRowSchema>, PriceRecord> = {
  id: "ofgem-regional-price-cap", version: "1.0.0", sourceId: "SRC-OFGEM-REGIONAL", category: "energy_price", kind: "SOURCE", acceptedSourceFormats: ["JAVASCRIPT"],
  rowSchema: priceRowSchema, outputSchema: energyPriceRecordSchema,
  parsePayload: (payload) => priceExtractSchema.parse(JSON.parse(String(payload))).rows,
  sourceIdentifier: (r) => [r.region, r.fuel, r.paymentMethod, r.electricityTariffType ?? "gas", r.effectiveFrom, r.effectiveTo].join(":"),
  normalize: (r, context) => {
    if (!priceRegions.includes(r.region)) return { diagnostics: [{ code: "GEOGRAPHY_MAPPING_FAILURE", message: "Published energy region required, not city/national average" }] };
    if (r.effectiveFrom !== "2026-07-01" || r.effectiveTo !== "2026-09-30") return { diagnostics: [{ code: "INVALID_DATE", message: "Reviewed July–September 2026 column period required" }] };
    if (context.releaseStatus !== "RELEASE_READY") return { diagnostics: [{ code: "SOURCE_REVIEW_REQUIRED", message: "Regional direct evidence must be RELEASE_READY" }] };
    const unit = /^(\d+\.\d{2}) pence per kWh$/.exec(r.rawUnitRate);
    const standing = /^(\d+\.\d{2}) pence per day$/.exec(r.rawStandingCharge);
    if (!unit || !standing || Number(unit[1]) <= 0 || Number(standing[1]) <= 0) return { diagnostics: [{ code: "INVALID_NUMERIC_VALUE", message: "Positive published pence rates required" }] };
    // Decimal text to integer hundredths of a penny, then GBP. No bill arithmetic.
    const gbp = (pence: string) => Number(pence.replace(".", "")) / 10000;
    return { record: {
      recordId: `SRC-OFGEM-REGIONAL:${r.sourceTableId}:${r.region}:2026-Q3`, dataset: "ofgem-regional-2026-q3", category: "energy_price", valueType: "OBSERVED_DATA", releaseStatus: context.releaseStatus,
      geography: { official: { geographyType: "energy_region", name: r.region, sourceId: "SRC-OFGEM-REGIONAL" } },
      fuel: r.fuel, paymentMethod: r.paymentMethod, electricityTariffType: r.electricityTariffType,
      unitRateGbpPerKwh: gbp(unit[1]), standingChargeGbpPerDay: gbp(standing[1]), rateBasis: "published_cap_rate", effectiveFrom: r.effectiveFrom, effectiveTo: r.effectiveTo, qa: { ...r },
      provenance: { ...provenance(context, "2026-Q3", priceMethodology), effectiveFrom: r.effectiveFrom, effectiveTo: r.effectiveTo, limitations: ["ENERGY_CITY_REGION_MAPPING_UNRESOLVED: postcode/DNO evidence required; no MVP city applicability assigned.", "Ofgem reuse/licensing unresolved; no OGL assumption. Raw HTML and embedded table captures are not retained in Git.", "Page includes next-quarter headings; this record uses explicit July–September table columns. Multi-rate does not supply separate peak/off-peak rates."] },
    } };
  },
};
