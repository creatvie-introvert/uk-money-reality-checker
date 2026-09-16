import { expect, test } from "@playwright/test";

for (const width of [1440, 1280, 1024, 768, 390, 320]) test(`public transparency content and disclosures at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  for (const [path, title] of [["methodology", "Methodology"], ["sources", "Data sources"]]) {
    await page.goto(`/${path}`);
    await expect(page).toHaveTitle(`${title} | UK Money Reality`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
    const text = await page.getByRole("main").innerText();
    expect(text).not.toMatch(/being prepared|in preparation|temporary page|not complete yet|\/Users\/|ukmr_data_pack|DEV_ONLY|BLOCKED_FROM_RELEASE|undefined/);
    for (const label of ["Official data", "Calculated", "Estimate", "Your amount"]) await expect(page.getByRole("definition").locator("..").filter({ has: page.getByText(label, { exact: true }) })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (path === "methodology") {
      for (const phrase of ["Monthly take-home income", "− included monthly household costs", "= monthly buffer", "Missing values do not become £0", "not confidence", "City never determines your tax jurisdiction", "It is not savings"]) expect(text).toContain(phrase);
      for (const title of ["Rent", "Council tax", "Energy", "Water", "Groceries", "Essentials", "Lifestyle", "Transport"]) await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Salary needed to keep the same monthly buffer", exact: true })).toBeVisible();
      await page.getByRole("navigation", { name: "Methodology contents" }).getByRole("link", { name: "Salary preservation", exact: true }).click();
      await expect(page).toHaveURL(/#salary$/);
    } else {
      await expect(page.locator("details")).toHaveCount(32);
      for (const title of ["Rent", "Council tax", "Energy", "Water", "Groceries and household spending", "Transport", "Income tax", "National Insurance"]) await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      const rent = page.locator("#rent details").first();
      const summary = rent.locator("summary");
      await summary.focus();
      expect(await summary.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
      await summary.press("Enter");
      await expect(rent).toHaveAttribute("open", "");
      for (const phrase of ["July 2026", "Greater Glasgow (S33000009)", "Edinburgh has no exact PIPR city row", "19 August 2026"]) await expect(rent).toContainText(phrase);
      if (width === 1440 || width === 390) await page.screenshot({ path: `/tmp/ukmr-4-3-sources-rent-${width}.png`, fullPage: true });
      if (width === 1440 || width === 390) await rent.screenshot({ path: `/tmp/ukmr-4-3-rent-detail-${width}.png` });
      await summary.press("Space");
      await expect(rent).not.toHaveAttribute("open", "");
      for (const disclosure of await page.locator("details summary").all()) await disclosure.click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const phrase of ["Bristol Water", "Wessex Water", "Severn Trent", "Reference evidence only", "14 September 2026", "6 April 2026", "FYE 2024", "FYE 2025"]) await expect(page.getByRole("main")).toContainText(phrase);
      expect(await page.locator("main a, main summary").evaluateAll((elements) => elements.filter((el) => { const r = el.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth; }).map((el) => el.textContent))).toEqual([]);
      const fullText = await page.getByRole("main").innerText();
      expect(fullText).not.toMatch(/\/Users\/|\/tmp\/|src\/data|snapshotId|parserVersion|ukmr_data_pack|DEV_ONLY|BLOCKED_FROM_RELEASE|undefined/);
      for (const disclosure of await page.locator("details summary").all()) await disclosure.click();
      if (width === 1440 || width === 390) {
        for (const disclosure of await page.locator("#energy summary").all()) await disclosure.click();
        await page.locator("#energy").scrollIntoViewIfNeeded();
        await page.locator("#energy").screenshot({ path: `/tmp/ukmr-4-3-energy-detail-${width}.png` });
        await page.screenshot({ path: `/tmp/ukmr-4-3-sources-energy-${width}.png`, fullPage: true });
        for (const disclosure of await page.locator("#energy summary").all()) await disclosure.click();
      }
    }
    if (width === 1440 || width === 390) await page.screenshot({ path: `/tmp/ukmr-4-3-${path}-${width}.png`, fullPage: true });
  }
});

test("homepage and city transparency links reach finished pages", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Read the methodology", exact: true }).click();
  await expect(page).toHaveURL(/\/methodology$/);
  await page.getByRole("link", { name: /Explore the data sources/ }).click();
  await expect(page).toHaveURL(/\/sources$/);
  await page.goto("/cities/bristol");
  await expect(page.getByRole("main")).not.toContainText("in preparation");
  await page.getByRole("main").getByRole("link", { name: "Methodology", exact: true }).click();
  await expect(page).toHaveURL(/\/methodology$/);
  await page.goto("/cities/edinburgh");
  await page.getByRole("main").getByRole("link", { name: "Sources", exact: true }).click();
  await expect(page).toHaveURL(/\/sources$/);
  await page.getByRole("main").getByRole("link", { name: "Compare your move", exact: true }).click();
  await expect(page).toHaveURL(/\/calculator$/);
});
