import { expect, test } from "@playwright/test";

for (const width of [1440, 1280, 1024, 1001, 1000, 921, 920, 901, 900, 768, 701, 700, 390, 360, 320]) {
  test(`V4 sections, disclosures and reflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator("main section")).toHaveCount(7);
    expect(await page.locator("main section").evaluateAll((nodes) => nodes.map((node) => node.id))).toEqual(["hero", "example", "how", "cities", "evidence-context", "faq", "start"]);
    await expect(page.locator("#how ol > li")).toHaveCount(3);
    await expect(page.locator("#cities img")).toHaveCount(0);
    await expect(page.locator("[data-demo], .demo-toast, .preview-ribbon")).toHaveCount(0);
    await page.locator("#example summary").click();
    const example = page.locator("#example");
    await expect(example.getByRole("table")).toBeVisible();
    await expect(example.getByRole("row")).toHaveCount(7);
    for (const text of ["£50,000", "£55,000", "16 September 2026", "July 2026", "no automatic single-person", "not official city averages", "Pensions, student loans", "Class 1 category A", "not necessarily a complete household budget", "not a moving date"]) await expect(example).toContainText(text);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await example.getByRole("table").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    const panel = page.locator('[class*="context-panel"]');
    const columns = await panel.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(columns).toBe(width <= 900 ? 1 : 2);
  });
}

test("all calculator CTAs open a blank journey and local links have real targets", async ({ page }) => {
  await page.goto("/");
  const links = await page.locator('main a[href="/calculator"]').count();
  expect(links).toBe(6);
  for (let i = 0; i < links; i++) {
    await page.goto("/");
    await page.locator('main a[href="/calculator"]').nth(i).click();
    await expect(page).toHaveURL(/\/calculator$/);
    for (const name of ["current.cityId", "destination.cityId"]) await expect(page.locator(`[name="${name}"]`)).toHaveValue("");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("outline-width", "0px");
  }
  await page.goto("/");
  const missing = await page.locator('main a[href^="#"]').evaluateAll((links) => links.map((a) => a.getAttribute("href")!).filter((href) => !document.getElementById(href.slice(1))));
  expect(missing).toEqual([]);
  await page.getByRole("link", { name: "See how it works" }).click();
  await expect(page).toHaveURL(/#how$/);
});

test("FAQ keyboard, reduced motion and credit-free city cards", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const summaries = page.locator("#faq summary");
  await expect(summaries).toHaveCount(4);
  for (const summary of await summaries.all()) {
    await summary.focus();
    await summary.press("Enter");
    await expect(summary.locator("..")).toHaveAttribute("open", "");
    await expect(summary).toHaveCSS("outline-style", "solid");
    await summary.press("Space");
    await expect(summary.locator("..")).not.toHaveAttribute("open");
  }
  const button = page.locator('#hero a[href="/calculator"]');
  await button.hover();
  await expect(button).toHaveCSS("transform", "none");
  await expect(page.locator('#hero [class*="mock"] [class*="locations"]')).toHaveCount(1);
  await expect(page.locator("main")).not.toContainText(/photo credits|Wikimedia/);
  for (const slug of ["london", "birmingham", "manchester", "leeds", "liverpool", "bristol", "edinburgh", "glasgow"]) {
    await page.goto("/");
    await page.locator(`#cities a[href="/cities/${slug}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/cities/${slug}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});
