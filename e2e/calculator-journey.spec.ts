import { expect, test, type Page } from "@playwright/test";
const field = (page: Page, name: string) => page.locator(`[name="${name}"]`);
const next = async (page: Page, heading: string) => { await page.getByRole("button", { name: /^Continue/ }).click(); await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading); };
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
test("complete production journey, back/edit after result, refresh and restart", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await throughReview(page);
  await expect(page.getByText("£60000 — your entered amount", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/ukmr-journey-review-desktop.png", fullPage: true });
  await submit(page);
  await expect(page.locator("#result-title")).toHaveText("Your monthly household costs could be about £600 higher");
  await expect(page.locator("#overview")).toContainText("+£486.48/month");
  await expect(page.locator("#salary")).not.toContainText("Salary result unavailable");
  await expect(page.locator("#coverage")).toContainText("8 of 8 cost categories resolved");
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Check your move before we calculate");
  await page.goForward();
  await expect(page.locator("#result-title")).toContainText("£600 higher");
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
  await page.setViewportSize({ width: 768, height: 1180 });
  await throughReview(page);
  await page.getByRole("button", { name: "Edit housing & council tax", exact: true }).click();
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
  await expect(page.locator("#result-title")).toHaveText("Your monthly household costs could be about £700 higher");
});
test("field errors focus and explicit jurisdiction; unknown income is allowed", async ({ page }) => {
  await page.goto("/calculator");
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(field(page, "current.cityId")).toBeFocused();
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
  await page.getByRole("button", { name: "Edit move", exact: true }).click();
  await field(page, "destination.cityId").selectOption("LOC-GLA");
  await page.getByRole("button", { name: "Save and return to review" }).click();
  await page.getByRole("button", { name: "Edit housing & council tax", exact: true }).click();
  await field(page, "destination.rent.mode").selectOption("SOURCE");
  await field(page, "destination.council.mode").selectOption("SOURCE");
  await expect(field(page, "destination.council.authorityName")).toHaveValue("");
  await field(page, "destination.council.authorityName").selectOption("Glasgow City");
  await field(page, "destination.council.band").selectOption("D");
  await field(page, "destination.council.mode").selectOption("AMOUNT");
  await field(page, "destination.council.amountGbp").fill("190");
  await page.getByRole("button", { name: "Save and return to review" }).click();
  await expect(page.getByText("Glasgow City · Band D", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit everyday spending", exact: true }).click();
  await field(page, "destination.water.mode").selectOption("SOURCE");
  await expect(field(page, "destination.water.connectedServices")).toHaveValue("");
  await field(page, "destination.water.band").selectOption("D");
  await field(page, "destination.water.connectedServices").selectOption("combined");
  await page.getByRole("button", { name: "Save and return to review" }).click();
  await page.getByRole("button", { name: "Edit income", exact: true }).click();
  await expect(field(page, "destination.income.taxJurisdiction")).toHaveValue("rUK");
  await field(page, "destination.income.taxJurisdiction").selectOption("Scotland");
  await page.getByRole("button", { name: "Save and return to review" }).click();
  await submit(page);
  await expect(page.locator("#coverage")).toContainText("Glasgow: 8 of 8 cost categories resolved");
  await expect(page.locator("#salary")).toContainText("Tax jurisdiction: Scotland");
});

for (const width of [1440, 1280, 1024, 768, 390]) {
  test(`production layout and disclosure keyboard access at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await throughReview(page);
    await expect(page.locator('[aria-current="step"]')).toContainText("Review");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await submit(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const id of ["overview", "breakdown", "changes", "salary", "coverage", "methodology", "next-actions"]) {
      const section = page.locator(`#${id}`);
      await expect(section).toBeVisible();
      const box = await section.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    const disclosure = page.getByRole("button", { name: "Basis & sources: Rent, current, Manchester", exact: true });
    // Native button supports Enter and retains focus while the full-width row opens.
    await disclosure.focus();
    await expect(disclosure).toBeFocused();
    await disclosure.press("Enter");
    await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("region", { name: "Rent — Current · Manchester", exact: true })).toContainText(/entered|amount/i);
    await disclosure.press("Enter");
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");
    await page.getByText("Source release periods", { exact: true }).click();
    await expect(page.locator("#methodology")).toContainText("Sources use different publication and effective periods.");
    await expect(page.locator("#methodology")).toContainText("July 2026");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390) {
      const cards = page.getByRole("region", { name: "Monthly results" }).locator("article");
      const first = await cards.nth(0).boundingBox(), second = await cards.nth(1).boundingBox();
      expect(second!.y).toBeGreaterThanOrEqual(first!.y + first!.height);
      const table = page.getByRole("region", { name: "Monthly costs table" });
      expect(await table.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      const row = table.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Rent", exact: true }) });
      await expect(row).toContainText("Current · Manchester");
      await expect(row).toContainText("Destination · London");
      await expect(row.getByRole("button", { name: /Basis & sources/ })).toHaveCount(2);
    }
    await page.getByRole("button", { name: /Adjust your inputs/ }).click();
    await expect(page.getByRole("button", { name: "See my move reality" })).toBeVisible();
  });
}

test("money text, required labels, error links and completed-step semantics", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/calculator");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).locator('a[href^="#"]')).toHaveCount(0);
  await page.getByRole("button", { name: /^Continue/ }).click();
  const summary = page.getByRole("alert", { name: "Input errors" });
  await summary.getByRole("link").first().click();
  await expect(field(page, "current.cityId")).toBeFocused();
  await expect(field(page, "current.cityId")).toHaveAttribute("aria-required", "true");
  await field(page, "current.cityId").selectOption("LOC-MAN");
  await field(page, "destination.cityId").selectOption("LOC-LON");
  await next(page, "Tell us about your household and homes");
  await expect(page.locator('[data-completed="true"]')).toContainText("Visited & validated");
  await expect(page.locator('[aria-current="step"]')).toContainText("Household & homes");
  await page.goto("/calculator/income");
  const salary = field(page, "current.income.grossAnnualSalaryGbp");
  await salary.fill("0");
  await expect(salary).toHaveValue("0");
  await salary.fill("");
  await expect(salary).toHaveValue("");
  await salary.fill("1234.50");
  await expect(salary).toHaveValue("1234.50");
  await expect(salary).toHaveAttribute("inputmode", "decimal");
  await salary.focus();
  expect(await salary.locator("..").evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");
});
