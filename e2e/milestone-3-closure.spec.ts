import { expect, test, type Page } from "@playwright/test";
const field = (page: Page, name: string) => page.locator(`[name="${name}"]`);
const next = async (page: Page, heading: string) => { await auditWidths(page, new URL(page.url()).pathname.split("/").at(-1)!); await page.getByRole("button", { name: /^Continue/ }).click(); await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading); };
async function throughReview(page: Page, partial = false) {
  await page.goto("/calculator");
  await expect(field(page, "current.cityId")).toBeEnabled();
  await page.screenshot({ path: `/tmp/ukmr-start-${page.viewportSize()?.width}.png`, fullPage: true });
  await field(page, "current.cityId").selectOption("LOC-MAN"); await field(page, "destination.cityId").selectOption("LOC-LON");
  await next(page, "Tell us about your household and homes");
  await field(page, "household.adults").fill("2"); await field(page, "household.children").fill("0");
  for (const role of ["current", "destination"]) {
    await field(page, `${role}.bedrooms`).selectOption("2");
    await field(page, `${role}.effectiveOn`).fill("2026-09-14");
    await field(page, `${role}.rentSourceMonth`).selectOption("2026-07");
    await field(page, `${role}.rent.mode`).selectOption("AMOUNT");
    await field(page, `${role}.rent.amountGbp`).fill(role === "current" ? "1200" : "1800");
    await field(page, `${role}.council.mode`).selectOption("AMOUNT");
    await field(page, `${role}.council.amountGbp`).fill("180");
  }
  await page.screenshot({ path: `/tmp/ukmr-household-${page.viewportSize()?.width}.png`, fullPage: true });
  await next(page, "What do you earn now, and after the move?");
  for (const role of ["current", "destination"]) {
    await field(page, `${role}.income.grossAnnualSalaryGbp`).fill(role === "current" ? "50000" : "60000");
    await field(page, `${role}.income.taxJurisdiction`).selectOption("rUK");
    await field(page, `${role}.income.taxYear`).selectOption("2026/27");
    await field(page, `${role}.income.scope`).check();
  }
  await next(page, "How do your everyday costs look?");
  for (const role of ["current", "destination"]) {
    await field(page, `${role}.spending.groceries.amountGbp`).fill("300");
    await field(page, `${role}.spending.essentials.amountGbp`).fill("80");
    if (!partial || role === "current") await field(page, `${role}.energy.amountGbp`).fill("120");
    await field(page, `${role}.water.mode`).selectOption("AMOUNT");
    await field(page, `${role}.water.amountGbp`).fill("55");
  }
  await next(page, "What will you spend on getting around?");
  for (const role of ["current", "destination"]) if (!partial || role === "current") {
    await field(page, `${role}.transport.mode`).selectOption("AMOUNT"); await field(page, `${role}.transport.amountGbp`).fill("70");
  }
  await next(page, "What lifestyle spending should we include?");
  for (const role of ["current", "destination"]) await field(page, `${role}.spending.lifestyle.amountGbp`).fill("100");
  await next(page, "Check your move before we calculate");
}
async function submit(page: Page) {
  await page.getByRole("button", { name: "See my move reality" }).click();
  await expect(page).toHaveURL(/\/calculator\/results$/);
  await expect(page.locator("#result-title")).toBeVisible();
  await page.screenshot({ path: `/tmp/ukmr-production-results-${page.viewportSize()?.width}-${(await page.locator("#result-title").textContent())?.includes("part") ? "partial" : "complete"}.png`, fullPage: true });
}

// One supplementary matrix: existing specs own numerical, keyboard and navigation regressions.
async function auditWidths(page: Page, name: string) {
  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const clipped = await page.locator("main input, main select, main button").evaluateAll((els) => els.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
    }).map((el) => el.getAttribute("name") || el.textContent));
    expect(clipped).toEqual([]);
    await page.screenshot({ path: `/tmp/ukmr-closure-${name}-${width}.png`, fullPage: true });
  }
}
test("closure responsive matrix preserves partial truth, evidence and client-only state", async ({ page, context }) => {
  test.setTimeout(120000);
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (!["GET", "HEAD"].includes(request.method())) mutations.push(`${request.method()} ${request.url()}`);
  });
  await throughReview(page, true);
  await auditWidths(page, "review");
  await submit(page);
  await expect(page.locator("#coverage")).toContainText("6 of 8 cost categories resolved");
  await expect(page.locator("#salary")).toContainText("Salary result unavailable");
  await expect(page.locator("#overview")).toContainText("+£486.48/month");
  await auditWidths(page, "partial");
  const source = page.getByRole("button", { name: "Basis & sources: Rent, current, Manchester", exact: true });
  await source.click();
  await expect(source).toHaveAttribute("aria-expanded", "true");
  await auditWidths(page, "source");
  await source.click();
  await page.getByRole("button", { name: /Adjust your inputs/ }).click();
  await page.getByRole("button", { name: "Edit everyday spending", exact: true }).click();
  await field(page, "destination.energy.amountGbp").fill("120");
  await page.getByRole("button", { name: "Save and return to review" }).click();
  await page.getByRole("button", { name: "Edit transport", exact: true }).click();
  await field(page, "destination.transport.mode").selectOption("AMOUNT");
  await field(page, "destination.transport.amountGbp").fill("70");
  await page.getByRole("button", { name: "Save and return to review" }).click();
  await submit(page);
  await expect(page.locator("#coverage").getByText("8 of 8 cost categories resolved")).toHaveCount(2);
  await expect(page.locator("#salary")).not.toContainText("Salary result unavailable");
  await auditWidths(page, "complete");
  expect(mutations).toEqual([]);
  expect(new URL(page.url()).search).toBe("");
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  expect(await context.cookies()).toEqual([]);
});
