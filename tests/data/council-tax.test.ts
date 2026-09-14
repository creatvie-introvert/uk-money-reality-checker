import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

import { sourceCatalog } from "@/data/provenance/catalog";
import { auditArtifactSchema, directEvidenceReleaseSchema, referenceArtifactSchema } from "@/data/schemas/artifacts";
import { councilTaxRecordSchema, type CouncilTaxRecord } from "@/data/schemas/records";
import { runIngestion } from "@/data/ingestion/run";
import { englandCouncilTaxAdapter, scotlandCouncilTaxAdapter } from "@/data/ingestion/council-tax/adapters";
import { validateCouncilTaxCoverage } from "@/data/ingestion/council-tax/coverage";
import { buildCouncilTaxRelease, councilTaxExtracts, councilTaxSnapshots, validateCouncilTaxRelease } from "@/data/ingestion/council-tax/release";

const built = buildCouncilTaxRelease();
const release = built.release!;
const records = release.records.map((r) => councilTaxRecordSchema.parse(r));
function change(index: number, mutate: (rows: Record<string, unknown>[]) => void) {
  const inputs = structuredClone(councilTaxExtracts) as unknown as { rows: Record<string, unknown>[] }[];
  mutate(inputs[index].rows);
  return buildCouncilTaxRelease(inputs);
}
const amounts = [
  { name: "Birmingham", code: "E08000025", charges: [1575.27,1837.81,2100.36,2362.90,2887.99,3413.08,3938.17,4725.80] },
  { name: "Manchester", code: "E08000003", charges: [1541.36,1798.25,2055.15,2312.04,2825.83,3339.61,3853.40,4624.08] },
  { name: "Leeds", code: "E08000035", charges: [1522.49,1776.23,2029.98,2283.73,2791.23,3298.72,3806.22,4567.46] },
  { name: "Liverpool", code: "E08000012", charges: [1782.39,2079.46,2376.52,2673.59,3267.72,3861.85,4455.98,5347.18] },
  { name: "Bristol", code: "E06000023", charges: [1809.12,2110.64,2412.16,2713.68,3316.72,3919.76,4522.80,5427.36] },
  { name: "City of Edinburgh", code: undefined, charges: [1084.03,1264.71,1445.38,1626.05,2136.45,2642.33,3184.35,3983.82] },
  { name: "Glasgow City", code: undefined, charges: [1137.33,1326.89,1516.44,1706,2241.49,2772.25,3340.92,4179.70] },
];

it.each(amounts)("ingests the verified A-H charges for $name", ({ name, code, charges }) => {
  const rows = records.filter((r) => r.geography.official.name === name).sort((a,b) => a.band.localeCompare(b.band));
  expect(rows).toHaveLength(8);
  expect(rows.map((r) => r.band)).toEqual(["A","B","C","D","E","F","G","H"]);
  expect(rows.map((r) => r.annualChargeGbp)).toEqual(charges);
  for (const row of rows) {
    expect(row.geography.official.code).toBe(code);
    expect(row).toMatchObject({ taxYear: "2026/27", effectiveFrom: "2026-04-01", effectiveTo: "2027-03-31", releaseStatus: "RELEASE_READY", valueType: "OBSERVED_DATA", unit: "GBP/year" });
    expect(row.chargeScope).toBe(code ? "AREA_TWO_ADULTS_INCLUDING_PRECEPTS" : "COUNCIL_TAX_EXCLUDING_WATER_SEWERAGE");
  }
});

it("preserves Scottish source precision separately from official displayed currency", () => {
  const edinburghB = records.find((r) => r.geography.official.name === "City of Edinburgh" && r.band === "B")!;
  expect(edinburghB).toMatchObject({ annualChargeGbp: 1264.71, qa: { rawSourceValue: "1264.7055555555555", displayedAnnualGbp: "1264.71", sourceNumberFormat: '"£"#,##0.00', sourceCell: "C12" } });
  const glasgowH = records.find((r) => r.geography.official.name === "Glasgow City" && r.band === "H")!;
  expect(glasgowH.qa).toMatchObject({ rawSourceValue: "4179.7000000000007", displayedAnnualGbp: "4179.70", sourceAuthorityName: "Glasgow City " });
  expect(glasgowH.annualChargeGbp).toBe(4179.7);
  const changed = change(1, (rows) => { rows[1].displayedAnnualGbp = "1264.70"; });
  expect(changed.status).toBe("FAILED");
  expect(changed.validationDiagnostics.join(" ")).toContain("precision reconciliation");
});

