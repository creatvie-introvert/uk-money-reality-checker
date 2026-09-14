import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { groceryExpenditureRecordSchema, coicopExpenditureRecordSchema, expenditurePeriodConversionRecordSchema } from "@/data/schemas/records";
import { spendingExtracts, type SpendingFamily } from "@/data/ingestion/spending/sources";
import { buildSpendingRelease, ingestSpending, validateSpendingCoverage, validateSpendingArtifact, spendingSnapshots } from "@/data/ingestion/spending/release";
import { monthlyEquivalent } from "@/data/ingestion/spending/conversions";
import { groceryAdapter, coicopAdapter } from "@/data/ingestion/spending/adapters";
import { runIngestion } from "@/data/ingestion/run";
import { snapshotMetadataSchema } from "@/data/ingestion/snapshot";
import { sourceCatalog } from "@/data/provenance/catalog";

const builds = { defra: buildSpendingRelease("defra"), ons: buildSpendingRelease("ons") };
const grocery = groceryExpenditureRecordSchema.parse(builds.defra.audit.records.find((r) => r.recordId === "SRC-005:cat105:fye2024"));
const food = coicopExpenditureRecordSchema.parse(builds.ons.audit.records.find((r) => r.recordId === "SRC-006:A1:1:fye2025"));
function changedRows(family: SpendingFamily, patch: Record<string, unknown>) {
  const e = structuredClone(spendingExtracts[family]);
  Object.assign(e.rows[0], patch);
  return e;
}
function rawRun(family: SpendingFamily, rows: unknown[]) {
  const e = spendingExtracts[family];
  const payload = { ...e, rows, selectionAccounting: { ...e.selectionAccounting, selectedRows: rows.length, examinedRows: rows.length + e.excludedRows.length } };
  const source = sourceCatalog.find((s) => s.sourceId === e.snapshot.sourceId)!;
  const input = { snapshot: snapshotMetadataSchema.parse(e.snapshot), importedAt: e.importedAt, importVersion: e.importVersion, releaseStatus: "REFERENCE_ONLY" as const, payload: JSON.stringify(payload) };
  return family === "defra" ? runIngestion(groceryAdapter, source, input) : runIngestion(coicopAdapter, source, input);
}

describe("Defra Family Food evidence", () => {
  it("preserves the exact per-person weekly amount, source cell and native pence", () => {
    expect(grocery).toMatchObject({ category: "grocery_expenditure", valueType: "OBSERVED_DATA", releaseStatus: "REFERENCE_ONLY", unit: "GBP/person/week", weeklyGbp: Number("3229.6704392759402") / 100, sourcePeriod: "FYE 2024", population: "UK survey population" });
    expect(grocery.qa).toMatchObject({ sourceCell: "BF13", rawWeeklyValue: "3229.6704392759402", sourceUnit: "pence/person/week" });
    expect(grocery.provenance).toMatchObject({ sourceId: "SRC-005", publicationDate: "2025-11-06", sourceFormat: "ODS", sourcePeriod: "FYE 2024" });
  });
  it("preserves every selected code, label and hierarchy column without a product relabel", () => {
    for (const row of spendingExtracts.defra.rows) {
      const record = builds.defra.audit.records.find((r) => r.recordId === `SRC-005:${row.sourceCategoryCode}:fye2024`);
      expect(record).toMatchObject({ sourceCategoryCode: row.sourceCategoryCode, sourceCategoryLabel: row.sourceCategoryLabel, sourceHierarchyLabels: row.sourceHierarchyLabels, codeLevel: row.codeLevel, weeklyGbp: Number(row.rawWeeklyValue) / 100 });
    }
  });
  it("preserves the codebank distinction for the published t4 composite", () => {
    expect(spendingExtracts.defra.rows.filter((r) => r.codebank.status === "RECONCILED")).toHaveLength(31);
    expect(spendingExtracts.defra.rows.find((r) => r.sourceCategoryCode === "t4")?.codebank.status).toBe("ODS_PUBLISHED_COMPOSITE");
    expect(builds.defra.audit.records.find((r) => r.recordId === "SRC-005:t4:fye2024")?.valueType).toBe("OBSERVED_DATA");
  });
  it.each(["3+ adults", "2+ children", "large household"])("never invents a headcount for %s", (population) => {
    const result = ingestSpending("defra", changedRows("defra", { population, headcount: 3 }));
    expect(result.run.rows[0].status).toBe("REJECTED");
    expect(groceryExpenditureRecordSchema.safeParse({ ...grocery, population, headcount: 3 }).success).toBe(false);
  });
  it.each(["householdMonthlySpend", "adultMultiplier", "childMultiplier", "oecdEquivalence", "cityMultiplier"])("rejects unapproved field %s", (field) => {
    expect(groceryExpenditureRecordSchema.safeParse({ ...grocery, [field]: 2 }).success).toBe(false);
    expect(ingestSpending("defra", changedRows("defra", { [field]: 2 })).run.rows[0].status).toBe("REJECTED");
  });
});

