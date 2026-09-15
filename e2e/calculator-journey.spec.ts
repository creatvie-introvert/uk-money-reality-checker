import { expect, test, type Page } from "@playwright/test";
const field = (page: Page, name: string) => page.locator(`[name="${name}"]`);
const next = async (page: Page, heading: string) => { await page.getByRole("button", { name: /^Continue/ }).click(); await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading); };
async function throughReview(page: Page, partial = false) {
  await page.goto("/calculator");
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
}
test("complete production journey, back/edit after result, refresh and restart", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await throughReview(page);
  await expect(page.getByText("£60000 — your entered amount", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/ukmr-journey-review-desktop.png", fullPage: true });
  await submit(page);
  await expect(page.locator("#result-title")).toHaveText("Your move could cost about £600 more each month");
  await expect(page.locator("#overview")).toContainText("+£486.48/month");
  await expect(page.locator("#salary")).not.toContainText("Salary result unavailable");
  await expect(page.locator("#coverage")).toContainText("8 of 8 cost categories resolved");
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Check your move before we calculate");
  await page.goForward();
  await expect(page.locator("#result-title")).toContainText("£600 more each month");
  expect(new URL(page.url()).search).toBe("");
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  await page.getByRole("button", { name: /Adjust your inputs/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Check your move before we calculate");
  await submit(page);
  await page.getByRole("button", { name: "New comparison", exact: true }).click();
  await expect(page).toHaveURL(/\/calculator$/);
  await expect(field(page, "current.cityId")).toHaveValue("");
  await page.goto("/calculator/results");
  await expect(page.getByRole("link", { name: "Start calculator", exact: true })).toBeVisible();
});
test("partial production journey at 390px with truthful missing costs", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await throughReview(page, true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/ukmr-journey-review-mobile.png", fullPage: true });
  await submit(page);
  await expect(page.locator("#result-title")).toHaveText("We can compare part of your monthly costs");
  await expect(page.locator("#overview")).toContainText("Not available");
  await expect(page.locator("#salary")).toContainText("Salary result unavailable");
  await expect(page.locator("#coverage")).toContainText("6 of 8 cost categories resolved");
  await expect(page.locator("#coverage").getByRole("button", { name: "Enter amount" }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await expect(page.getByRole("link", { name: "Start calculator", exact: true })).toBeVisible();
  await expect(page.locator("#result-title")).toHaveCount(0);
});
test("review edit changes result and retains later values; tablet and back navigation", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await throughReview(page);
  await page.getByRole("button", { name: "Edit Housing & council tax", exact: true }).click();
  await expect(field(page, "destination.rent.amountGbp")).toHaveValue("1800");
  await field(page, "destination.rent.amountGbp").fill("1900");
  await page.screenshot({ path: "/tmp/ukmr-journey-household-tablet.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Save and return to review" }).click();
  await expect(page.getByText("£1900 — your entered amount", { exact: true })).toBeVisible();
  await expect(page.getByText("£100 — your entered amount", { exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(field(page, "destination.spending.lifestyle.amountGbp")).toHaveValue("100");
  await next(page, "Check your move before we calculate");
  await submit(page);
  await expect(page.locator("#result-title")).toHaveText("Your move could cost about £700 more each month");
});
test("field errors focus and explicit jurisdiction; unknown income is allowed", async ({ page }) => {
  await page.goto("/calculator");
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(page.getByRole("alert", { name: "Input errors" })).toBeFocused();
  await expect(field(page, "current.cityId")).toHaveAttribute("aria-invalid", "true");
  await page.goto("/calculator/income");
  await field(page, "current.income.grossAnnualSalaryGbp").fill("-1");
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(page.getByRole("alert", { name: "Input errors" })).toContainText("nonnegative amount");
  await field(page, "current.income.grossAnnualSalaryGbp").fill("50000");
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(page.getByRole("alert", { name: "Input errors" })).toContainText("tax jurisdiction");
  await field(page, "current.income.grossAnnualSalaryGbp").fill("");
  await next(page, "How do your everyday costs look?");
});

test("explicit Scottish source selections and retained override baseline", async ({ page }) => {
  await throughReview(page);
  await page.getByRole("button", { name: "Edit Move setup", exact: true }).click();
  await field(page, "destination.cityId").selectOption("LOC-GLA");
  await page.getByRole("button", { name: "Save and return to review" }).click();
  await page.getByRole("button", { name: "Edit Housing & council tax", exact: true }).click();
  await field(page, "destination.rent.mode").selectOption("SOURCE");
  await field(page, "destination.council.mode").selectOption("SOURCE");
  await expect(field(page, "destination.council.authorityName")).toHaveValue("");
  await field(page, "destination.council.authorityName").selectOption("Glasgow City");
  await field(page, "destination.council.band").selectOption("D");
  await field(page, "destination.council.mode").selectOption("AMOUNT");
  await field(page, "destination.council.amountGbp").fill("190");
  await page.getByRole("button", { name: "Save and return to review" }).click();
  await expect(page.getByText("Glasgow City · Band D", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit Everyday spending", exact: true }).click();
  await field(page, "destination.water.mode").selectOption("SOURCE");
  await expect(field(page, "destination.water.connectedServices")).toHaveValue("");
  await field(page, "destination.water.band").selectOption("D");
  await field(page, "destination.water.connectedServices").selectOption("combined");
  await page.getByRole("button", { name: "Save and return to review" }).click();
  await page.getByRole("button", { name: "Edit Income", exact: true }).click();
  await expect(field(page, "destination.income.taxJurisdiction")).toHaveValue("rUK");
  await field(page, "destination.income.taxJurisdiction").selectOption("Scotland");
  await page.getByRole("button", { name: "Save and return to review" }).click();
  await submit(page);
  await expect(page.locator("#coverage")).toContainText("Glasgow: 8 of 8 cost categories resolved");
  await expect(page.locator("#salary")).toContainText("Tax jurisdiction: Scotland");
});
