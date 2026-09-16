import { expect, type Page } from "@playwright/test";
export const field = (page: Page, name: string) => page.locator(`[name="${name}"]`);
export const next = async (page: Page, heading: string) => { await page.getByRole("button", { name: /^Continue/ }).click(); await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading); };
export async function throughReview(page: Page, partial = false) {
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
