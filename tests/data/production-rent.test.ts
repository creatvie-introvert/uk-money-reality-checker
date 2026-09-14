import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rentRecordSchema } from "../../src/data/schemas/records";
import { rentGeographies, rentMeasures } from "../../src/data/ingestion/rent/mappings";
import { validateRentCoverage } from "../../src/data/ingestion/rent/coverage";
import { buildRentRelease, rentExtract, rentSnapshot, validateRentRelease } from "../../src/data/ingestion/rent/release";

const built = buildRentRelease();
const release = built.release!;
function mutateRow(patch: Record<string, unknown>) {
  const input = structuredClone(rentExtract);
  Object.assign(input.rows[0], patch);
  return buildRentRelease(input);
}

it("releases 35 observed records with complete supported scope and reconciled row accounting", () => {
  expect(built.status).toBe("SUCCESS");
  expect(release.kind).toBe("DIRECT_EVIDENCE_RELEASE");
  expect(release.records).toHaveLength(35);
  expect(release.manifest.recordCount).toBe(35);
  expect(release.manifest.sourceSnapshotIds).toEqual([rentSnapshot.snapshotId]);
  expect(built.runs[0].counts).toEqual({ inputRows: 35, acceptedRows: 35, rejectedRows: 0 });
  expect(built.runs[0].rows).toHaveLength(35);
  expect(built.coverage.status).toBe("COMPLETE");
  for (const record of release.records) {
    expect(record.valueType).toBe("OBSERVED_DATA");
    expect(record.releaseStatus).toBe("RELEASE_READY");
    expect(record.provenance).toMatchObject({ sourcePeriod: "2026-07", publicationDate: "2026-08-19", snapshotChecksum: rentSnapshot.checksum, sourceId: "SRC-001", sourceFormat: "XLSX", parserVersion: "1.0.0" });
  }
});

const expectedValues: Record<string, number[]> = {
  "LOC-LON": [2317, 1752, 2218, 2623, 3614],
  "LOC-BIR": [1093, 825, 997, 1127, 1569],
  "LOC-MAN": [1365, 998, 1227, 1425, 2005],
  "LOC-LEE": [1140, 779, 970, 1133, 1683],
  "LOC-LIV": [909, 683, 834, 959, 1288],
  "LOC-BRS": [1880, 1223, 1541, 1755, 2542],
  "LOC-GLA": [1264, 841, 1088, 1336, 2276],
};
it.each(rentGeographies)("preserves all five reviewed measures and exact geography for $consumerLabel", (geo) => {
  const rows = release.records.map((r) => rentRecordSchema.parse(r)).filter((r) => r.geography.mvpCityId === geo.cityId);
  expect(rows).toHaveLength(5);
  for (const [index, measure] of rentMeasures.entries()) {
    const r = rows.find((r) => r.bedroomBand === measure.bedroomBand)!;
    expect(r.geography.official).toEqual({ geographyType: geo.type, name: geo.name, code: geo.code, sourceId: "SRC-001" });
    expect(r.geography.consumerLabel).toBe(geo.consumerLabel);
    expect(r.propertyType).toBeUndefined();
    expect(r.valueGbp).toBe(expectedValues[geo.cityId][index]);
    expect(r.qa.sourceMeasure).toBe(measure.source);
  }
});
it("keeps London regional metadata and Glasgow BRMA applicability explicit", () => {
  const london = release.records.map((r) => rentRecordSchema.parse(r)).find((r) => r.qa.areaCode === "E12000007")!;
  expect(london.qa.regionOrCountryName).toBe("[z]");
  expect(london.qa.geographyRelationship).toContain("not local-authority");
  const glasgow = release.records.map((r) => rentRecordSchema.parse(r)).find((r) => r.qa.areaCode === "S33000009")!;
  expect(glasgow.qa.geographyRelationship).toContain("not Glasgow City equality");
});
it("emits unresolved Edinburgh coverage without a synthetic release row", () => {
  expect(built.coverage.mvpCoverage.status).toBe("INCOMPLETE");
  expect(built.coverage.mvpCoverage.diagnostics[0].code).toBe("EDINBURGH_RENT_SOURCE_UNRESOLVED");
  expect(release.records.some((r) => rentRecordSchema.parse(r).geography.mvpCityId === "LOC-EDI")).toBe(false);
});

