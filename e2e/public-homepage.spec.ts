import { expect, test } from "@playwright/test";

for (const width of [1440, 1280, 1024, 768, 390, 320]) {
  test(`public homepage and navigation remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page).toHaveTitle("UK Money Reality — Compare the financial impact of moving in the UK");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
    const navigation = page.getByRole("navigation", { name: "Main navigation", exact: true });
    for (const label of ["Home", "Calculator", "Cities", "Methodology", "Sources"]) {
      const link = navigation.getByRole("link", { name: label, exact: true });
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    await expect(navigation.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("aria-current", "page");
    const cities = page.getByRole("region", { name: "Eight cities. Your own circumstances.", exact: true });
    for (const city of ["London", "Birmingham", "Manchester", "Leeds", "Liverpool", "Bristol", "Edinburgh", "Glasgow"]) {
      await expect(cities.getByRole("link", { name: city, exact: true })).toHaveAttribute("href", `/cities/${city.toLowerCase()}`);
    }
    for (const title of ["Official UK evidence", "Your actual household amounts", "Missing stays missing", "Transparent sources"]) await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Read the methodology", exact: true })).toHaveAttribute("href", "/methodology");
    // The only currency figure is the explicit missing-is-not-zero explanation.
    const text = await page.getByRole("main").innerText();
    expect(text.match(/£[\d,.]+/g)).toEqual(["£0."]);
    expect(text).not.toMatch(/£47,477|£151\.36|cheapest|most affordable|\d+%/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const outOfBounds = await page.locator("main a, footer a").evaluateAll((links) => links.filter((link) => {
      const r = link.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth;
    }).map((link) => link.textContent));
    expect(outOfBounds).toEqual([]);
    await page.screenshot({ path: `/tmp/ukmr-4-1-home-${width}.png`, fullPage: true });
  });
}

test("public keyboard navigation reaches honest temporary pages and returns home", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content", exact: true });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  for (const [label, path, heading] of [
    ["Methodology", "/methodology", "The methodology page is being prepared"],
    ["Sources", "/sources", "The sources page is being prepared"],
  ]) {
    const link = page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("link", { name: label, exact: true });
    await page.keyboard.press("Tab");
    await link.focus();
    expect(await link.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
    await link.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(page.getByRole("heading", { name: "This page is not complete yet" })).toBeVisible();
    await expect(page.getByRole("main")).toContainText("temporary page");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    for (const width of [1440, 1280, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.screenshot({ path: `/tmp/ukmr-4-1-${label.toLowerCase()}-320.png`, fullPage: true });
    await page.getByRole("link", { name: "Back to home", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  }
  await page.getByRole("link", { name: "London", exact: true }).click();
  await expect(page).toHaveURL(/\/cities\/london$/);
  await page.getByRole("contentinfo").getByRole("link", { name: "Calculator", exact: true }).click();
  await expect(page).toHaveURL(/\/calculator$/);
  await expect(page.getByRole("banner")).toHaveCount(1);
});
