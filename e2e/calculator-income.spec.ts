import { expect, test } from "@playwright/test";
import { field, throughReview } from "./helpers/journey";

for (const modes of [["calculated", "calculated"], ["calculated", "override"], ["override", "calculated"], ["override", "override"], ["unknown", "unknown"]]) {
  test(`shared tax year for ${modes.join("/")}`, async ({ page }) => {
    await page.goto("/calculator/income");
    const year = page.getByRole("combobox", { name: "Tax year for this comparison" });
    await expect(year).toHaveValue("");
    await expect(page.locator('[name$="income.taxYear"]')).toHaveCount(0);
    for (const [i, role] of ["current", "destination"].entries()) {
      await expect(field(page, `${role}.income.taxJurisdiction`)).toHaveValue("");
      await field(page, `${role}.income.taxJurisdiction`).selectOption(i === 0 ? "rUK" : "Scotland");
      await field(page, `${role}.income.scope`).check();
      if (modes[i] !== "unknown") await field(page, `${role}.income.grossAnnualSalaryGbp`).fill("50000");
      if (modes[i] === "override") await field(page, `${role}.income.netOverride.amountGbp`).fill("0");
    }
    await page.getByRole("button", { name: /^Continue/ }).click();
    if (modes.includes("calculated")) {
      await expect(year).toBeFocused();
      await expect(year).toHaveAttribute("aria-invalid", "true");
      await expect(year).toHaveAccessibleDescription(/Choose the tax year for this comparison/);
      const link = page.getByRole("alert").getByRole("link", { name: "Choose the tax year for this comparison." });
      await expect(link).toHaveCount(1); await link.click(); await expect(year).toBeFocused();
      await year.selectOption("2026/27");
      await page.getByRole("button", { name: /^Continue/ }).click();
    }
    await expect(page).toHaveURL(/\/spending$/);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(field(page, "current.income.taxJurisdiction")).toHaveValue("rUK");
    await expect(field(page, "destination.income.taxJurisdiction")).toHaveValue("Scotland");
    await expect(year).toHaveValue(modes.includes("calculated") ? "2026/27" : "");
  });
}

