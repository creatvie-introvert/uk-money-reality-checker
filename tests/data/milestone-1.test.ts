import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { directEvidenceReleaseSchema } from "@/data/schemas/artifacts";
import { transportExtracts } from "@/data/ingestion/transport/sources";
import inventory from "../../docs/data/milestone-1-inventory.json";
import rent from "../../src/data/generated/2026-07-v1/rent/release.json";

const report = (path: string) => JSON.parse(readFileSync(path, "utf8"));
describe("Milestone 1 closure gates", () => {
  it("verifies the complete pinned artifact set and coverage bytes", () => {
    expect(() => execFileSync(process.execPath, ["scripts/data/milestone-1.mjs", "--check"], { stdio: "pipe" })).not.toThrow();
  }, 30_000);

  it.each(["MODELLED_ESTIMATE", "USER_ENTERED"])("rejects %s even with RELEASE_READY in the generic direct gate", (valueType) => {
    const changed = structuredClone(rent);
    Object.assign(changed.records[0], { valueType, releaseStatus: "RELEASE_READY" });
    expect(directEvidenceReleaseSchema.safeParse(changed).success).toBe(false);
  });

  it("preserves all 80 qualified coverage cells and unresolved diagnostics", () => {
    expect(inventory.coverage).toHaveLength(8);
    for (const city of inventory.coverage) {
      expect(city.cells).toHaveLength(10);
      expect(new Set(city.cells.map((c) => c.category)).size).toBe(10);
      const cell = (category: string) => city.cells.find((c) => c.category === category)!;
      expect(cell("energy_price").status).toBe("APPLICABILITY_UNRESOLVED");
      expect(JSON.stringify(report(cell("energy_price").report))).toContain("ENERGY_CITY_REGION_MAPPING_UNRESOLVED");
      expect(JSON.stringify(report(cell("energy_consumption").report))).toContain("NEED_CITY_JOINT_PROFILE_UNAVAILABLE");
      for (const category of ["groceries", "household_spending"]) {
        expect(cell(category).status).toBe("NOT_CITY_SPECIFIC");
        const c = report(cell(category).report).coverage;
        expect(c.householdProfileCoverage.diagnostic).toBe("HOUSEHOLD_SPENDING_MODEL_NOT_IMPLEMENTED");
        expect(c.productMapping.diagnostic).toBe("ESSENTIALS_LIFESTYLE_MAPPING_NOT_APPROVED");
      }
      expect(cell("transport").status).toBe("SELECTED_PRODUCTS_ONLY");
      const transport = report(cell("transport").report).coverage.cityCoverage.find((c: { cityId: string }) => c.cityId === city.cityId);
      expect(transport.cityDefault).toBe("UNRESOLVED");
      expect(transport.diagnostics[0].code).toBe("TRANSPORT_CITY_DEFAULT_PRODUCT_UNRESOLVED");
      expect(cell("rent").status).toBe(city.cityId === "LOC-EDI" ? "SOURCE_GAP" : "DIRECT_EVIDENCE_AVAILABLE");
      expect(cell("council_tax").status).toBe(city.cityId === "LOC-LON" ? "APPLICABILITY_UNRESOLVED" : "DIRECT_EVIDENCE_AVAILABLE");
      expect(cell("water").status).toBe(city.cityId === "LOC-BIR" ? "APPLICABILITY_UNRESOLVED" : "PARTIAL");
      expect(report(cell("water").report).coverage.cityCoverage.every((c: { addressDefaultSelection: string }) => c.addressDefaultSelection === "NOT_ESTABLISHED")).toBe(true);
    }
  });

  it("does not contradict captured transport checksums or duplicate limitations", () => {
    const missing = "Official rendered page reviewed; no original byte capture/checksum available.";
    for (const source of transportExtracts) {
      expect(new Set(source.limitations).size).toBe(source.limitations.length);
      expect(source.limitations.includes(missing)).toBe(!("checksum" in source.snapshot));
    }
  });
});
