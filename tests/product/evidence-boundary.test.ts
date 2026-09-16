import { describe, expect, it } from "vitest";
import { buildCalculatorEvidence } from "@/product/calculator/evidence/projection";
import { createCalculatorEvidence } from "@/product/calculator/evidence/client";
import { calculateProductResult } from "@/product/calculator/runtime";
import { createEvidenceLoader } from "@/engine/loaders";
import { activeDatasets } from "@/engine/loaders/datasets";
import { previewForm, previewNames } from "@/features/calculator/development/fixtures";
const dto = buildCalculatorEvidence();
const projected = createCalculatorEvidence(structuredClone(dto));
const original = createEvidenceLoader();
describe("calculator evidence boundary", () => {
  it.each(Object.keys(previewNames) as (keyof typeof previewNames)[])("preserves the entire product result and disclosure model for %s", (name) => {
    const form = previewForm(name);
    expect(calculateProductResult(form, projected)).toEqual(calculateProductResult(form, original));
  });
  it("removes unused energy/English water/all-property records without changing available selectors", () => {
    expect(dto.records.energyConsumption).toEqual([]);
    expect(dto.records.energyPrice).toEqual([]);
    expect(dto.records.water).toHaveLength(24);
    expect(dto.records.rent).toHaveLength(28);
    expect(dto.records.groceries).toHaveLength(32);
    expect(dto.records.householdSpending).toHaveLength(53);
    expect(dto.records.transport).toHaveLength(25);
    expect(projected.metadata).toEqual(original.metadata);
  });
  it("retains exact council decimal input but removes worksheet/QA/extraction baggage", () => {
    expect(dto.records.councilTax.every((r) => Object.keys(r.qa).join() === "displayedAnnualGbp")).toBe(true);
    expect(JSON.stringify(dto)).not.toMatch(/sourceCell|sourceTable|rawSourceValue|sourceNumberFormat|sourceReference|parserVersion|importVersion|snapshotChecksum|ukmr_data_pack|\/Users\//);
    expect(dto.provenance.length).toBeLessThan(50);
    expect(projected.getTaxReference({ jurisdiction: "Scotland", taxYear: "2026/27" })[0].provenance.limitations).toEqual(original.getTaxReference({ jurisdiction: "Scotland", taxYear: "2026/27" })[0].provenance.limitations);
  });
  it("rejects altered source evidence before crossing the server boundary", () => {
    const raw = structuredClone(activeDatasets.rent.artifact);
    raw.records[0].valueGbp += 1;
    expect(() => buildCalculatorEvidence({ rent: raw })).toThrow();
    for (const status of ["DEV_ONLY", "BLOCKED_FROM_RELEASE"]) {
      const bad = structuredClone(activeDatasets.water.artifact); bad.records[0].releaseStatus = status;
      expect(() => buildCalculatorEvidence({ water: bad })).toThrow();
    }
  });
  it("rejects corrupt packing and freezes unpacked evidence", () => {
    const bad = structuredClone(dto); Object.assign(bad.records.rent[0], { provenanceIndex: -1 });
    expect(() => createCalculatorEvidence(bad)).toThrow();
    const r = projected.getRentEvidence({ cityId: "LOC-MAN", bedroomBand: "two bed", sourcePeriod: "2026-07" })[0];
    expect(Object.isFrozen(r)).toBe(true); expect(Object.isFrozen(r.provenance)).toBe(true);
  });
});
