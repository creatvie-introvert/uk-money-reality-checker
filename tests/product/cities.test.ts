import { describe, expect, it } from "vitest";
import { buildCityPages, cityDefinitions, cityMetadata, findCity } from "../../src/product/cities/registry";
import { activeDatasets } from "../../src/engine/loaders/datasets";

const pages = buildCityPages();
const expected = ["london", "birmingham", "manchester", "leeds", "liverpool", "bristol", "edinburgh", "glasgow"];
describe("public city evidence boundary", () => {
  it("has exactly the eight canonical cities and unique calculator IDs", () => {
    expect(cityDefinitions.map((c) => c.slug)).toEqual(expected);
    expect(new Set(cityDefinitions.map((c) => c.calculatorCityId)).size).toBe(8);
    for (const slug of ["york", "London", "greater-glasgow", "__proto__", ""]) expect(findCity(slug)).toBeUndefined();
  });
  it.each(expected)("%s has all eight categories, unique metadata and a plain calculator entry", (slug) => {
    const model = pages.find((p) => p.city.slug === slug)!;
    expect(model.coverage.map((c) => c.id)).toEqual(["rent", "council_tax", "energy", "water", "groceries", "essentials", "lifestyle", "transport"]);
    expect(model.calculatorHref).toBe("/calculator");
    expect(cityMetadata(model.city).title).toBe(`${model.city.displayName} living-cost evidence | UK Money Reality`);
    expect(model.taxContext).toContain("You confirm the applicable taxpayer status yourself");
    expect(JSON.stringify(model)).not.toMatch(/undefined|£|BLOCKED_FROM_RELEASE|DEV_ONLY|MODELLED_ESTIMATE|cheapest|best city|most affordable|least affordable|worst|score/i);
  });
  it.each([
    ["london", "E12000007", "Thames Water"], ["birmingham", "E08000025", "Severn Trent"],
    ["manchester", "E08000003", "United Utilities"], ["leeds", "E08000035", "Yorkshire Water"],
    ["liverpool", "E08000012", "United Utilities"], ["bristol", "E06000023", "Wessex Water"],
    ["glasgow", "S33000009", "Scottish Water"],
  ])("%s preserves geography and provider", (slug, code, provider) => {
    const model = pages.find((p) => p.city.slug === slug)!;
    expect(model.coverage[0].context.join(" ")).toContain(code);
    expect(model.coverage.find((c) => c.id === "water")!.context.join(" ")).toContain(provider);
    expect(model.coverage[0].sources.every((s) => s.period === "2026-07")).toBe(true);
  });
  it("retains Edinburgh gap and Glasgow's separate rental market area", () => {
    const edinburgh = pages.find((p) => p.city.slug === "edinburgh")!;
    expect(edinburgh.coverage[0].state).toBe("Evidence gap");
    expect(edinburgh.coverage[0].sources).toEqual([]);
    expect(edinburgh.coverage[0].context.join(" ")).toContain("No other geography is substituted");
    const glasgow = pages.find((p) => p.city.slug === "glasgow")!;
    expect(glasgow.coverage[0].context.join(" ")).toContain("Greater Glasgow is a broad rental market area, not Glasgow City");
    for (const model of [edinburgh, glasgow]) expect(model.coverage[3].context.join(" ")).toContain("actual council-tax band");
  });
  it("preserves London authority gap and Bristol split service", () => {
    expect(pages[0].coverage[1].sources).toEqual([]);
    expect(pages[0].coverage[1].context.join(" ")).toContain("no released borough schedule");
    expect(pages[5].coverage[3].context.join(" ")).toContain("clean water = Bristol Water; wastewater = Wessex Water");
  });
  it("keeps Birmingham applicability unresolved and West Midlands separate from Bee Network", () => {
    const model = pages[1];
    expect(model.coverage[3].state).toBe("Requires your amount");
    expect(model.coverage[3].context.join(" ")).toContain("unresolved");
    expect(model.coverage[7].context.join(" ")).toContain("West Midlands");
    expect(JSON.stringify(model)).not.toMatch(/Bee Bus|Bee Network/);
  });
  it("keeps reference sources distinct and projects no financial record fields", () => {
    for (const model of pages) {
      for (const id of ["groceries", "essentials", "lifestyle"]) {
        const item = model.coverage.find((c) => c.id === id)!;
        expect(item.sources.length).toBeGreaterThan(0);
        expect(item.sources.every((s) => s.classification === "Reference evidence only")).toBe(true);
      }
      expect(model.coverage[2].context.join(" ")).toContain("no approved automatic city-to-price-cap-region mapping");
      for (const item of model.coverage) for (const source of item.sources) {
        expect(Object.keys(source)).toEqual(["organisation", "title", "url", "period", "effectiveFrom", "effectiveTo", "classification"]);
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.period).toBeTruthy();
      }
      expect(JSON.stringify(model)).not.toMatch(/annualChargeGbp|valueGbp|fareGbp|"amount"|"qa"|"records"/);
      expect(model.coverage[7].context.join(" ")).toContain("do not establish fares for later dates");
    }
  });
  it.each(["BLOCKED_FROM_RELEASE", "DEV_ONLY"])("rejects %s evidence instead of publishing or falling back", (status) => {
    for (const key of ["rent", "water", "transport", "groceries"] as const) {
      const payload = structuredClone(activeDatasets[key].artifact);
      payload.records[0].releaseStatus = status;
      expect(() => buildCityPages({ [key]: payload })).toThrow();
    }
  });
  it("rejects mutated geography, missing records, modelled transport and absent payloads", () => {
    const rent = structuredClone(activeDatasets.rent.artifact);
    rent.records[0].geography.mvpCityId = "LOC-EDI";
    expect(() => buildCityPages({ rent })).toThrow();
    const transport = structuredClone(activeDatasets.transport.artifact);
    transport.records[0].valueType = "MODELLED_ESTIMATE";
    expect(() => buildCityPages({ transport })).toThrow();
    expect(() => buildCityPages({ transport: { ...activeDatasets.transport.artifact, records: [] } })).toThrow();
    expect(() => buildCityPages({ water: undefined })).toThrow();
  });
});
