import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { waterTariffRecordSchema, type WaterTariffRecord } from "@/data/schemas/records";
import { waterExtracts } from "@/data/ingestion/water/sources";
import { waterCityMappings } from "@/data/ingestion/water/mappings";
import { buildWaterRelease, ingestWater, validateWaterArtifact, validateWaterCoverage, waterSnapshots } from "@/data/ingestion/water/release";
import { sourceCatalog } from "@/data/provenance/catalog";

const result = buildWaterRelease();
const records = result.audit.records as WaterTariffRecord[];
const record = (id: string) => records.find((r) => r.recordId === `${id}:2026-27`)!;
const city = (id: string, candidates: readonly unknown[] = records) => validateWaterCoverage(candidates).cityCoverage.find((c) => c.cityId === id)!;
const mutateRecord = (id: string, update: (r: WaterTariffRecord) => unknown) => records.map((r) => r.recordId === `${id}:2026-27` ? update(structuredClone(r)) : r);

describe("reviewed water mappings and scoped completeness", () => {
  it.each([
    ["LOC-LON", "thames-water", "thames-water"], ["LOC-BIR", "severn-trent", "severn-trent"],
    ["LOC-MAN", "united-utilities", "united-utilities"], ["LOC-LEE", "yorkshire-water", "yorkshire-water"],
    ["LOC-LIV", "united-utilities", "united-utilities"], ["LOC-BRS", "bristol-water", "wessex-water"],
    ["LOC-EDI", "scottish-water", "scottish-water"], ["LOC-GLA", "scottish-water", "scottish-water"],
  ])("preserves %s clean/wastewater providers", (id, clean, wastewater) => {
    expect(city(id).providers).toEqual({ clean_water: clean, wastewater });
    expect(city(id).addressDefaultSelection).toBe("NOT_ESTABLISHED");
  });
  it.each(["LOC-LON", "LOC-MAN", "LOC-LEE", "LOC-LIV", "LOC-BRS", "LOC-EDI", "LOC-GLA"])("completes only the reviewed conditional path for %s", (id) => {
    expect(city(id).status).toBe("COMPLETE_FOR_SUPPORTED_PATH");
    expect(city(id).conditions.length).toBeGreaterThan(0);
  });
  it("does not promote Birmingham because source facts exist", () => {
    expect(records.filter((r) => r.providerId === "severn-trent")).toHaveLength(5);
    expect(city("LOC-BIR")).toMatchObject({ status: "INCOMPLETE", diagnostics: [{ code: "BIRMINGHAM_WATER_APPLICABILITY_UNRESOLVED" }] });
  });
  it("requires all Bristol clean-water components alongside Wessex wastewater", () => {
    const wastewaterOnly = records.filter((r) => r.providerId !== "bristol-water");
    expect(city("LOC-BRS", wastewaterOnly)).toMatchObject({ status: "INCOMPLETE", diagnostics: [{ code: "BRISTOL_CLEAN_WATER_TARIFF_UNRESOLVED" }] });
    expect(records.filter((r) => r.providerId === "wessex-water").every((r) => r.serviceComponent === "wastewater")).toBe(true);
    expect(record("SRC-BRISTOL-WATER:water-volume").regulatedCompany).toContain("South West Water");
  });
  it.each(["SRC-014:water-volume", "SRC-014:sewer-standing-full", "SRC-015:surface-standing", "SRC-017:highway-volume", "SRC-018:sewer-volume", "SRC-BRISTOL-WATER:water-standing"])("rejects incomplete required component %s", (id) => {
    const candidates = records.filter((r) => r.recordId !== `${id}:2026-27`);
    expect(validateWaterCoverage(candidates).status).toBe("FAILED");
    expect(validateWaterCoverage(candidates).cityCoverage.some((c) => c.missingRecordIds.includes(`${id}:2026-27`) && c.status === "INCOMPLETE")).toBe(true);
  });
  it.each(["providers", "supportedRegime", "cityId"])("rejects unsupported mapping changes in %s", (field) => {
    const mappings = structuredClone(waterCityMappings);
    Object.assign(mappings[0], { [field]: field === "providers" ? { clean_water: "wessex-water", wastewater: "wessex-water" } : field === "cityId" ? "LOC-BRS" : "assessed_household" });
    expect(validateWaterCoverage(records, mappings).diagnostics).toContainEqual(expect.objectContaining({ code: "UNSUPPORTED_CITY_PROVIDER_MAPPING" }));
  });
});

