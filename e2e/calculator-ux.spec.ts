import { expect, test, type Page } from "@playwright/test";

const field = (page: Page, name: string) => page.locator(`[name="${name}"]`);
async function next(page: Page, path: string) {
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test("fresh comparison only marks submitted valid steps complete, including after Back", async ({ page }) => {
  await page.goto("/calculator");
  const progress = page.getByRole("navigation", { name: "Calculator progress" });
  await expect(progress.locator('[aria-current="step"]')).toContainText("Move setup");
  await expect(progress.locator('[data-completed="true"]')).toHaveCount(0);
  await expect(progress.getByText("Visited & validated")).toHaveCount(0);
  const upcoming = ["Household & homes", "Income", "Everyday spending", "Transport", "Lifestyle", "Review"];
  for (const label of upcoming) {
    const item = progress.getByRole("listitem").filter({ hasText: label });
    await expect(item).toHaveAttribute("data-completed", "false");
    await expect(item).not.toHaveAttribute("aria-current", "step");
  }
  await field(page, "current.cityId").selectOption("LOC-MAN");
  await field(page, "destination.cityId").selectOption("LOC-LEE");
  await next(page, "/calculator/household");
  await expect(progress.locator('[data-completed="true"]')).toHaveCount(1);
  await expect(progress.locator('[data-completed="true"]')).toContainText("Move setup");
  await expect(progress.locator('[aria-current="step"]')).toContainText("Household & homes");
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(field(page, "household.adults")).toBeFocused();
  await expect(progress.locator('[data-completed="true"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(progress.locator('[aria-current="step"]')).toContainText("Move setup");
  await expect(progress.locator('[data-completed="true"]')).toHaveCount(1);
  await page.getByRole("button", { name: "New comparison", exact: true }).click();
  await expect(progress.locator('[data-completed="true"]')).toHaveCount(0);
  await expect(field(page, "current.cityId")).toHaveValue("");
});

for (const width of [1440, 1024, 768, 390, 320]) {
  test(`Manchester to Leeds reconciled results and plain-language UX at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/calculator");
    await field(page, "current.cityId").selectOption("LOC-MAN");
    await field(page, "destination.cityId").selectOption("LOC-LEE");
    await next(page, "/calculator/household");
    await page.getByLabel("Adults", { exact: false }).fill("1");
    await page.getByLabel("Children aged under 18", { exact: false }).fill("0");
    for (const role of ["current", "destination"]) {
      const group = page.getByRole("group", { name: role === "current" ? "Where you live now" : "Where you’re moving", exact: true });
      await field(page, `${role}.bedrooms`).selectOption("2");
      await group.getByLabel("Use evidence available on", { exact: false }).fill("2026-09-16");
      await expect(group).toContainText("It is not your moving date");
      await group.getByLabel("Published rent period", { exact: false }).selectOption("2026-07");
      await field(page, `${role}.rent.mode`).selectOption("SOURCE");
      await field(page, `${role}.council.mode`).selectOption("SOURCE");
      await field(page, `${role}.council.authorityName`).selectOption(role === "current" ? "Manchester" : "Leeds");
      await field(page, `${role}.council.band`).selectOption("D");
    }
    await page.screenshot({ path: `/tmp/ukmr-3b-household-${width}.png`, fullPage: true });
    await next(page, "/calculator/income");
    for (const role of ["current", "destination"]) {
      const group = page.getByRole("group", { name: role === "current" ? "Where you live now" : "Where you’re moving", exact: true });
      await field(page, `${role}.income.grossAnnualSalaryGbp`).fill(role === "current" ? "50000" : "55000");
      await field(page, `${role}.income.taxJurisdiction`).selectOption("rUK");
      await field(page, `${role}.income.taxYear`).selectOption("2026/27");
      const confirmation = group.getByRole("checkbox", { name: "This calculation matches my employment" });
      await expect(confirmation).toHaveAccessibleDescription(/one employment and standard employee National Insurance/);
      await confirmation.check();
      await expect(group.getByLabel("Use my actual monthly take-home instead", { exact: false })).toHaveValue("");
      if (role === "destination") await expect(group).toContainText("salary-preservation calculation will not be available");
      const disclosure = group.locator("summary");
      await disclosure.focus();
      await disclosure.press("Enter");
      await expect(disclosure.locator("..")).toContainText("Class 1 category A");
      await disclosure.press("Enter");
    }
    await page.screenshot({ path: `/tmp/ukmr-3b-income-${width}.png`, fullPage: true });
    await next(page, "/calculator/spending");
    await expect(page.getByText("Leave blank if unknown. We won’t estimate this automatically.", { exact: true })).toHaveCount(6);
    for (const role of ["current", "destination"]) {
      const current = role === "current";
      await field(page, `${role}.spending.groceries.amountGbp`).fill(current ? "300" : "325");
      await field(page, `${role}.spending.essentials.amountGbp`).fill(current ? "180" : "190");
      await field(page, `${role}.energy.amountGbp`).fill(current ? "120" : "145");
      await field(page, `${role}.water.mode`).selectOption("AMOUNT");
      await field(page, `${role}.water.amountGbp`).fill(current ? "45" : "48");
    }
    await next(page, "/calculator/transport");
    for (const role of ["current", "destination"]) {
      await field(page, `${role}.transport.mode`).selectOption("AMOUNT");
      await field(page, `${role}.transport.amountGbp`).fill(role === "current" ? "100" : "120");
    }
    await next(page, "/calculator/lifestyle");
    await field(page, "current.spending.lifestyle.amountGbp").fill("150");
    await field(page, "destination.spending.lifestyle.amountGbp").fill("175");
    await next(page, "/calculator/review");
    for (const name of ["Edit move", "Edit household", "Edit housing & council tax", "Edit income", "Edit everyday spending", "Edit transport", "Edit lifestyle"]) {
      await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    }
    await expect(page.getByText("Evidence & calculation details", { exact: true })).toHaveCount(4);
    await expect(page.getByText("2026-09-16", { exact: true })).toHaveCount(2);
    await expect(page.getByText(/Confirmed — One employee, one employment, Class 1 category A/)).toHaveCount(2);
    await page.screenshot({ path: `/tmp/ukmr-3b-review-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "See my move reality" }).click();
    await expect(page).toHaveURL(/\/calculator\/results$/);
    await expect(page.locator("#result-title")).toBeFocused();
    await expect(page.locator("#result-title")).toHaveText("Your monthly household costs could be about £151.36 lower");
    const cards = page.getByRole("region", { name: "Monthly results" });
    await expect(cards).toContainText("Monthly buffer after included costs");
    for (const value of ["£3,293.30", "£3,538.12", "£2,163.31", "£1,374.81"]) await expect(cards).toContainText(value);
    for (const value of ["−£151.36/month", "+£244.82/month", "+£396.18/month", "Decrease", "Increase"]) await expect(page.locator("#overview")).toContainText(value);
    await expect(page.getByRole("heading", { name: "Salary needed to keep the same monthly buffer", exact: true })).toBeVisible();
    for (const value of ["£47,477.35/year", "£978.63", "£55,000"]) await expect(page.locator("#salary")).toContainText(value);
    await expect(page.locator("#coverage").getByText(/8 of 8 cost categories resolved/)).toHaveCount(2);
    await expect(page.locator("#coverage")).toContainText("Essentials & lifestyle");
    await expect(page.locator("#changes")).toContainText("Lower cost");
    await expect(page.locator("#changes")).toContainText("Higher cost");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width <= 390) {
      const table = page.getByRole("region", { name: "Monthly costs table" });
      expect(await table.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      const rent = table.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Rent", exact: true }) });
      await expect(rent).toContainText("Current · Manchester");
      await expect(rent).toContainText("Destination · Leeds");
      await expect(rent).toContainText("−£257/month");
    }
    const table = page.getByRole("table");
    const columns = table.getByRole("columnheader");
    const widthsBefore = await columns.evaluateAll((cells) => cells.map((cell) => cell.getBoundingClientRect().width));
    for (const [category, side, city, expected] of [
      ["Rent", "current", "Manchester", "ONS"],
      ["Rent", "destination", "Leeds", "ONS"],
      ["Council tax", "current", "Manchester", "Limitations"],
      ["Groceries", "destination", "Leeds", "Basis"],
    ]) {
      const trigger = page.getByRole("button", { name: `Basis & sources: ${category}, ${side}, ${city}`, exact: true });
      const panelId = await trigger.getAttribute("aria-controls");
      const panel = page.locator(`[id="${panelId}"]`);
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await trigger.focus(); await trigger.press("Enter");
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await expect(panel).toBeVisible();
      await expect(panel.getByRole("heading", { level: 3 })).toContainText(`${side === "current" ? "Current" : "Destination"} · ${city}`);
      await expect(panel).toContainText(expected);
      const disclosureCell = panel.locator("..");
      await expect(disclosureCell).toHaveAttribute("colspan", "4");
      const mainRow = trigger.locator("xpath=ancestor::tr");
      const rowBox = await mainRow.boundingBox(), cellBox = await disclosureCell.boundingBox();
      expect(cellBox!.width).toBeGreaterThanOrEqual(rowBox!.width * .95);
      expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const widthsAfter = await columns.evaluateAll((cells) => cells.map((cell) => cell.getBoundingClientRect().width));
      widthsBefore.forEach((before, i) => expect(Math.abs(widthsAfter[i] - before)).toBeLessThanOrEqual(1));
      await panel.screenshot({ path: `/tmp/ukmr-source-${category.replaceAll(" ", "-")}-${side}-${width}.png` });
      await trigger.press("Space");
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(panel).not.toBeVisible();
      await expect(panel.getByRole("link")).toHaveCount(0);
    }
    // Switching sides keeps evidence separate and closes the previous side in this category.
    const current = page.getByRole("button", { name: "Basis & sources: Rent, current, Manchester", exact: true });
    const destination = page.getByRole("button", { name: "Basis & sources: Rent, destination, Leeds", exact: true });
    await current.click(); await destination.click();
    await expect(current).toHaveAttribute("aria-expanded", "false");
    await expect(destination).toHaveAttribute("aria-expanded", "true");
    await destination.click();
    await page.screenshot({ path: `/tmp/ukmr-3b-results-${width}.png`, fullPage: true });
  });
}

