import { expect, test } from "@playwright/test";
for (const width of [1440, 1024, 768, 390, 320]) test(`privacy, accessibility and footer at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  for (const [route, title] of [["/privacy", "Privacy"], ["/accessibility", "Accessibility"]]) {
    await page.goto(route);
    await expect(page).toHaveTitle(`${title} | UK Money Reality`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
    await expect(page.getByRole("main")).not.toContainText(/coming soon|being prepared|lorem ipsum|placeholder/i);
    for (const label of ["Privacy", "Accessibility"]) await expect(page.getByRole("navigation", { name: "Footer navigation" }).getByRole("link", { name: label, exact: true })).toHaveAttribute("href", `/${label.toLowerCase()}`);
    const toc = page.getByRole("navigation", { name: `${title} contents` }).getByRole("link").first();
    await toc.focus(); await toc.press("Enter");
    await expect(page).toHaveURL(/#/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/ukmr-4-5-${title.toLowerCase()}-${width}.png`, fullPage: true });
  }
  await page.getByRole("navigation", { name: "Footer navigation" }).getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page).toHaveURL(/\/privacy$/);
});