test("shared year is shown once on Review, survives editing and resets", async ({ page }) => {
  await throughReview(page);
  await expect(page.getByText("Tax year for this comparison", { exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Edit income", exact: true }).click();
  const year = page.getByRole("combobox", { name: "Tax year for this comparison" });
  await expect(year).toHaveValue("2026/27");
  await year.selectOption("");
  await page.getByRole("button", { name: "Save and return to review" }).click();
  await expect(year).toBeFocused();
  await expect(page.getByRole("alert").getByRole("link", { name: "Choose the tax year for this comparison." })).toHaveCount(1);
  await year.selectOption("2026/27");
  await field(page, "destination.income.taxJurisdiction").selectOption("Scotland");
  await field(page, "destination.income.netOverride.amountGbp").fill("3500");
  await page.getByRole("button", { name: "Save and return to review" }).click();
  await page.getByRole("button", { name: "Edit income", exact: true }).click();
  await expect(year).toHaveValue("2026/27");
  await expect(field(page, "destination.income.netOverride.amountGbp")).toHaveValue("3500");
  await expect(field(page, "current.income.taxJurisdiction")).toHaveValue("rUK");
  await expect(field(page, "destination.income.taxJurisdiction")).toHaveValue("Scotland");
  await page.getByRole("button", { name: "New comparison", exact: true }).click();
  await page.goto("/calculator/income");
  await expect(year).toHaveValue("");
});

for (const width of [1440, 1280, 1151, 1150, 1024, 768, 761, 760, 701, 700, 390, 320]) {
  test(`Income presentation and native controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/calculator/income');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Calculator progress' }).locator('[aria-current="step"]')).toContainText('Income');
    await expect(page.getByText('Step 3 of 7 · Income', { exact: true })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Tax year for this comparison' })).toHaveValue('');
    const cards = page.locator('fieldset[data-scenario]');
    const boxes = await cards.evaluateAll((els) => els.map((el) => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })));
    if (width > 760) expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
    else expect(boxes[1].y).toBeGreaterThan(boxes[0].y);
    for (const role of ['current', 'destination']) {
      const salary = field(page, `${role}.income.grossAnnualSalaryGbp`);
      await expect(salary).toHaveValue('');
      await expect(salary).toHaveAttribute('inputmode', 'decimal');
      const jurisdiction = field(page, `${role}.income.taxJurisdiction`);
      await expect(jurisdiction).toHaveValue('');
      await jurisdiction.selectOption('rUK');
      expect(await jurisdiction.evaluate((el) => ({ size: parseFloat(getComputedStyle(el).fontSize), height: el.getBoundingClientRect().height, appearance: getComputedStyle(el).appearance }))).toEqual({ size: 16, height: 49, appearance: 'auto' });
    }
    await field(page, 'destination.income.netOverride.amountGbp').fill('3500');
    await expect(page.getByText('Salary needed will be unavailable', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const clipped = await page.locator('main input, main select, main button').evaluateAll((els) => els.filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < 0 || r.right > innerWidth + 1); }).map((el) => el.id || el.textContent));
    expect(clipped).toEqual([]);
    await page.screenshot({ path: `/tmp/ukmr-income-${width}.png`, fullPage: true });
  });
}

test('Income money validation retains zero, malformed input and contextual focus', async ({ page }) => {
  await page.goto('/calculator/income');
  const salary = field(page, 'current.income.grossAnnualSalaryGbp');
  await salary.fill('-1');
  await field(page, 'destination.income.netOverride.amountGbp').fill('not money');
  await page.getByRole('button', { name: /^Continue/ }).click();
  await expect(salary).toBeFocused();
  await expect(salary).toHaveAttribute('aria-invalid', 'true');
  await expect(salary).toHaveAccessibleDescription(/nonnegative/);
  await expect(page.getByRole('alert').getByRole('link', { name: /Current income — Gross annual salary:/ })).toBeVisible();
  await expect(page.getByRole('alert').getByRole('link', { name: /Destination income — Monthly take-home:/ })).toBeVisible();
  expect(await salary.evaluate((el) => getComputedStyle(el.parentElement!).outlineWidth)).toBe('2px');
  expect(await salary.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
  for (const value of ['abc', '12.345']) {
    await salary.fill(value);
    await page.getByRole('button', { name: /^Continue/ }).click();
    await expect(salary).toHaveValue(value);
    await expect(salary).toHaveAttribute('aria-invalid', 'true');
  }
  await salary.fill('0');
  await field(page, 'destination.income.netOverride.amountGbp').fill('0');
  await field(page, 'comparison.taxYear').selectOption('2026/27');
  await field(page, 'current.income.taxJurisdiction').selectOption('rUK');
  await field(page, 'current.income.scope').check();
  await page.getByRole('button', { name: /^Continue/ }).click();
  await expect(page).toHaveURL(/\/spending$/);
});

test('Income native select and money focus stay clean on both cards', async ({ page }) => {
  await page.goto('/calculator/income');
  for (const role of ['current', 'destination']) {
    const select = field(page, `${role}.income.taxJurisdiction`);
    await select.focus();
    expect(await select.evaluate((el) => getComputedStyle(el.parentElement!).outlineWidth)).toBe('2px');
    expect(await select.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
    const amount = field(page, `${role}.income.netOverride.amountGbp`);
    await amount.focus();
    expect(await amount.evaluate((el) => getComputedStyle(el.parentElement!).outlineWidth)).toBe('2px');
    await amount.fill('100');
    await amount.press('Tab');
    if (role === 'current') await expect(field(page, 'destination.income.grossAnnualSalaryGbp')).toBeFocused();
    else await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeFocused();
  }
});