describe("ONS source-level expenditure", () => {
  it("preserves the observed GBP/household/week row and sequential code namespace", () => {
    expect(food).toMatchObject({ category: "coicop_expenditure", coicopLabel: "Food & non-alcoholic drinks", codeSystem: "ONS_A1_SEQUENTIAL", sourceCategoryCode: "1", parentSourceCategoryCode: null, hierarchyLevel: 1, profile: "All households", weeklyGbp: 73.7, unit: "GBP/household/week", sourcePeriod: "FYE 2025", valueType: "OBSERVED_DATA" });
    expect(food.coicopCode).toBeUndefined();
    expect(food.provenance.publicationDate).toBe("2026-06-11");
  });
  it("preserves all source labels, parent numbering and numeric code storage evidence", () => {
    for (const row of spendingExtracts.ons.rows) {
      const record = coicopExpenditureRecordSchema.parse(builds.ons.audit.records.find((r) => r.recordId === `SRC-006:A1:${row.sourceCategoryCode}:fye2025`));
      expect(record.coicopLabel).toBe(row.sourceCategoryLabel);
      expect(record.parentSourceCategoryCode).toBe(row.parentSourceCategoryCode);
      expect(record.qa.rawSourceCode).toBe(row.rawSourceCode);
      if (record.parentSourceCategoryCode) expect(builds.ons.audit.records.some((r) => r.recordId === `SRC-006:A1:${record.parentSourceCategoryCode}:fye2025`)).toBe(true);
    }
    expect(spendingExtracts.ons.rows.find((r) => r.sourceCategoryCode === "1.1")?.rawSourceCode).toBe("1.1000000000000001");
  });
  it.each(["Essentials", "Lifestyle"])("blocks unsupported %s relabelling", (label) => {
    const e = changedRows("ons", { sourceCategoryLabel: label });
    expect(buildSpendingRelease("ons", [e]).status).toBe("FAILED");
  });
  it.each([{ coicopCode: "01.1" }, { parentSourceCategoryCode: "9" }, { profile: "2 adults" }, { oecdEquivalence: 1.5 }])("rejects unsupported identity/profile %#", (change) => {
    expect(coicopExpenditureRecordSchema.safeParse({ ...food, ...change }).success).toBe(false);
  });
});