it.each([
  ["[x]", "NOT_AVAILABLE"], ["[z]", "NOT_APPLICABLE"], [null, "MISSING"],
])("retains and explicitly rejects source marker %s without zero substitution", (rawSourceValue, sourceState) => {
  const result = mutateRow({ rawSourceValue, sourceState });
  expect(result.status).toBe("FAILED");
  expect(result.release).toBeUndefined();
  expect(result.runs[0].counts).toEqual({ inputRows: 35, acceptedRows: 34, rejectedRows: 1 });
  expect(result.runs[0].rows[0]).toMatchObject({ status: "REJECTED", raw: { rawSourceValue, sourceState }, diagnostics: [{ code: "UNSUPPORTED_SOURCE_VALUE", field: "rawSourceValue" }] });
  expect(result.coverage.status).toBe("FAILED");
  expect(result.audit.records.every((r) => rentRecordSchema.parse(r).valueGbp > 0)).toBe(true);
});
it.each(["0", "-1", "NaN", "Infinity", "12.5", "", "[bad]"])("rejects malformed/nonpositive numeric rent %s", (rawSourceValue) => {
  expect(mutateRow({ rawSourceValue }).runs[0].rows[0]).toMatchObject({ status: "REJECTED", diagnostics: [{ code: "INVALID_NUMERIC_VALUE" }] });
});
it.each([
  { rawSourceValue: "[x]", sourceState: "NUMERIC" },
  { rawSourceValue: "1880", sourceState: "NOT_APPLICABLE" },
  { sourceState: "UNKNOWN" }, { areaCode: "S92000003", areaName: "Scotland" },
  { areaCode: "S12000036", areaName: "City of Edinburgh" }, { areaName: "Bristol" },
  { areaCode: "E08000025" }, { regionOrCountryName: "England" },
  { sourcePeriod: "2026-13" }, { sourcePeriod: "2026-06" }, { rawTimePeriod: "46174" },
  { sourceMeasure: "Rental price two bed flat" }, { propertyType: "detached" },
  { sourceCell: "AB5285" }, { sourceTable: "Notes" },
])("fails ingestion/coverage for unsupported row %j", (patch) => {
  const result = mutateRow(patch);
  expect(result.status).toBe("FAILED");
  expect(result.release).toBeUndefined();
  expect(result.runs[0].counts.rejectedRows).toBe(patch.areaCode === "E08000025" ? 2 : 1);
  expect(result.runs[0].rows).toHaveLength(35);
});
it("rejects a missing or duplicate required measure without silently dropping source rows", () => {
  const input = structuredClone(rentExtract);
  input.rows.pop();
  expect(buildRentRelease(input).coverage.status).toBe("FAILED");
  input.rows.push(input.rows[0]);
  const result = buildRentRelease(input);
  expect(result.runs[0].counts).toEqual({ inputRows: 35, acceptedRows: 33, rejectedRows: 2 });
  expect(result.runs[0].rows).toHaveLength(35);
  expect(result.runs[0].diagnostics.some((d) => d.code === "DUPLICATE_SOURCE_IDENTIFIER")).toBe(true);
  expect(result.release).toBeUndefined();
});
it("blocks tampered source amounts and row references even when structurally valid", () => {
  for (const patch of [{ rawSourceValue: "1881" }, { sourceRow: 5286, sourceCell: "H5286" }]) {
    const result = mutateRow(patch);
    expect(result.runs[0].counts.acceptedRows).toBe(35);
    expect(result.status).toBe("FAILED");
    expect(result.validationDiagnostics[0]).toContain("reconciliation failed");
  }
});

describe("deserialized release gate", () => {
  it.each([
    { valueGbp: 0 }, { valueGbp: 1881 }, { sourcePeriod: "2026-06" },
    { bedroomBand: "one bed", propertyType: "flat maisonette" },
    { releaseStatus: "DEV_ONLY" }, { releaseStatus: "REFERENCE_ONLY" }, { valueType: "MODELLED_ESTIMATE" },
    { recordId: "invented" },
  ])("rejects edited canonical fields %j", (patch) => {
    const candidate = structuredClone(release);
    Object.assign(candidate.records[0], patch);
    expect(() => validateRentRelease(candidate)).toThrow();
  });
  it("rejects fake Edinburgh applicability, duplicates, missing bands and wrong provenance", () => {
    const records = release.records.map((r) => rentRecordSchema.parse(r));
    records[0].geography.mvpCityId = "LOC-EDI";
    expect(validateRentCoverage(records).status).toBe("FAILED");
    expect(validateRentCoverage([...release.records, release.records[0]]).status).toBe("FAILED");
    expect(validateRentCoverage(release.records.slice(1)).status).toBe("FAILED");
    const candidate = structuredClone(release);
    candidate.records[0].provenance.snapshotChecksum = "sha256:fake";
    expect(() => validateRentRelease(candidate)).toThrow();
  });
  it("rejects manifest/snapshot mismatch and unregistered or duplicated registries", () => {
    const candidate = structuredClone(release);
    candidate.manifest.recordCount = 34;
    expect(() => validateRentRelease(candidate)).toThrow();
    candidate.manifest.recordCount = 35;
    candidate.manifest.sourceSnapshotIds = ["fake"];
    expect(() => validateRentRelease(candidate)).toThrow();
    expect(() => validateRentRelease(release, [])).toThrow();
    expect(() => validateRentRelease(release, [rentSnapshot, rentSnapshot])).toThrow();
    expect(() => buildRentRelease({ ...rentExtract, snapshot: { ...rentSnapshot, checksum: "fake" } })).toThrow();
    expect(() => buildRentRelease({ ...rentExtract, releaseStatus: "DEV_ONLY" })).toThrow();
  });
  it("enforces ordered effective dates when supplied and matching valid source month", () => {
    const r = rentRecordSchema.parse(release.records[0]);
    r.provenance.effectiveFrom = "2026-08-01";
    r.provenance.effectiveTo = "2026-07-01";
    expect(rentRecordSchema.safeParse(r).success).toBe(false);
  });
});
it("reproduces all three committed-candidate artifact bytes deterministically", () => {
  const again = buildRentRelease();
  expect(JSON.stringify(again)).toBe(JSON.stringify(built));
  const files = {
    "audit.json": built.audit, "release.json": built.release,
    "ingestion-report.json": { status: built.status, imports: built.imports, runs: built.runs, coverage: built.coverage, validationDiagnostics: built.validationDiagnostics },
  };
  for (const [name, data] of Object.entries(files)) {
    expect(readFileSync(`src/data/generated/2026-07-v1/rent/${name}`, "utf8")).toBe(`${JSON.stringify(data, null, 2)}\n`);
  }
});

it("coverage rejects malformed source QA rather than accepting numeric substitutes", () => {
  const records = release.records.map((r) => rentRecordSchema.parse(r));
  records[0].qa.sourceState = "NOT_AVAILABLE";
  records[0].qa.rawSourceValue = "[x]";
  expect(validateRentCoverage(records).diagnostics).toContainEqual(expect.objectContaining({ code: "INVALID_RENT_SOURCE_STATE" }));
});