it.each([undefined,"E08000003"," E08000025","e08000025"])("rejects wrong/missing authority code %s", (code) => {
  const result = change(0, (rows) => { rows.find((r) => r.authorityName === "Birmingham")!.authorityCode = code; });
  expect(result.status).toBe("FAILED");
  expect(result.runs[0].diagnostics.map((d) => d.code)).toContain("GEOGRAPHY_MAPPING_FAILURE");
  expect(result.release).toBeUndefined();
});

it.each([0,1])("rejects missing/duplicate bands for source %i", (index) => {
  const missing = change(index, (rows) => { rows.splice(0,1); });
  expect(missing.coverage.diagnostics).toContainEqual(expect.objectContaining({ code: "MISSING_AUTHORITY_BAND" }));
  expect(missing.release).toBeUndefined();
  const duplicate = change(index, (rows) => { rows.push({ ...rows[0] }); });
  expect(duplicate.status).toBe("FAILED");
  expect(duplicate.runs[index].counts.rejectedRows).toBe(2);
  expect(duplicate.runs[index].rows).toHaveLength(duplicate.runs[index].counts.inputRows!);
  const coverage = validateCouncilTaxCoverage([...records, records[index]]);
  expect(coverage.diagnostics).toContainEqual(expect.objectContaining({ code: "DUPLICATE_AUTHORITY_BAND" }));
});

it.each([
  { taxYear: "2025/26" }, { band: "I" }, { displayedAnnualGbp: "0.00" },
  { displayedAnnualGbp: "-1.00" }, { displayedAnnualGbp: "not a number" },
  { displayedAnnualGbp: "100.001" }, { displayedAnnualGbp: undefined },
  { rawSourceValue: "0" }, { rawSourceValue: undefined },
  { effectiveFrom: "2027-04-01", effectiveTo: "2026-03-31" },
])("rejects invalid source fields %j without dropping rows", (fields) => {
  const result = change(0, (rows) => Object.assign(rows[0], fields));
  expect(result.status).toBe("FAILED");
  expect(result.release).toBeUndefined();
  expect(result.runs[0].counts).toEqual({ inputRows: 40, acceptedRows: 39, rejectedRows: 1 });
  expect(result.runs[0].rows).toHaveLength(40);
  expect(result.runs[0].rows[0].raw).toMatchObject(JSON.parse(JSON.stringify(fields)));
});

it.each([0,1])("rejects England/Scotland source regime mixing for source %i", (index) => {
  expect(change(index, (rows) => { rows[0].nation = index === 0 ? "Scotland" : "England"; }).status).toBe("FAILED");
  expect(change(index, (rows) => { rows[0].chargeScope = index === 0 ? "COUNCIL_TAX_EXCLUDING_WATER_SEWERAGE" : "AREA_TWO_ADULTS_INCLUDING_PRECEPTS"; }).status).toBe("FAILED");
  expect(change(index, (rows) => { rows[0].sourceTable = "another table"; }).status).toBe("FAILED");
});

it("enforces canonical charge, provenance and effective-date validity", () => {
  const row = records[0];
  for (const fields of [{ annualChargeGbp: 0 }, { annualChargeGbp: -1 }, { annualChargeGbp: Infinity }, { annualChargeGbp: NaN }, { provenance: undefined }, { effectiveFrom: "2028-01-01" }]) {
    expect(councilTaxRecordSchema.safeParse({ ...row, ...fields }).success).toBe(false);
    expect(validateCouncilTaxCoverage([{ ...row, ...fields }]).status).toBe("FAILED");
  }
});

it("keeps London city-default coverage unresolved even if a borough row exists", () => {
  expect(built.status).toBe("SUCCESS");
  expect(built.coverage.status).toBe("COMPLETE");
  expect(records).toHaveLength(56);
  expect(records.some((r) => r.geography.mvpCityId === "LOC-LON" || /London/.test(r.geography.official.name))).toBe(false);
  expect(built.coverage.cityDefaultCoverage).toMatchObject({ status: "INCOMPLETE", diagnostics: [expect.objectContaining({ code: "LONDON_CITY_DEFAULT_UNRESOLVED", dimension: "LOC-LON" })] });
  const borough: CouncilTaxRecord = { ...records[0], recordId: "borough-test", geography: { mvpCityId: "LOC-LON", official: { ...records[0].geography.official, name: "Camden", code: "E09000007" } } };
  const coverage = validateCouncilTaxCoverage([...records, borough]);
  expect(coverage.status).toBe("FAILED");
  expect(coverage.cityDefaultCoverage.status).toBe("INCOMPLETE");
});

