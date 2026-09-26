import { expect, test, type Page } from "@playwright/test";
import { field, throughReview } from "./helpers/journey";

async function openHousehold(page: Page, destination = "LOC-LEE") {
  await page.goto("/calculator");
  await field(page, "current.cityId").selectOption("LOC-MAN");
  await field(page, "destination.cityId").selectOption(destination);
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(page).toHaveURL(/\/calculator\/household$/);
}
async function completeRequired(page: Page) {
  await field(page, "household.adults").fill("2");
  await field(page, "household.children").fill("0");
  for (const role of ["current", "destination"]) {
    await field(page, `${role}.bedrooms`).selectOption(role === "current" ? "1" : "4");
    await field(page, `${role}.effectiveOn`).fill("2026-09-16");
    await field(page, `${role}.rentSourceMonth`).selectOption("2026-07");
    await field(page, `${role}.rent.mode`).selectOption("SOURCE");
  }
}

test("blank fields, exact choices, contextual errors and count boundaries", async ({ page }) => {
  await openHousehold(page);
  for (const name of ["household.adults", "household.children"]) {
    await expect(field(page, name)).toHaveValue("");
    await expect(field(page, name)).toHaveAttribute("type", "text");
    await expect(field(page, name)).toHaveAttribute("inputmode", "numeric");
  }
  for (const role of ["current", "destination"]) {
    await expect(field(page, `${role}.bedrooms`).locator("option")).toHaveText(["Choose an option", "1", "2", "3", "4 or more"]);
    expect(await field(page, `${role}.bedrooms`).locator("option").evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value))).toEqual(["", "1", "2", "3", "4"]);
    await expect(field(page, `${role}.effectiveOn`)).toHaveValue("");
    await expect(field(page, `${role}.effectiveOn`)).not.toHaveAttribute("min");
    await expect(field(page, `${role}.effectiveOn`)).not.toHaveAttribute("max");
    await expect(field(page, `${role}.rentSourceMonth`)).toHaveValue("");
    await expect(field(page, `${role}.rent.mode`).locator('option[value="UNKNOWN"]')).toHaveCount(0);
    await expect(field(page, `${role}.council.mode`)).toHaveValue("UNKNOWN");
    await expect(field(page, `${role}.rent.amountGbp`)).toHaveCount(0);
  }
  const proceed = page.getByRole("button", { name: "Continue to income" });
  await proceed.click();
  const summary = page.getByRole("alert", { name: "Input errors" });
  await expect(summary.getByRole("link")).toHaveCount(10);
  await expect(field(page, "household.adults")).toBeFocused();
  await summary.getByRole("link", { name: "Destination home — Bedrooms: Choose a bedroom band." }).click();
  await expect(field(page, "destination.bedrooms")).toBeFocused();
  await expect(field(page, "destination.bedrooms")).toHaveAccessibleDescription(/Choose a bedroom band/);
  await completeRequired(page);
  for (const [name, values] of [["household.adults", ["0", "-1", "1.5", "abc", "9007199254740992"]], ["household.children", ["-1", "0.5", "abc"]]] as const) {
    for (const value of values) {
      await field(page, name).fill(value); await proceed.click();
      await expect(field(page, name)).toBeFocused();
      await expect(field(page, name)).toHaveAttribute("aria-invalid", "true");
    }
    await field(page, name).fill(name.endsWith("adults") ? "2" : "0");
  }
  await proceed.click(); await expect(page).toHaveURL(/\/income$/);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(field(page, "household.children")).toHaveValue("0");
  await expect(field(page, "current.bedrooms")).toHaveValue("1");
  await expect(field(page, "destination.bedrooms")).toHaveValue("4");
  await page.reload();
  await expect(field(page, "household.adults")).toHaveValue("");
  await expect(page.getByText("Your selected current city.")).toHaveCount(0);
});

