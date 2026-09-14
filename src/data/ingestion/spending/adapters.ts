import { z } from "zod";
import { groceryExpenditureRecordSchema, coicopExpenditureRecordSchema, type GroceryExpenditureRecord, type CoicopExpenditureRecord } from "../../schemas/records";
import { snapshotMetadataSchema } from "../snapshot";
import type { AdapterContext, IngestionAdapter } from "../contracts";

export const spendingExtractSchema = z.strictObject({
  extractKind: z.literal("UKMR_CONTROLLED_EXTRACT"), extractVersion: z.literal("1.0.0"), family: z.enum(["defra", "ons"]),
  snapshot: snapshotMetadataSchema, publicationTitle: z.string().min(1), publicationDate: z.iso.date(), sourcePeriod: z.string(), sourceYearLabel: z.string(),
  importedAt: z.iso.datetime(), importVersion: z.literal("spending-v1"), releaseStatus: z.literal("REFERENCE_ONLY"),
  scope: z.string(), limitations: z.array(z.string()), supportingSources: z.array(z.strictObject({ role: z.string(), snapshot: snapshotMetadataSchema })),
  sourceHeaders: z.record(z.string(), z.unknown()),
  selectionAccounting: z.strictObject({ examinedRows: z.number().int().nonnegative(), selectedRows: z.number().int().nonnegative(), excludedRows: z.number().int().nonnegative() }),
  excludedRows: z.array(z.strictObject({ sourceRow: z.number().int().positive(), sourceCode: z.string(), rawValue: z.string(), reason: z.string() })),
  rows: z.array(z.unknown()),
}).superRefine((e, ctx) => {
  const c = e.selectionAccounting;
  if (c.selectedRows !== e.rows.length || c.excludedRows !== e.excludedRows.length || c.examinedRows !== c.selectedRows + c.excludedRows) ctx.addIssue({ code: "custom", path: ["selectionAccounting"], message: "All examined rows must reconcile to selected or explicitly excluded rows" });
});
const rowBase = {
  sourceCategoryCode: z.string().min(1), sourceCategoryLabel: z.string().min(1),
  rawWeeklyValue: z.string().regex(/^\d+(\.\d+)?$/).refine((s) => Number.isFinite(Number(s)) && Number(s) >= 0),
  sourceSheet: z.string().min(1), sourceRow: z.number().int().positive(), sourceCell: z.string().regex(/^[A-Z]+[1-9]\d*$/),
};
export const groceryRowSchema = z.strictObject({
  ...rowBase, sourceUnit: z.literal("pence/person/week"), sourcePeriod: z.literal("FYE 2024"), population: z.literal("UK survey population"),
  codeLevel: z.number().int().min(1).max(4),
  sourceHierarchyLabels: z.strictObject({ foodCategory: z.string(), foodGroup: z.string(), majorFoodCode: z.string(), minorFoodCode: z.string() }),
  codebank: z.union([
    z.strictObject({ status: z.literal("RECONCILED"), sourceRow: z.number().int().positive(), codeDescription: z.string(), rawEstimate: z.string() }),
    z.strictObject({ status: z.literal("ODS_PUBLISHED_COMPOSITE"), explanation: z.string() }),
  ]),
});
export const coicopRowSchema = z.strictObject({
  ...rowBase, sourceUnit: z.literal("GBP/household/week"), sourcePeriod: z.literal("FYE 2025"), population: z.literal("All households"),
  parentSourceCategoryCode: z.string().nullable(), hierarchyLevel: z.union([z.literal(1), z.literal(2)]), rawSourceCode: z.string(),
});
function provenance(context: AdapterContext, period: string, reference: string, methodology: string) {
  const { source, snapshot, importedAt, importVersion } = context;
  return {
    sourceId: source.sourceId, organisation: source.organisation, publicationTitle: source.publicationTitle, publicationDate: source.publicationDate,
    sourceUrl: snapshot.retention === "METADATA_ONLY" ? snapshot.sourceUrl : source.sourceUrl,
    sourceReference: reference, sourceFormat: snapshot.sourceFormat, sourcePeriod: period,
    retrievedAt: snapshot.retrievedAt, importedAt, importVersion, snapshotId: snapshot.snapshotId, snapshotChecksum: snapshot.checksum,
    parserVersion: "1.0.0", licenceReference: source.licenceReference, methodologyNotes: methodology,
    limitations: ["National survey evidence, not city budgets or a household composition model.", "Selected source totals and subgroups overlap; no additive UKMR Essentials/Lifestyle mapping is approved."],
  };
}
export const groceryAdapter: IngestionAdapter<z.infer<typeof groceryRowSchema>, GroceryExpenditureRecord> = {
  id: "defra-family-food-expenditure", version: "1.0.0", sourceId: "SRC-005", category: "grocery_expenditure", kind: "SOURCE", acceptedSourceFormats: ["ODS"],
  rowSchema: groceryRowSchema, outputSchema: groceryExpenditureRecordSchema,
  parsePayload: (payload) => spendingExtractSchema.parse(JSON.parse(String(payload))).rows,
  sourceIdentifier: (r) => `${r.sourcePeriod}:${r.population}:${r.sourceCategoryCode}`,
  normalize: (r, context) => {
    if (r.sourceSheet !== "expenditure" || r.sourceCell !== `BF${r.sourceRow}`) return { diagnostics: [{ code: "SOURCE_REVIEW_REQUIRED", message: "FYE 2024 ODS expenditure column BF required" }] };
    return { record: {
      recordId: `SRC-005:${r.sourceCategoryCode}:fye2024`, dataset: "family-food-fye2024-selected", category: "grocery_expenditure", valueType: "OBSERVED_DATA", releaseStatus: context.releaseStatus,
      geography: { official: { geographyType: "country", name: "United Kingdom", sourceId: "SRC-005" } }, population: r.population,
      sourceCategoryCode: r.sourceCategoryCode, sourceCategoryLabel: r.sourceCategoryLabel, codeLevel: r.codeLevel, sourceHierarchyLabels: r.sourceHierarchyLabels,
      weeklyGbp: Number(r.rawWeeklyValue) / 100, unit: "GBP/person/week", sourcePeriod: r.sourcePeriod, qa: { ...r },
      provenance: provenance(context, r.sourcePeriod, `${r.sourceSheet}!${r.sourceCell}; code ${r.sourceCategoryCode}`, "Source pence per person per week normalized to GBP by division by 100. This is the same observed quantity in another currency unit. No intermediate rounding, headcount, household budget or monthly conversion in this record."),
    } };
  },
};
export const coicopAdapter: IngestionAdapter<z.infer<typeof coicopRowSchema>, CoicopExpenditureRecord> = {
  id: "ons-family-spending-a1", version: "1.0.0", sourceId: "SRC-006", category: "coicop_expenditure", kind: "SOURCE", acceptedSourceFormats: ["XLSX"],
  rowSchema: coicopRowSchema, outputSchema: coicopExpenditureRecordSchema,
  parsePayload: (payload) => spendingExtractSchema.parse(JSON.parse(String(payload))).rows,
  sourceIdentifier: (r) => `${r.sourcePeriod}:${r.population}:${r.sourceCategoryCode}`,
  normalize: (r, context) => {
    if (r.sourceSheet !== "A1" || r.sourceCell !== `G${r.sourceRow}`) return { diagnostics: [{ code: "SOURCE_REVIEW_REQUIRED", message: "Table A1 all-households weekly GBP column G required" }] };
    return { record: {
      recordId: `SRC-006:A1:${r.sourceCategoryCode}:fye2025`, dataset: "family-spending-a1-fye2025-selected", category: "coicop_expenditure", valueType: "OBSERVED_DATA", releaseStatus: context.releaseStatus,
      geography: { official: { geographyType: "country", name: "United Kingdom", sourceId: "SRC-006" } },
      codeSystem: "ONS_A1_SEQUENTIAL", sourceCategoryCode: r.sourceCategoryCode, coicopLabel: r.sourceCategoryLabel,
      parentSourceCategoryCode: r.parentSourceCategoryCode, hierarchyLevel: r.hierarchyLevel, profile: r.population,
      weeklyGbp: Number(r.rawWeeklyValue), unit: "GBP/household/week", sourcePeriod: r.sourcePeriod, qa: { ...r },
      provenance: provenance(context, r.sourcePeriod, `A1!${r.sourceCell}; sequential item ${r.sourceCategoryCode}`, "Published all-households weekly GBP retained at source precision. A1 identifiers are sequential, not actual COICOP codes. Parent labels/amounts are source observations, not UKMR category sums. No household-profile mapping or period arithmetic in this record."),
    } };
  },
};