describe.each(["defra", "ons"] as const)("%s period conversion", (family) => {
  const observed = builds[family].audit.records;
  const parent = family === "defra" ? grocery : food;
  const monthly = monthlyEquivalent(parent);
  it("uses weekly * 52 / 12 at stored precision, not four weeks or rounded inputs", () => {
    expect(monthly.monthlyGbp).toBe(parent.weeklyGbp * 52 / 12);
    expect(monthly.monthlyGbp).not.toBe(parent.weeklyGbp * 4);
    expect(monthly.valueType).toBe("CALCULATED");
    expect(monthly.observedRecordId).toBe(parent.recordId);
    expect(monthly.provenance.snapshotId).toBe(parent.provenance.snapshotId);
    expect(monthly.unit).toBe(family === "defra" ? "GBP/person/month" : "GBP/household/month");
    expect(monthly.geography).toEqual(parent.geography);
  });
  it("links each derivative to one exact observed row", () => {
    for (const r of builds[family].calculated!.records) {
      const calculated = expenditurePeriodConversionRecordSchema.parse(r);
      const source = observed.find((p) => p.recordId === calculated.observedRecordId);
      expect(source).toBeDefined();
      expect(calculated).toEqual(monthlyEquivalent(source));
    }
  });
  it.each([
    { valueType: "OBSERVED_DATA" }, { formula: "weeklyGbp * 4" }, { monthlyGbp: 1 }, { releaseStatus: "RELEASE_READY" },
  ])("rejects altered calculation semantics %#", (patch) => {
    expect(expenditurePeriodConversionRecordSchema.safeParse({ ...monthly, ...patch }).success).toBe(false);
  });
  it("blocks fake parent links and coherent but source-inconsistent arithmetic", () => {
    for (const patch of [
      { observedRecordId: "fake-parent" },
      { observedWeeklyGbp: 99, monthlyGbp: 99 * 52 / 12 },
      { unit: family === "defra" ? "GBP/household/month" : "GBP/person/month" },
    ]) {
      const candidates = builds[family].calculated!.records.map((r, i) => i ? r : { ...r, ...patch });
      expect(validateSpendingCoverage(family, "calculated", candidates).status).toBe("FAILED");
    }
  });
  it("permits a real observed zero but rejects missing and suppressed markers", () => {
    const schema = family === "defra" ? groceryExpenditureRecordSchema : coicopExpenditureRecordSchema;
    expect(schema.safeParse({ ...parent, weeklyGbp: 0 }).success).toBe(true);
    expect(monthlyEquivalent({ ...parent, weeklyGbp: 0 }).monthlyGbp).toBe(0);
    for (const rawWeeklyValue of ["", "..", ":", "NaN", "-1", "[0.10]", "0.00~"]) expect(ingestSpending(family, changedRows(family, { rawWeeklyValue })).run.rows[0].status).toBe("REJECTED");
  });
});