it.each(["REFERENCE_ONLY","DEV_ONLY","BLOCKED_FROM_RELEASE"] as const)("rejects %s without promotion", (releaseStatus) => {
  for (const [index, adapter] of [englandCouncilTaxAdapter,scotlandCouncilTaxAdapter].entries()) {
    const source = sourceCatalog.find((s) => s.sourceId === adapter.sourceId)!;
    const result = runIngestion(adapter, source, { ...built.imports[index], releaseStatus });
    expect(result.status).toBe("FAILED");
    expect(result.records).toEqual([]);
  }
  const candidate = { ...release, records: records.map((r) => ({ ...r, releaseStatus })) };
  expect(directEvidenceReleaseSchema.safeParse(candidate).success).toBe(false);
  expect(() => validateCouncilTaxRelease(candidate)).toThrow();
});

it("validates direct-evidence status and rejects user-entered records", () => {
  expect(referenceArtifactSchema.safeParse({ ...release, kind: "REFERENCE_ARTIFACT" }).success).toBe(false);
  expect(() => validateCouncilTaxRelease({ ...release, records: records.map((r) => ({ ...r, valueType: "USER_ENTERED" })) })).toThrow();
  expect(auditArtifactSchema.parse(built.audit).records).toHaveLength(56);
  expect(directEvidenceReleaseSchema.parse(release).manifest.recordCount).toBe(56);
});

it("preserves provenance and every raw imported cell outcome", () => {
  for (const [index, run] of built.runs.entries()) {
    const input = councilTaxExtracts[index];
    expect(run.counts.inputRows).toBe(input.rows.length);
    expect(run.counts.acceptedRows).toBe(input.rows.length);
    expect(run.counts.rejectedRows).toBe(0);
    expect(run.rows.map((r) => r.raw)).toEqual(input.rows);
    for (const r of run.records) {
      expect(r.provenance).toMatchObject({
        snapshotId: input.snapshot.snapshotId, snapshotChecksum: input.snapshot.checksum,
        sourceUrl: input.snapshot.sourceUrl, sourceFormat: input.snapshot.sourceFormat,
        sourcePeriod: "2026/27", retrievedAt: input.snapshot.retrievedAt,
        importedAt: input.importedAt, methodologyNotes: input.methodologyNotes,
      });
    }
  }
});

it("reconciles counts, snapshot IDs, snapshot bytes and source precision metadata", () => {
  expect(() => validateCouncilTaxRelease(release)).not.toThrow();
  for (const manifest of [{ ...release.manifest, recordCount: 55 }, { ...release.manifest, sourceSnapshotIds: ["fake"] }]) {
    expect(() => validateCouncilTaxRelease({ ...release, manifest })).toThrow();
  }
  expect(() => validateCouncilTaxRelease(release, [])).toThrow(/reconciliation/);
  expect(() => validateCouncilTaxRelease(release, [...councilTaxSnapshots,councilTaxSnapshots[0]])).toThrow(/Duplicate/);
  for (const field of ["sourceUrl","snapshotChecksum","methodologyNotes","importedAt"] as const) {
    const updated = structuredClone(release);
    updated.records[0].provenance[field] = field === "sourceUrl" ? "https://example.com/wrong" : field === "importedAt" ? "2026-09-13T00:00:00Z" : "changed";
    expect(() => validateCouncilTaxRelease(updated)).toThrow();
  }
  const changed = structuredClone(records);
  changed[0].qa.rawSourceValue = "1.12345";
  expect(() => validateCouncilTaxRelease({ ...release, records: changed })).toThrow(/precision reconciliation/);
});

it("enforces required coverage even if an incomplete manifest is repaired", () => {
  const incomplete = records.slice(1);
  const candidate = { ...release, records: incomplete, manifest: { ...release.manifest, recordCount: incomplete.length } };
  expect(directEvidenceReleaseSchema.safeParse(candidate).success).toBe(true);
  expect(() => validateCouncilTaxRelease(candidate)).toThrow(/MISSING_AUTHORITY_BAND/);
  expect(buildCouncilTaxRelease([]).status).toBe("FAILED");
});

it("reproduces generated files byte for byte and validates the deserialized release", () => {
  expect(execFileSync(process.execPath,["scripts/data/generate-council-tax.mjs","--check"],{ encoding: "utf8" })).toContain("Verified 3");
  const saved: unknown = JSON.parse(readFileSync("src/data/generated/2026-27-v1/council-tax/release.json","utf8"));
  expect(validateCouncilTaxRelease(saved)).toEqual(release);
});

it("retains a malformed extra row as a rejection and blocks the release", () => {
  const result = change(0, (rows) => { rows.push({ unexpected: "malformed source row" }); });
  expect(result.status).toBe("FAILED");
  expect(result.runs[0].counts).toEqual({ inputRows: 41, acceptedRows: 40, rejectedRows: 1 });
  expect(result.runs[0].rows[40]).toMatchObject({ status: "REJECTED", raw: { unexpected: "malformed source row" } });
  expect(result.release).toBeUndefined();
});