describe("source-native tariff semantics", () => {
  it("preserves metered units without monthly bills or pence/GBP confusion", () => {
    expect(record("SRC-014:water-volume")).toMatchObject({ amount: 273.46, unit: "pence/m3", billingRegime: "metered_volumetric", tariffComponent: "volumetric_charge" });
    expect(record("SRC-015:water-volume")).toMatchObject({ amount: 3.235, unit: "GBP/m3" });
    expect(records.every((r) => r.valueType === "OBSERVED_DATA" && !r.unit.includes("month"))).toBe(true);
  });
  it("preserves rateable-value and assessed clean-water paths without inventing wastewater", () => {
    expect(record("SRC-BRISTOL-WATER:rv-multiplier")).toMatchObject({ billingRegime: "rateable_value", amount: 1.7441, unit: "GBP/GBP-rateable-value/year" });
    expect(record("SRC-BRISTOL-WATER:assessed-additional-bedroom")).toMatchObject({ billingRegime: "assessed_household", amount: 70.48, unit: "GBP/additional-bedroom/year" });
    expect(result.coverage.additionalPaths.filter((p) => p.city === "Bristol").every((p) => p.status === "INCOMPLETE")).toBe(true);
  });
  it("retains fixed charge alternatives and drainage distinctions", () => {
    expect(record("SRC-014:sewer-standing-full").amount).toBe(128.13);
    expect(record("SRC-014:sewer-standing-abated")).toMatchObject({ amount: 80.43, variant: "surface_water_abated" });
    expect(record("SRC-018:sewer-standing-reduced").amount).toBe(43);
    expect(record("SRC-017:highway-volume")).toMatchObject({ amount: 27.08, unit: "pence/m3", serviceComponent: "highway_drainage" });
  });
  it.each([
    ["A", 201.30, 233.58, 434.88], ["B", 234.85, 272.51, 507.36], ["C", 268.40, 311.44, 579.84], ["D", 301.95, 350.37, 652.32],
    ["E", 369.05, 428.23, 797.28], ["F", 436.15, 506.09, 942.24], ["G", 503.25, 583.95, 1087.20], ["H", 603.90, 700.74, 1304.64],
  ])("preserves Scottish band %s annual source columns", (band, water, sewer, combined) => {
    for (const [service, amount] of [["clean_water", water], ["wastewater", sewer], ["combined", combined]]) {
      expect(record(`SRC-010:${band}-${service}`)).toMatchObject({ amount, unit: "GBP/year", councilTaxBand: band, billingRegime: "council_tax_band", aggregationRole: service === "combined" ? "alternative_total" : "component", effectiveFrom: "2026-04-01", effectiveTo: "2027-03-31" });
    }
  });
  it("never emits Scottish monthly arithmetic or an observed generic average", () => {
    const sc = records.filter((r) => r.providerId === "scottish-water");
    expect(sc).toHaveLength(24);
    expect(sc.every((r) => r.councilTaxBand && r.amount !== 54.36 && r.unit === "GBP/year")).toBe(true);
  });
});

describe("water reconciliation and row accounting", () => {
  it.each([
    ["providerId", "wessex-water"], ["serviceComponent", "wastewater"], ["billingRegime", "rateable_value"],
    ["tariffComponent", "standing_charge"], ["amount", 0], ["amount", -1], ["amount", 999], ["unit", "GBP/m3"],
    ["effectiveFrom", "2027-04-01"], ["effectiveTo", "2025-03-31"], ["releaseStatus", "REFERENCE_ONLY"], ["releaseStatus", "DEV_ONLY"], ["valueType", "MODELLED_ESTIMATE"],
  ])("blocks altered %s=%s", (field, value) => {
    const candidates = mutateRecord("SRC-014:water-volume", (r) => ({ ...r, [field]: value }));
    expect(validateWaterCoverage(candidates).status).toBe("FAILED");
  });
  it("detects identity duplicates even with a different record ID", () => {
    const coverage = validateWaterCoverage([...records, { ...records[0], recordId: "other-id" }]);
    expect(coverage.diagnostics).toContainEqual(expect.objectContaining({ code: "DUPLICATE_WATER_TARIFF_IDENTITY" }));
  });
  it("rejects city geography, applicability and provenance tampering", () => {
    for (const update of [
      (r: WaterTariffRecord) => ({ ...r, geography: { ...r.geography, mvpCityId: "LOC-BIR" } }),
      (r: WaterTariffRecord) => ({ ...r, applicability: { ...r.applicability, conditions: ["Applies everywhere"] } }),
      (r: WaterTariffRecord) => ({ ...r, provenance: { ...r.provenance, sourceUrl: "https://example.com" } }),
    ]) expect(validateWaterCoverage(mutateRecord("SRC-014:water-volume", update)).status).toBe("FAILED");
  });
  it("accounts for every selected row and never silently drops invalid rows", () => {
    expect(result.status).toBe("SUCCESS");
    expect(result.runs.map((r) => r.counts.inputRows)).toEqual([5, 5, 6, 6, 7, 3, 24]);
    expect(result.runs.every((r) => r.rows.length === r.counts.inputRows && r.counts.rejectedRows === 0 && r.counts.acceptedRows === r.counts.inputRows)).toBe(true);
    const e = structuredClone(waterExtracts[0]);
    Object.assign(e.rows[0], { rawAmount: ".." });
    const run = ingestWater(e).run;
    expect(run.status).toBe("FAILED");
    expect(run.counts).toEqual({ inputRows: 5, acceptedRows: 4, rejectedRows: 1 });
    expect(run.rows[0].status).toBe("REJECTED");
    expect(buildWaterRelease([e, ...waterExtracts.slice(1)]).release).toBeUndefined();
  });
  it("rejects duplicate raw source identities on both rows", () => {
    const e = structuredClone(waterExtracts[0]);
    e.rows.push(structuredClone(e.rows[0]));
    expect(ingestWater(e).run.counts).toEqual({ inputRows: 6, acceptedRows: 4, rejectedRows: 2 });
  });
  it("does not silently transfer a United Utilities occupancy curve into any provider tariff", () => {
    for (const original of waterExtracts) {
      const e = structuredClone(original);
      Object.assign(e.rows[0], { occupancy: 2, litresPerDay: 267 });
      expect(ingestWater(e).run.rows[0].status).toBe("REJECTED");
    }
    expect(records.every((r) => !JSON.stringify(r).includes('"litresPerDay"'))).toBe(true);
  });
  it("rejects empty and omitted provider extracts without publishing", () => {
    expect(buildWaterRelease([]).status).toBe("FAILED");
    expect(buildWaterRelease(waterExtracts.filter((e) => e.key !== "bristol-water")).release).toBeUndefined();
  });
  it("rejects unsupported regime/component and source metadata mutation", () => {
    const e = structuredClone(waterExtracts[0]);
    Object.assign(e.rows[0], { billingRegime: "split_provider" });
    expect(ingestWater(e).run.rows[0].status).toBe("REJECTED");
    expect(() => ingestWater({ ...waterExtracts[0], scope: "Every UK city" })).toThrow(/metadata/);
    expect(() => ingestWater({ ...waterExtracts[0], snapshot: { ...waterExtracts[0].snapshot, checksum: "fake" } })).toThrow(/metadata/);
  });
  it("schema rejects incompatible source units, missing bands, monthly conversion and additive combined totals", () => {
    const sc = record("SRC-010:D-combined");
    for (const changes of [{ unit: "GBP/month" }, { councilTaxBand: undefined }, { aggregationRole: "component" }, { amount: 0 }]) expect(waterTariffRecordSchema.safeParse({ ...sc, ...changes }).success).toBe(false);
  });
});