test("rent and council conditionals preserve positive amounts and source context", async ({ page, browserName }) => {
  await openHousehold(page); await completeRequired(page);
  const proceed = page.getByRole("button", { name: "Continue to income" });
  const tabKey = browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab";
  await field(page, "current.rent.mode").selectOption("AMOUNT");
  const amount = field(page, "current.rent.amountGbp");
  await expect(amount).toHaveValue("");
  await field(page, "current.rent.mode").focus(); await page.keyboard.press(tabKey);
  await expect(amount).toBeFocused();
  for (const value of ["", "0", "-1", "1.234", "abc"]) {
    await amount.fill(value); await proceed.click();
    await expect(amount).toBeFocused();
    await expect(amount).toHaveAccessibleDescription(/positive monthly amount/);
  }
  await amount.fill("1200.50");
  await field(page, "current.council.mode").selectOption("SOURCE");
  await expect(field(page, "current.council.authorityName")).toHaveValue("");
  await expect(field(page, "current.council.band")).toHaveValue("");
  await expect(field(page, "current.council.band")).toHaveAttribute("aria-required", "false");
  await proceed.click(); await expect(page).toHaveURL(/\/income$/);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await field(page, "current.council.authorityName").selectOption("Manchester");
  await field(page, "current.council.band").selectOption("D");
  await field(page, "current.council.mode").selectOption("AMOUNT");
  await expect(field(page, "current.council.authorityName")).toHaveCount(0);
  await expect(field(page, "current.council.amountGbp")).toHaveValue("");
  await field(page, "current.council.amountGbp").fill("0"); await proceed.click();
  await expect(field(page, "current.council.amountGbp")).toBeFocused();
  await field(page, "current.council.amountGbp").fill("180.25");
  await expect(field(page, "destination.council.mode")).toHaveValue("UNKNOWN");
  await field(page, "current.council.mode").selectOption("SOURCE");
  await expect(field(page, "current.council.authorityName")).toHaveValue("Manchester");
  await expect(field(page, "current.council.band")).toHaveValue("D");
  await expect(field(page, "current.council.amountGbp")).toHaveCount(0);
  await field(page, "current.rent.mode").selectOption("SOURCE");
  await expect(amount).toHaveCount(0);
  await field(page, "current.rent.mode").focus(); await page.keyboard.press(tabKey);
  await expect(field(page, "current.council.mode")).toBeFocused();
  await proceed.click(); await expect(page).toHaveURL(/\/income$/);
});

