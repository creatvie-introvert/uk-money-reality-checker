import { expect, it, vi } from "vitest";
import { buildHomepageExample, manchesterLeedsHomepageScenario } from "@/product/homepage/example";
import * as orchestrator from "@/product/calculator/orchestrator";

it("generates the dated homepage illustration through the production pathway", () => {
  const spy = vi.spyOn(orchestrator, "calculateProductResult");
  const example = buildHomepageExample();
  expect(spy).toHaveBeenCalledWith(manchesterLeedsHomepageScenario());
  const p = example.product;
  expect([p.current.costs.display, p.destination.costs.display]).toEqual(["£2,314.67", "£2,163.31"]);
  expect([p.current.income.display, p.destination.income.display]).toEqual(["£3,293.30", "£3,538.12"]);
  expect([p.current.residual.display, p.destination.residual.display]).toEqual(["£978.63", "£1,374.81"]);
  expect(example.view.headlines.map((h) => h.text)).toEqual(["−£151.36/month", "+£244.82/month", "+£396.18/month"]);
  expect(example.enteredRows).toHaveLength(6);
  for (const row of example.enteredRows) {
    expect(row.current.explanation.label).toBe("Your amount");
    expect(row.destination.explanation.label).toBe("Your amount");
  }
  expect(p.breakdown.find((r) => r.category === "rent")?.current.explanation.label).toBe("Official data");
  expect(p.breakdown.find((r) => r.category === "council_tax")?.current.explanation.label).toBe("Calculated");
  expect(example.evidence[0].categories[0].explanation.sources[0]).toMatchObject({ geography: "Manchester", period: "2026-07" });
  expect(example.evidence[1].categories[0].explanation.sources[0]).toMatchObject({ geography: "Leeds", period: "2026-07" });
  expect(example.form.current.income.netOverride).toBeUndefined();
  spy.mockRestore();
});

it("fails closed rather than publishing fallback figures for an incomplete example", () => {
  const spy = vi.spyOn(orchestrator, "calculateProductResult").mockReturnValue({ state: "INPUT_REQUIRED", adapter: { current: { state: "INCOMPLETE", issues: [] }, destination: { state: "INCOMPLETE", issues: [] } } });
  expect(() => buildHomepageExample()).toThrow(/incomplete/);
  spy.mockRestore();
});