describe("water artifacts and provenance", () => {
  it("preserves real captured checksums and explicitly missing browser-source checksums", () => {
    expect(waterSnapshots).toHaveLength(7);
    expect(waterSnapshots.filter((s) => s.checksum)).toHaveLength(5);
    for (const snapshot of waterSnapshots) {
      expect(snapshot.retention).toBe("METADATA_ONLY");
      if (snapshot.checksum) expect(snapshot.checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
      else expect(snapshot).toMatchObject({ nonRetentionReason: expect.stringContaining("No source-file checksum") });
      for (const r of records.filter((r) => r.provenance.snapshotId === snapshot.snapshotId)) {
        expect(r.provenance.snapshotChecksum).toBe(snapshot.checksum);
        expect(r.provenance.licenceReference).toContain("UNRESOLVED");
        expect(r.provenance.sourceReference).toBeTruthy();
      }
    }
    expect(sourceCatalog.filter((s) => s.category === "water").every((s) => s.rawSnapshotPolicy === "METADATA_ONLY" && !s.accessMechanisms?.includes("API"))).toBe(true);
  });
  it("reconciles manifest record counts and snapshot identities", () => {
    expect(validateWaterArtifact(result.release).records).toHaveLength(56);
    expect(() => validateWaterArtifact({ ...result.release, manifest: { ...result.release!.manifest, recordCount: 55 } })).toThrow();
    expect(() => validateWaterArtifact({ ...result.release, manifest: { ...result.release!.manifest, sourceSnapshotIds: [] } })).toThrow();
    expect(() => validateWaterArtifact(result.release, waterSnapshots.slice(1))).toThrow();
    expect(() => validateWaterArtifact(result.release, [...waterSnapshots.slice(1), waterSnapshots[1]])).toThrow();
    expect(() => validateWaterArtifact(result.release, waterSnapshots.map((s, i) => i ? s : { ...s, checksum: "fake" }))).toThrow();
  });
  it("rejects a deserialized artifact with a substituted tariff value", () => {
    expect(() => validateWaterArtifact({ ...result.release, records: mutateRecord("SRC-014:water-volume", (r) => ({ ...r, amount: 1 })) })).toThrow();
  });
  it("matches generated artifacts byte for byte and is stable on rebuilding", () => {
    expect(JSON.stringify(buildWaterRelease())).toBe(JSON.stringify(result));
    const files = {
      "audit.json": result.audit, "release.json": result.release,
      "ingestion-report.json": { status: result.status, imports: result.imports, runs: result.runs, coverage: result.coverage, validationDiagnostics: result.validationDiagnostics },
    };
    for (const [name, value] of Object.entries(files)) expect(readFileSync(`src/data/generated/2026-27-v1/water/${name}`, "utf8")).toBe(`${JSON.stringify(value, null, 2)}\n`);
  });
});
