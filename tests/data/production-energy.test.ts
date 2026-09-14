import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { energyConsumptionRecordSchema, energyPriceRecordSchema } from "../../src/data/schemas/records";
import { buildEnergyRelease, validateEnergyArtifact, validateEnergyCoverage, energySnapshots, type EnergyFamily } from "../../src/data/ingestion/energy/release";
import { needExtracts, priceExtracts } from "../../src/data/ingestion/energy/sources";
import { priceRegions } from "../../src/data/ingestion/energy/adapters";
const need = buildEnergyRelease("consumption");
const price = buildEnergyRelease("prices");
const consumption = need.release!.records.map((r) => energyConsumptionRecordSchema.parse(r));
const rates = price.release!.records.map((r) => energyPriceRecordSchema.parse(r));
function mutate(family: EnergyFamily, patch: Record<string, unknown>, index = 0) {
  const inputs = structuredClone(family === "consumption" ? needExtracts : priceExtracts);
  Object.assign(inputs[index].rows[0], patch);
  return buildEnergyRelease(family, inputs);
}

it("emits separate reference and direct artifact families with complete retained-scope counts", () => {
  expect(need.status).toBe("SUCCESS"); expect(price.status).toBe("SUCCESS");
  expect(need.release!.kind).toBe("REFERENCE_ARTIFACT"); expect(price.release!.kind).toBe("DIRECT_EVIDENCE_RELEASE");
  expect(consumption).toHaveLength(784); expect(rates).toHaveLength(126);
  expect(need.release!.manifest.sourceSnapshotIds).toHaveLength(2); expect(price.release!.manifest.sourceSnapshotIds).toHaveLength(9);
  for (const result of [need, price]) {
    expect(result.coverage.status).toBe("COMPLETE");
    expect(result.release!.manifest.recordCount).toBe(result.release!.records.length);
    for (const run of result.runs) {
      expect(run.counts.rejectedRows).toBe(0);
      expect(run.rows.length).toBe(run.counts.inputRows);
      expect(run.counts.acceptedRows).toBe(run.counts.inputRows);
    }
  }
});
it.each(["England and Wales", "Scotland"])("normalizes observed %s NEED references without modelled dimensions", (nation) => {
  const rows = consumption.filter((r) => r.sourceNationGroup === nation);
  expect(rows.length).toBeGreaterThan(0);
  for (const r of rows) {
    expect(r.releaseStatus).toBe("REFERENCE_ONLY"); expect(r.valueType).toBe("OBSERVED_DATA");
    expect(r.sourceYear).toBe(2024); expect(r.provenance.sourcePeriod).toBe("2024");
    expect(r).not.toHaveProperty("adultOccupancy"); expect(r).not.toHaveProperty("householdComposition"); expect(r).not.toHaveProperty("heatingType");
    expect(r.geography).not.toHaveProperty("mvpCityId");
    expect(r.annualKwh).toBe(Number(r.qa.rawAnnualKwh)); expect(r.sampleCount).toBe(r.qa.sampleCount);
    if (nation === "Scotland") expect(r.geography.official).toEqual({ geographyType: "country", name: "Scotland", sourceId: "SRC-003" });
  }
});
it("retains native flat/terrace and age bands without harmonizing Scotland to England/Wales", () => {
  const ew = consumption.filter((r) => r.sourceNationGroup === "England and Wales");
  const sc = consumption.filter((r) => r.sourceNationGroup === "Scotland");
  expect(new Set(ew.map((r) => r.propertyType))).toEqual(new Set(["Bungalow", "Converted flat", "Detached", "End terrace", "Mid terrace", "Purpose built flat", "Semi detached"]));
  expect(new Set(sc.map((r) => r.propertyType))).toEqual(new Set(["Detached", "Flat", "Semi detached", "Terraced", "Unknown"]));
  expect(ew.some((r) => r.propertyAge === "Pre 1919")).toBe(true);
  expect(sc.some((r) => r.propertyAge === "Up to 1870")).toBe(true);
  expect(sc.some((r) => r.propertyAge === "Unknown")).toBe(true);
  expect(ew.some((r) => r.propertyType === "Flat")).toBe(false);
  expect(sc.some((r) => r.propertyAge === "Pre 1919")).toBe(false);
});
it("covers all applicable fuels/statistics per retained profile and preserves non-applicable gas raw markers", () => {
  for (const extract of needExtracts) for (const profile of extract.profiles) {
    const rows = consumption.filter((r) => r.qa.profileId === profile.profileId);
    expect(rows).toHaveLength(profile.gasPresent === "Yes" ? 8 : 4);
    for (const fuel of profile.gasPresent === "Yes" ? ["gas", "electricity"] : ["electricity"]) {
      expect(new Set(rows.filter((r) => r.fuel === fuel).map((r) => r.statistic))).toEqual(new Set(["mean", "lower_quartile", "median", "upper_quartile"]));
    }
    if (profile.gasPresent === "No") expect(Object.values(profile.rawCells)).toContain("[no data]");
  }
  expect(need.coverage.scope).toContain("PARTIAL");
  expect(need.coverage.cityCoverage.status).toBe("NOT_APPLICABLE");
});
it.each(["0", "-1", "NaN", "Infinity", "[no data]", "", "1e99"])("rejects invalid NEED annual consumption %s", (rawAnnualKwh) => {
  const result = mutate("consumption", { rawAnnualKwh });
  expect(result.release).toBeUndefined(); expect(result.runs[0].counts.rejectedRows).toBe(1);
  expect(result.runs[0].rows[0]).toMatchObject({ status: "REJECTED", raw: { rawAnnualKwh } });
});
it.each([
  { sourceYear: 2023 }, { sampleCount: -1 }, { sampleCount: 0.5 }, { propertyType: "Flat" }, { propertyAge: "Up to 1870" },
  { adultOccupancy: 2 }, { heatingType: "gas boiler" }, { mvpCityId: "LOC-LON" }, { regionCode: "E09000001" },
  { fuel: "oil" }, { statistic: "total" }, { sourceCell: "A1" },
])("rejects unreviewed NEED source fields %j", (patch) => {
  expect(mutate("consumption", patch).status).toBe("FAILED");
});
it("rejects a Scottish sub-national region and source-native category substitutions", () => {
  expect(mutate("consumption", { region: "Glasgow" }, 1).release).toBeUndefined();
  expect(mutate("consumption", { propertyType: "Converted flat" }, 1).release).toBeUndefined();
  expect(mutate("consumption", { propertyAge: "Pre 1919" }, 1).release).toBeUndefined();
});
it("canonical sampleCount allows zero but reviewed-source reconciliation rejects fabricated counts", () => {
  expect(energyConsumptionRecordSchema.safeParse({ ...consumption[0], sampleCount: 0 }).success).toBe(true);
  expect(mutate("consumption", { sampleCount: 0 }).status).toBe("FAILED");
});
it.each(priceRegions)("retains all nine fuel/payment/tariff combinations for %s without a city mapping", (region) => {
  const rows = rates.filter((r) => r.geography.official.name === region);
  expect(rows).toHaveLength(9);
  for (const paymentMethod of ["Direct Debit", "standard credit", "prepayment meter"]) {
    const group = rows.filter((r) => r.paymentMethod === paymentMethod);
    expect(group.map((r) => r.fuel === "gas" ? "gas" : r.electricityTariffType).sort()).toEqual(["gas", "multi-rate", "single rate"]);
  }
  for (const r of rows) {
    expect(r.geography.official.geographyType).toBe("energy_region"); expect(r.geography).not.toHaveProperty("mvpCityId");
    expect(r.releaseStatus).toBe("RELEASE_READY"); expect(r.valueType).toBe("OBSERVED_DATA");
    expect(r.effectiveFrom).toBe("2026-07-01"); expect(r.effectiveTo).toBe("2026-09-30");
    expect(r.provenance.licenceReference).toContain("UNRESOLVED");
    expect(r.qa.officialPageChecksum).toMatch(/^sha256:[a-f0-9]{64}$/);
    if (r.fuel === "gas") expect(r.electricityTariffType).toBeUndefined();
  }
});
it("converts source pence to GBP accurately without calculating energy bills", () => {
  const r = rates.find((r) => r.geography.official.name === "North Western England" && r.paymentMethod === "Direct Debit" && r.electricityTariffType === "single rate")!;
  expect(r.unitRateGbpPerKwh).toBe(0.2613); expect(r.standingChargeGbpPerDay).toBe(0.4761);
  const gas = rates.find((r) => r.geography.official.name === "North Western England" && r.paymentMethod === "Direct Debit" && r.fuel === "gas")!;
  expect(gas.unitRateGbpPerKwh).toBe(0.0724); expect(gas.standingChargeGbpPerDay).toBe(0.2917);
});
it("keeps city coverage explicitly unresolved and excludes Great Britain averages", () => {
  expect(price.coverage.cityCoverage).toMatchObject({ status: "UNRESOLVED", diagnostics: [{ code: "ENERGY_CITY_REGION_MAPPING_UNRESOLVED" }] });
  expect(rates.some((r) => r.geography.official.name === "Great Britain average")).toBe(false);
  expect(priceExtracts.every((e) => e.excludedSourceRows.length === 1)).toBe(true);
});
it.each([
  { effectiveFrom: "2026-10-01" }, { effectiveFrom: "2026-07-32" }, { effectiveTo: "2026-06-30" },
  { rawUnitRate: "0.00 pence per kWh" }, { rawUnitRate: "-1.00 pence per kWh" }, { rawStandingCharge: "0.00 pence per day" },
  { rawUnitRate: "26.13 GBP/kWh" }, { rawUnitRate: "[no data]" }, { region: "Great Britain average" },
  { mvpCityId: "LOC-LON" }, { electricityTariffType: "Economy 7 night" }, { paymentMethod: "cash" },
])("blocks invalid Ofgem source rows %j", (patch) => {
  const result = mutate("prices", patch);
  expect(result.status).toBe("FAILED"); expect(result.release).toBeUndefined(); expect(result.runs[0].counts.rejectedRows).toBe(1);
});
it("rejects gas/electricity tariff-type mismatches", () => {
  expect(mutate("prices", { electricityTariffType: undefined }).release).toBeUndefined();
  expect(mutate("prices", { electricityTariffType: "single rate" }, 2).release).toBeUndefined();
});
it.each(["consumption", "prices"] as const)("rejects missing, duplicate and altered %s rows with full accounting", (family) => {
  const inputs = structuredClone(family === "consumption" ? needExtracts : priceExtracts);
  inputs[0].rows.pop();
  expect(buildEnergyRelease(family, inputs).release).toBeUndefined();
  const rows: unknown[] = inputs[0].rows;
  rows.push(rows[0]);
  const result = buildEnergyRelease(family, inputs);
  expect(result.runs[0].counts.rejectedRows).toBe(2);
  expect(result.runs[0].counts.inputRows).toBe(result.runs[0].counts.acceptedRows + result.runs[0].counts.rejectedRows);
  expect(result.runs[0].rows).toHaveLength(inputs[0].rows.length);
  expect(result.runs[0].diagnostics.some((d) => d.code === "DUPLICATE_SOURCE_IDENTIFIER")).toBe(true);
  expect(result.release).toBeUndefined();
  expect(mutate(family, family === "consumption" ? { rawAnnualKwh: "1234" } : { rawUnitRate: "99.99 pence per kWh" }).release).toBeUndefined();
});
describe.each(["consumption", "prices"] as const)("%s deserialized production gate", (family) => {
  const result = family === "consumption" ? need : price;
  it("reconciles metadata, source checksums and snapshot registry", () => {
    const candidate = structuredClone(result.release!);
    candidate.records[0].provenance.snapshotChecksum = "fake";
    expect(() => validateEnergyArtifact(family, candidate)).toThrow();
    expect(() => validateEnergyArtifact(family, result.release!, [])).toThrow();
    expect(() => validateEnergyArtifact(family, result.release!, [...energySnapshots, energySnapshots[0]])).toThrow();
    const inputs = structuredClone(family === "consumption" ? needExtracts : priceExtracts);
    inputs[0].snapshot.checksum = "fake";
    expect(() => buildEnergyRelease(family, inputs)).toThrow();
  });
  it("rejects swapped artifact/status families, missing evidence and manifest mismatch", () => {
    const candidate = structuredClone(result.release!);
    candidate.records[0].releaseStatus = family === "consumption" ? "RELEASE_READY" : "REFERENCE_ONLY";
    expect(() => validateEnergyArtifact(family, candidate)).toThrow();
    const counts = structuredClone(result.release!); counts.manifest.recordCount -= 1;
    expect(() => validateEnergyArtifact(family, counts)).toThrow();
    expect(validateEnergyCoverage(family, result.release!.records.slice(1)).status).toBe("FAILED");
    expect(validateEnergyCoverage(family, [...result.release!.records, result.release!.records[0]]).status).toBe("FAILED");
  });
  it("rejects unsupported city mappings and model dimensions in canonical records", () => {
    const candidate = structuredClone(result.release!);
    Object.assign(candidate.records[0], { adultOccupancy: 2 });
    expect(() => validateEnergyArtifact(family, candidate)).toThrow();
    const records = result.release!.records.map((r) => structuredClone(r));
    const first = family === "consumption" ? energyConsumptionRecordSchema.parse(records[0]) : energyPriceRecordSchema.parse(records[0]);
    Object.assign(first.geography, { mvpCityId: "LOC-LON" });
    records[0] = first;
    expect(validateEnergyCoverage(family, records).status).toBe("FAILED");
  });
});
it("rejects reversed canonical price dates", () => {
  expect(energyPriceRecordSchema.safeParse({ ...rates[0], effectiveTo: "2026-06-30" }).success).toBe(false);
});
it("reproduces all six artifact files byte-for-byte", () => {
  for (const family of ["consumption", "prices"] as const) {
    const result = buildEnergyRelease(family);
    expect(JSON.stringify(result)).toBe(JSON.stringify(family === "consumption" ? need : price));
    const dir = family === "consumption" ? "2024-v1/energy-consumption" : "2026-q3-v1/energy-prices";
    const files = { "audit.json": result.audit, [family === "consumption" ? "reference.json" : "release.json"]: result.release, "ingestion-report.json": { status: result.status, imports: result.imports, runs: result.runs, coverage: result.coverage, validationDiagnostics: result.validationDiagnostics } };
    for (const [name, value] of Object.entries(files)) expect(readFileSync(`src/data/generated/${dir}/${name}`, "utf8")).toBe(`${JSON.stringify(value, null, 2)}\n`);
  }
});