describe.each(["defra", "ons"] as const)("%s reconciliation and artifacts", (family) => {
  const result = builds[family];
  const count = family === "defra" ? 32 : 53;
  it("accounts for all selected/excluded source rows and all ingestion outcomes", () => {
    expect(result.status).toBe("SUCCESS");
    expect(result.runs[0].counts).toEqual({ inputRows: count, acceptedRows: count, rejectedRows: 0 });
    expect(result.runs[0].rows).toHaveLength(count);
    const c = result.sourceSelection.accounting;
    expect(c.examinedRows).toBe(c.selectedRows + c.excludedRows);
    expect(result.sourceSelection.excludedRows).toHaveLength(c.excludedRows);
    expect(new Set([...spendingExtracts[family].rows, ...result.sourceSelection.excludedRows].map((r) => r.sourceRow)).size).toBe(c.examinedRows);
  });
  it("retains invalid selected rows as rejections and blocks publication", () => {
    const e = changedRows(family, { rawWeeklyValue: "invalid" });
    const failed = buildSpendingRelease(family, [e]);
    expect(failed.status).toBe("FAILED");
    expect(failed.reference).toBeUndefined();
    expect(failed.calculated).toBeUndefined();
    expect(failed.runs[0].counts).toEqual({ inputRows: count, acceptedRows: count - 1, rejectedRows: 1 });
    expect(failed.runs[0].rows[0]).toMatchObject({ status: "REJECTED", raw: { rawWeeklyValue: "invalid" } });
  });
  it("rejects both duplicated input identities even with different row locators", () => {
    const rows = structuredClone(spendingExtracts[family].rows);
    const run = rawRun(family, [...rows, { ...rows[0], sourceRow: 999, sourceCell: "G999" }]);
    expect(run.counts).toEqual({ inputRows: count + 1, acceptedRows: count - 1, rejectedRows: 2 });
    expect(run.diagnostics.some((d) => d.code === "DUPLICATE_SOURCE_IDENTIFIER")).toBe(true);
  });
  it.each(["observed", "calculated"] as const)("detects missing/duplicate %s identities", (layer) => {
    const records = layer === "observed" ? result.audit.records : result.calculated!.records;
    expect(validateSpendingCoverage(family, layer, records.slice(1)).status).toBe("FAILED");
    expect(validateSpendingCoverage(family, layer, [...records, { ...records[0], recordId: "different-id" }]).diagnostics).toContainEqual(expect.objectContaining({ code: "DUPLICATE_SPENDING_IDENTITY" }));
  });
  it.each([
    { sourcePeriod: "FYE 2026" }, { sourceUnit: "GBP/person/month" }, { sourceSheet: "wrong" }, { sourceCell: "ZZ1" },
    { sourceCategoryCode: "invented" }, { sourceCategoryLabel: "UKMR Budget" }, { rawWeeklyValue: "999" },
  ])("blocks source row tampering %#", (patch) => {
    expect(buildSpendingRelease(family, [changedRows(family, patch)]).status).toBe("FAILED");
  });
  it("rejects unknown city geography and household model fields", () => {
    const candidates = result.audit.records.map((r,i) => i ? r : { ...r, geography: { ...(r as typeof grocery).geography, mvpCityId: "LOC-LON" }, householdSize: 3 });
    expect(validateSpendingCoverage(family, "observed", candidates).status).toBe("FAILED");
    expect(result.coverage.cityCoverage.status).toBe("NOT_APPLICABLE");
    expect(result.coverage.householdProfileCoverage.status).toBe("NOT_ESTABLISHED");
    expect(result.coverage.productMapping.status).toBe("NOT_APPROVED");
  });
  it("preserves source provenance and exact source/supporting snapshot registry", () => {
    for (const record of result.audit.records) {
      expect(record.provenance.snapshotChecksum).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(record.provenance.sourcePeriod).toBe(spendingExtracts[family].sourcePeriod);
      expect(record.provenance.sourceUrl).toBe(spendingExtracts[family].snapshot.sourceUrl);
      expect(record.provenance.publicationDate).toBe(spendingExtracts[family].publicationDate);
    }
    expect(() => validateSpendingArtifact(family, "observed", result.reference, [])).toThrow();
    expect(() => validateSpendingArtifact(family, "observed", result.reference, [...spendingSnapshots, spendingSnapshots[0]])).toThrow();
    expect(() => validateSpendingArtifact(family, "observed", result.reference, spendingSnapshots.map((s) => ({ ...s, checksum: "fake" })))).toThrow();
  });
  it("reconciles manifests and rejects observed/calculated mixing", () => {
    expect(validateSpendingArtifact(family,"observed",result.reference).records).toHaveLength(count);
    expect(validateSpendingArtifact(family,"calculated",result.calculated).records).toHaveLength(count);
    expect(() => validateSpendingArtifact(family,"observed",{ ...result.reference, manifest: { ...result.reference!.manifest, recordCount: count - 1 } })).toThrow();
    expect(() => validateSpendingArtifact(family,"observed",{ ...result.reference, manifest: { ...result.reference!.manifest, sourceSnapshotIds: [] } })).toThrow();
    expect(() => validateSpendingArtifact(family,"observed",result.calculated)).toThrow();
    expect(() => validateSpendingArtifact(family,"calculated",result.reference)).toThrow();
  });
  it("rejects altered extract metadata, checksum, exclusions or row-accounting claims", () => {
    const e = spendingExtracts[family];
    for (const patch of [{ scope: "London" }, { snapshot: { ...e.snapshot, checksum: "fake" } }, { excludedRows: [] }, { rows: e.rows.slice(1) }]) expect(() => ingestSpending(family, { ...e, ...patch })).toThrow();
    expect(buildSpendingRelease(family, []).status).toBe("FAILED");
  });
  it("matches all generated bytes and regenerates deterministically", () => {
    expect(JSON.stringify(buildSpendingRelease(family))).toBe(JSON.stringify(result));
    const directory = family === "defra" ? "fye2024-v1/groceries" : "fye2025-v1/household-spending";
    const files = {
      "audit.json": result.audit, "reference.json": result.reference, "calculated.json": result.calculated,
      "ingestion-report.json": { status: result.status, imports: result.imports, runs: result.runs, sourceSelection: result.sourceSelection, coverage: result.coverage, calculatedCoverage: result.calculatedCoverage, validationDiagnostics: result.validationDiagnostics },
    };
    for (const [name, value] of Object.entries(files)) expect(readFileSync(`src/data/generated/${directory}/${name}`, "utf8")).toBe(`${JSON.stringify(value, null, 2)}\n`);
  });
});