test("keyboard navigation, empty-result context and first-invalid focus at 320px", async ({ page, browserName }) => {
  const tabKey = browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab";
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/calculator/results");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveCount(1);
  await expect(heading).toBeFocused();
  const start = page.getByRole("link", { name: "Start calculator", exact: true });
  await start.focus(); await start.press("Enter");
  await expect(page).toHaveURL(/\/calculator$/);
  const skip = page.getByRole("link", { name: "Skip to calculator" });
  await skip.focus(); await skip.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await page.keyboard.press(tabKey);
  await expect(page.getByRole("navigation", { name: "Breadcrumb", exact: true }).getByRole("link", { name: "UK Money Reality" })).toBeFocused();
  await page.keyboard.press(tabKey);
  await expect(field(page, "current.cityId")).toBeFocused();
  await page.keyboard.press(tabKey);
  await expect(field(page, "destination.cityId")).toBeFocused();
  await page.keyboard.press(tabKey);
  const nextButton = page.getByRole("button", { name: /^Continue/ });
  await expect(nextButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(field(page, "current.cityId")).toBeFocused();
  await expect(field(page, "current.cityId")).toHaveAttribute("aria-invalid", "true");
  await expect(field(page, "current.cityId")).toHaveAccessibleDescription(/choose a city/i);
  await expect(field(page, "current.cityId").locator("..")).toHaveCSS("outline-width", "2px");
  await expect(field(page, "current.cityId").locator("..")).toHaveCSS("outline-style", "solid");
  await expect(page.getByRole("alert", { name: "Input errors" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


for (const width of [1440, 1280, 1024, 1011, 1010, 768, 701, 700, 390, 320]) {
  test(`Move setup presentation and accessible progress at ${width}px`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/calculator");
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Where are you moving?");
    const progress = page.getByRole("navigation", { name: "Calculator progress" });
    await expect(progress.getByRole("listitem")).toHaveCount(7);
    await expect(progress.locator('[aria-current="step"]')).toContainText("Move setup");
    await expect(progress.getByRole("link")).toHaveCount(0);
    const form = page.getByRole("region", { name: "Your two locations" });
    const aside = page.getByRole("complementary", { name: "About your comparison" });
    const current = field(page, "current.cityId"), destination = field(page, "destination.cityId");
    for (const control of [current, destination]) {
      await expect(control).toBeEnabled();
      await expect(control).toHaveValue("");
      await expect(control).toHaveCSS("font-size", "16px");
      await expect(control).toHaveCSS("appearance", "auto");
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    const first = (await current.boundingBox())!, second = (await destination.boundingBox())!;
    if (width <= 700) expect(second.y).toBeGreaterThan(first.y + first.height);
    else expect(Math.abs(second.y - first.y)).toBeLessThan(2);
    const formBox = (await form.boundingBox())!, asideBox = (await aside.boundingBox())!;
    if (width <= 1010) expect(asideBox.y).toBeGreaterThanOrEqual(formBox.y + formBox.height);
    else expect(asideBox.x).toBeGreaterThan(formBox.x + formBox.width);
    await page.getByRole("button", { name: /^Continue/ }).click();
    await expect(current).toBeFocused();
    await expect(page.getByRole("alert", { name: "Input errors" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await current.selectOption("LOC-BIR");
    await destination.selectOption("LOC-MAN");
    await expect(page.getByTestId("move-route-preview")).toContainText("Birmingham");
    await expect(page.getByTestId("move-route-preview")).toContainText("Manchester");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/ukmr-move-setup-${browserName}-${width}.png`, fullPage: true });
  });
}

test("Move setup validates both roles, clears corrected errors on submit and derives route preview", async ({ page }) => {
  await page.goto("/calculator");
  const current = field(page, "current.cityId"), destination = field(page, "destination.cityId");
  const proceed = page.getByRole("button", { name: /^Continue/ });
  const preview = page.getByTestId("move-route-preview");
  const summary = page.getByRole("alert", { name: "Input errors" });
  await expect(proceed).toBeEnabled();
  await expect(preview).toHaveCount(0);
  await proceed.click();
  await expect(summary.getByRole("link")).toHaveText(["Current city: Choose a city.", "Destination city: Choose a city."]);
  await expect(current).toBeFocused();
  await expect(destination).toHaveAttribute("aria-invalid", "true");
  await summary.getByRole("link", { name: /^Destination city:/ }).click();
  await expect(destination).toBeFocused();
  await destination.selectOption("LOC-EDI");
  await expect(current).toHaveValue("");
  await expect(preview).toHaveCount(0);
  await proceed.click();
  await expect(current).toBeFocused();
  await expect(summary.getByRole("link")).toHaveCount(1);
  await expect(destination).toHaveAttribute("aria-invalid", "false");
  await expect(page.locator('[id="destination.cityId-error"]')).toHaveCount(0);
  await current.selectOption("LOC-MAN");
  await expect(preview).toContainText("Manchester");
  await expect(preview).toContainText("Edinburgh");
  await destination.selectOption("");
  await expect(preview).toHaveCount(0);
  await proceed.click();
  await expect(destination).toBeFocused();
  await expect(current).toHaveAttribute("aria-invalid", "false");
  await expect(summary.getByRole("link")).toHaveText(["Destination city: Choose a city."]);
  await destination.selectOption("LOC-MAN");
  await expect(preview.locator("strong")).toHaveText(/Manchester.*to.*Manchester/);
  await proceed.click();
  await expect(page).toHaveURL(/\/calculator\/household$/);
  await expect(page.getByRole("alert", { name: "Input errors" })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "About your comparison" })).toHaveCount(0);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(current).toHaveValue("LOC-MAN");
  await expect(destination).toHaveValue("LOC-MAN");
  await expect(preview).toBeVisible();
  const progress = page.getByRole("navigation", { name: "Calculator progress" });
  await expect(progress.locator('[aria-current="step"]')).toHaveAttribute("data-completed", "true");
  await current.selectOption("LOC-LON");
  await expect(progress.locator('[aria-current="step"]')).toHaveAttribute("data-completed", "false");
  await expect(preview).toContainText("London");
  await expect(destination).toHaveValue("LOC-MAN");
  await page.getByRole("button", { name: "New comparison", exact: true }).click();
  await expect(preview).toHaveCount(0);
  await expect(current).toHaveValue("");
  await expect(destination).toHaveValue("");
});
