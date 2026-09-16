import { expect, test, type Page } from "@playwright/test";

async function preview(page: Page, fixture: string) {
  await page.goto("/dev/calculator-results");
  await page.getByLabel("Scenario", { exact: true }).selectOption(fixture);
  await page.getByRole("button", { name: "Calculate preview" }).click();
  await expect(page.locator("#result-title")).toBeVisible();
}

test("complete engine result and source disclosure", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await preview(page, "complete");
  await expect(page.locator("#result-title")).toContainText(/£.+higher/);
  await expect(page.locator("#overview")).not.toContainText("Not available");
  await expect(page.locator("#salary")).toContainText(/£.+\/year/);
  await expect(page.locator("#coverage")).toContainText("8 of 8 cost categories resolved");
  await page.screenshot({ path: "/tmp/ukmr-results-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Basis & sources: Rent, current, Manchester", exact: true }).click();
  await expect(page.getByRole("region", { name: "Rent — Current · Manchester", exact: true })).toContainText("ONS");
});

test("partial costs retain income but disclose water and unavailable salary", async ({ page }) => {
  await preview(page, "partial");
  await expect(page.locator("#result-title")).not.toContainText("£");
  await expect(page.locator("#overview")).toContainText("Not available");
  await expect(page.locator("#salary")).toContainText("Salary result unavailable");
  await expect(page.locator("#salary")).not.toContainText("£0");
  await expect(page.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Water", exact: true }) })).toContainText("Needs input");
  await expect(page.locator("#changes")).toContainText("Excluded from ranking");
  await expect(page.locator("#coverage")).toContainText("7 of 8 cost categories resolved");
  await page.screenshot({ path: "/tmp/ukmr-3b-partial-desktop.png", fullPage: true });
});

test("override labels, mobile stacking and cost row cards", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preview(page, "override");
  await expect(page.getByRole("region", { name: "Monthly results" }).getByText("Your amount", { exact: true })).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole("region", { name: "Monthly costs table" })).toBeVisible();
  await page.screenshot({ path: "/tmp/ukmr-results-mobile.png", fullPage: true });
});

test("unavailable income stays explicit and production entry has no fixture values", async ({ page }) => {
  await preview(page, "limited");
  await expect(page.getByRole("region", { name: "Monthly results" })).toContainText("Needs input");
  await expect(page.locator("#salary")).toContainText("Salary result unavailable");
  await page.goto("/calculator/results");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your comparison starts with your inputs");
  await expect(page.getByText("Development preview", { exact: false })).toHaveCount(0);
});
