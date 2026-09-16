import { describe, expect, it } from "vitest";
import { buildSourceRegister } from "../../src/product/transparency/sources";
import { classifications } from "../../src/product/transparency/classifications";
import { costMethods, methodSections } from "../../src/product/transparency/methodology";
import { activeDatasets, type DatasetKey } from "../../src/engine/loaders/datasets";
import { sourcePeriodText } from "../../src/product/transparency/periods";

const groups = buildSourceRegister();
const entries = groups.flatMap((g) => g.entries);
const byGroup = (id: string) => groups.find((g) => g.id === id)!;
describe("public transparency register", () => {
  it("groups only pinned publications into the eight requested categories", () => {
    expect(groups.map((g) => g.id)).toEqual(["rent", "council-tax", "energy", "water", "spending", "transport", "income-tax", "national-insurance"]);
    expect(entries).toHaveLength(32);
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
    expect(entries.every((e) => e.classification === "Official data")).toBe(true);
  });
  it("retains exactly the recorded source links without inventing publication dates", () => {
    const recorded = Object.values(activeDatasets).flatMap((d) => d.artifact.records.map((r) => r.provenance));
    const expectedUrls = new Set(recorded.map((p) => p.sourceUrl));
    const actualUrls = new Set(entries.flatMap((e) => e.citations.map((c) => c.url)));
    expect(actualUrls).toEqual(expectedUrls);
    for (const entry of entries) {
      const matching = recorded.filter((p) => p.organisation === entry.organisation && p.publicationTitle === entry.title);
      expect(entry.publicationDates).toEqual([...new Set(matching.flatMap((p) => "publicationDate" in p && p.publicationDate ? [p.publicationDate] : []))]);
      for (const citation of entry.citations) expect(matching.some((p) => p.sourceUrl === citation.url && p.sourcePeriod === citation.period)).toBe(true);
    }
    expect(byGroup("energy").entries.find((e) => e.organisation === "Ofgem")!.publicationDates).toEqual([]);
  });
  it("preserves exact rent geographies, period, dimensions and explicit gap", () => {
    const rent = byGroup("rent").entries[0];
    expect(rent.citations[0].period).toBe("2026-07");
    expect(rent.geography).toHaveLength(7);
    expect(rent.geography.join(" ")).toContain("Greater Glasgow (S33000009)");
    expect(rent.geography.join(" ")).toContain("London (E12000007)");
    expect(rent.limitations.join(" ")).toContain("Edinburgh has no exact PIPR city row");
    expect(rent.limitations.join(" ")).toContain("property-type dimensions are separate");
  });
  it("preserves authority/band scope, seven providers and Bristol split", () => {
    expect(byGroup("council-tax").entries).toHaveLength(2);
    expect(byGroup("council-tax").entries.every((e) => e.useStatus === "Used with conditions")).toBe(true);
    const water = byGroup("water").entries;
    expect(water.map((e) => e.organisation).sort()).toEqual(["Bristol Water", "Scottish Water", "Severn Trent", "Thames Water", "United Utilities", "Wessex Water", "Yorkshire Water"]);
    expect(water.find((e) => e.organisation === "Bristol Water")!.scope.join(" ")).toContain("Clean water: Bristol Water");
    expect(water.find((e) => e.organisation === "Wessex Water")!.scope.join(" ")).toContain("Bristol wastewater: Wessex Water");
    expect(water.find((e) => e.organisation === "Severn Trent")!.limitations.join(" ")).toContain("remain unresolved");
    expect(water.find((e) => e.organisation === "Scottish Water")!.useStatus).toBe("Used with conditions");
  });
  it("distinguishes released Ofgem prices from reference consumption and current use", () => {
    const energy = byGroup("energy").entries;
    const ofgem = energy.find((e) => e.organisation === "Ofgem")!;
    const need = energy.find((e) => e.organisation === "DESNZ")!;
    expect(ofgem.evidenceRole).toBe("Published evidence");
    expect(ofgem.useStatus).toBe("Reference only");
    expect(ofgem.citations).toHaveLength(9);
    expect(new Set(ofgem.citations.map((c) => c.linkContext)).size).toBe(9);
    expect(need.citations.map((c) => c.linkContext)).toEqual(["England and Wales", "Scotland"]);
    expect(ofgem.geography).toHaveLength(14);
    expect(need.evidenceRole).toBe("Reference evidence only");
    expect(need.useStatus).toBe("Reference only");
    expect(need.citations.every((c) => c.period === "2024")).toBe(true);
  });
  it("keeps spending references and tax/NI rule inputs distinct", () => {
    for (const entry of byGroup("spending").entries) {
      expect(entry.evidenceRole).toBe("Reference evidence only");
      expect(entry.useStatus).toBe("Reference only");
    }
    for (const entry of [...byGroup("income-tax").entries, ...byGroup("national-insurance").entries]) {
      expect(entry.evidenceRole).toBe("Reference evidence only");
      expect(entry.useStatus).toBe("Used in calculator");
      expect(entry.citations.every((c) => c.effectiveFrom === "2026-04-06" && c.effectiveTo === "2027-04-05")).toBe(true);
    }
    expect(byGroup("income-tax").entries.map((e) => e.organisation)).toEqual(["HMRC", "Scottish Government"]);
  });
  it("preserves transport product scope and same-day evidence without frequency models", () => {
    const transport = byGroup("transport").entries;
    expect(transport).toHaveLength(15);
    expect(transport.every((e) => e.useStatus === "Reference only")).toBe(true);
    expect(transport.every((e) => e.citations.every((c) => c.effectiveFrom === "2026-09-14" && c.effectiveTo === "2026-09-14"))).toBe(true);
    expect(JSON.stringify(transport)).not.toMatch(/1\.5|6\.5|days\/week|MODELLED_ESTIMATE|DEV_ONLY/);
    expect(transport.filter((e) => e.organisation === "Transport for West Midlands").every((e) => !JSON.stringify(e).includes("Bee Network"))).toBe(true);
  });
  it("projects only public fields, no prices, QA notes, register rows or local paths", () => {
    for (const entry of entries) expect(Object.keys(entry).sort()).toEqual(["id", "category", "organisation", "title", "classification", "evidenceRole", "useStatus", "howUsed", "geography", "scope", "publicationDates", "citations", "limitations"].sort());
    expect(JSON.stringify(groups)).not.toMatch(/ukmr_data_pack|\/Users\/|\/tmp\/|src\/data|snapshotId|parserVersion|importVersion|recordId|qaNotes|"qa"|fareGbp|annualChargeGbp|"amount"|BLOCKED_FROM_RELEASE|DEV_ONLY|undefined/);
  });
  it.each(Object.keys(activeDatasets) as DatasetKey[])("rejects forbidden status/classification and source tampering in %s", (key) => {
    for (const status of ["BLOCKED_FROM_RELEASE", "DEV_ONLY"]) {
      const payload = structuredClone(activeDatasets[key].artifact);
      payload.records[0].releaseStatus = status;
      expect(() => buildSourceRegister({ [key]: payload })).toThrow();
    }
    const malformed = structuredClone(activeDatasets[key].artifact);
    malformed.records[0].valueType = "MODELLED_ESTIMATE";
    expect(() => buildSourceRegister({ [key]: malformed })).toThrow();
    const unsupported = structuredClone(activeDatasets[key].artifact);
    unsupported.records[0].provenance.sourceUrl = "https://example.com/invented-source";
    expect(() => buildSourceRegister({ [key]: unsupported })).toThrow();
    expect(() => buildSourceRegister({ [key]: undefined })).toThrow();
  });
});
describe("methodology principles", () => {
  it("explains all eight categories without unsupported spending models", () => {
    expect(costMethods.map((m) => m.title)).toEqual(["Rent", "Council tax", "Energy", "Water", "Groceries", "Essentials", "Lifestyle", "Transport"]);
    expect(JSON.stringify(costMethods)).toContain("no approved automatic city-to-price-cap-region mapping");
    expect(JSON.stringify(costMethods)).toContain("Fare-product selection in the form is deferred");
  });
  it("keeps partial results, coverage, overrides and salary semantics explicit", () => {
    const text = JSON.stringify(methodSections);
    for (const phrase of ["Salary needed to keep the same monthly buffer", "Missing values do not become £0", "not confidence", "City never determines your tax jurisdiction", "destination take-home override makes salary-preservation solving unavailable", "An override does not erase the source baseline", "penny-level gross salary"]) expect(text).toContain(phrase);
  });
  it("uses the same four classification labels as calculator results", () => {
    expect(classifications.map((c) => [c.id, c.label])).toEqual([["OBSERVED_DATA", "Official data"], ["CALCULATED", "Calculated"], ["MODELLED_ESTIMATE", "Estimate"], ["USER_ENTERED", "Your amount"]]);
  });
  it("shares date formatting without collapsing periods or inventing dates", () => {
    expect(sourcePeriodText("2026-07")).toBe("July 2026");
    expect(sourcePeriodText("2026-09-14")).toBe("14 September 2026");
    expect(sourcePeriodText("2026/27 · FYE 2024 · 2026-Q3")).toBe("2026/27 · FYE 2024 · 2026-Q3");
  });
});