test("both Review entry points preserve inputs and Edinburgh remains a partial source path", async ({ page }) => {
  await throughReview(page);
  for (const name of ["Edit household", "Edit housing & council tax"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(field(page, "household.children")).toHaveValue("0");
    await expect(field(page, "destination.council.mode").locator('option[value="SOURCE"]')).toHaveCount(0);
    await expect(field(page, "destination.rent.amountGbp")).toHaveValue("1800");
    await page.getByRole("button", { name: "Save and return to review" }).click();
    await expect(page).toHaveURL(/\/review$/);
  }
  await page.getByRole("button", { name: "Edit move", exact: true }).click();
  await field(page, "destination.cityId").selectOption("LOC-EDI");
  await page.getByRole("button", { name: "Save and return to review" }).click();
  await page.getByRole("button", { name: "Edit housing & council tax", exact: true }).click();
  await field(page, "destination.rent.mode").selectOption("SOURCE");
  await page.getByRole("button", { name: "Save and return to review" }).click();
  await page.getByRole("button", { name: "See my move reality" }).click();
  await expect(page.locator("#result-title")).toContainText("part of your monthly costs");
  await page.getByRole("button", { name: "New comparison", exact: true }).click();
  await expect(field(page, "current.cityId")).toHaveValue("");
});

for (const width of [1440, 1280, 1151, 1150, 1024, 768, 761, 760, 701, 700, 391, 390, 320]) {
  test(`Household responsive native controls and focus at ${width}px`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openHousehold(page);
    const progress = page.getByRole("navigation", { name: "Calculator progress" });
    await expect(progress.getByRole("listitem")).toHaveCount(7);
    await expect(progress.locator('[aria-current="step"]')).toContainText("Household & homes");
    await expect(progress.locator('[data-completed="true"]')).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    const current = page.locator('[data-scenario="current"]'), destination = page.locator('[data-scenario="destination"]');
    const form = page.getByRole("region", { name: "Make the comparison yours" });
    const sidebar = page.getByRole("complementary", { name: "About your household and homes" });
    const a = (await current.boundingBox())!, b = (await destination.boundingBox())!;
    if (width <= 760) expect(b.y).toBeGreaterThan(a.y + a.height);
    else expect(b.x).toBeGreaterThan(a.x + a.width);
    const f = (await form.boundingBox())!, s = (await sidebar.boundingBox())!;
    if (width <= 1150) expect(s.y).toBeGreaterThan(f.y + f.height);
    else expect(s.x).toBeGreaterThan(f.x + f.width);
    for (const select of await page.locator('main select').all()) await expect(select).toHaveCSS("appearance", "auto");
    for (const control of await page.locator('main input, main select').all()) {
      await expect(control).toHaveCSS("font-size", "16px");
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({ path: `/tmp/ukmr-household-${browserName}-${width}-blank.png`, fullPage: true });
    await field(page, "current.rent.mode").selectOption("AMOUNT");
    await field(page, "destination.council.mode").selectOption("AMOUNT");
    for (const invalid of [false, true]) {
      if (invalid) await page.getByRole("button", { name: "Continue to income" }).click();
      await page.keyboard.press("Tab");
      for (const name of ["household.adults", "current.bedrooms", "current.effectiveOn", "current.rent.amountGbp", "destination.council.amountGbp"]) {
        const control = field(page, name); await control.focus();
        await expect(control).toHaveAttribute("aria-invalid", String(invalid));
        await expect(control).toHaveCSS("outline-style", "none");
        await expect(control.locator("..")).toHaveCSS("outline-width", "2px");
        await expect(control.locator("..")).toHaveCSS("outline-style", "solid");
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/ukmr-household-${browserName}-${width}-errors.png`, fullPage: true });
  });
}

for (const width of [1280, 320]) {
  test(`household counters preserve text entry and support keyboard at ${width}px`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 900 });
    await openHousehold(page);
    for (const name of ["adults", "children"]) {
      const input = field(page, `household.${name}`);
      const plus = page.getByRole("button", { name: `Increase ${name}`, exact: true });
      const minus = page.getByRole("button", { name: `Decrease ${name}`, exact: true });
      await expect(input).toHaveValue("");
      await expect(minus).toBeDisabled();
      await expect(plus).toHaveAttribute("type", "button");
      await expect(minus).toHaveAttribute("type", "button");
      for (const button of [plus, minus]) {
        const box = await button.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      await input.focus();
      await page.keyboard.press(browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab");
      await expect(plus).toBeFocused();
      await expect(plus).toHaveCSS("outline-width", "2px");
      await expect(plus).toHaveCSS("outline-offset", "-1px");
      await plus.press("Enter"); await expect(input).toHaveValue("1");
      await plus.press("Space"); await expect(input).toHaveValue("2");
      await minus.click(); await expect(input).toHaveValue("1");
      if (name === "children") { await minus.click(); await expect(input).toHaveValue("0"); }
      await expect(minus).toBeDisabled();
      await input.fill("4"); await minus.click(); await expect(input).toHaveValue("3");
      for (const invalid of ["-1", "1.5", "abc", "9007199254740992", ...(name === "adults" ? ["0"] : [])]) {
        await input.fill(invalid);
        await expect(plus).toBeDisabled(); await expect(minus).toBeDisabled();
        await expect(input).toHaveValue(invalid);
      }
      await input.fill(name === "adults" ? "1" : "0");
    }
    await expect(page.getByRole("alert", { name: "Input errors" })).toHaveCount(0);
    await expect(page).toHaveURL(/\/household$/);
    await field(page, "household.adults").fill("abc");
    await page.getByRole("button", { name: "Continue to income" }).click();
    await expect(field(page, "household.adults")).toBeFocused();
    await expect(field(page, "household.adults")).toHaveValue("abc");
    await expect(field(page, "household.adults")).toHaveAttribute("aria-invalid", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("council SOURCE is city-specific and retains authority and band without defaults", async ({ page }) => {
  await openHousehold(page);
  for (const [role, authority] of [["current", "Manchester"], ["destination", "Leeds"]]) {
    const mode = field(page, `${role}.council.mode`);
    await expect(mode.locator('option[value="SOURCE"]')).toHaveText("Select authority and band");
    await mode.selectOption("SOURCE");
    const authorityInput = field(page, `${role}.council.authorityName`), band = field(page, `${role}.council.band`);
    await expect(authorityInput).toHaveValue(""); await expect(band).toHaveValue("");
    await expect(authorityInput.locator("option")).toHaveText(["Choose an option", authority]);
    await expect(band.locator("option")).toHaveText(["Choose an option", "A", "B", "C", "D", "E", "F", "G", "H"]);
    await authorityInput.selectOption(authority); await band.selectOption("D");
    await mode.selectOption("AMOUNT");
    await expect(authorityInput).toHaveCount(0); await expect(band).toHaveCount(0);
    await mode.selectOption("SOURCE");
    await expect(authorityInput).toHaveValue(authority); await expect(band).toHaveValue("D");
  }
  // Verify London in a fresh comparison, independently of retained SOURCE state.
  await page.getByRole("button", { name: "New comparison", exact: true }).click();
  await field(page, "current.cityId").selectOption("LOC-MAN");
  await field(page, "destination.cityId").selectOption("LOC-LON");
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(field(page, "destination.council.mode").locator("option")).toHaveText(["Choose an option", "I don’t know yet", "Enter my monthly council tax"]);
  await expect(field(page, "destination.council.authorityName")).toHaveCount(0);
  await expect(field(page, "destination.council.band")).toHaveCount(0);
});
