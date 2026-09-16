import { expect, test } from "@playwright/test";

const cities = ["London", "Birmingham", "Manchester", "Leeds", "Liverpool", "Bristol", "Edinburgh", "Glasgow"];
const facts = [
  ["London", "E12000007", "Thames Water", "no released borough schedule"],
  ["Birmingham", "E08000025", "Severn Trent", "West Midlands"],
  ["Manchester", "E08000003", "United Utilities", "Bee Network"],
  ["Leeds", "E08000035", "Yorkshire Water", "MCard"],
  ["Liverpool", "E08000012", "United Utilities", "Merseytravel"],
  ["Bristol", "E06000023", "clean water = Bristol Water; wastewater = Wessex Water", "matching wastewater path"],
  ["Edinburgh", "No exact PIPR city row", "Scottish Water", "No other geography is substituted"],
  ["Glasgow", "S33000009", "Scottish Water", "Greater Glasgow is a broad rental market area, not Glasgow City"],
];
for (const [city, ...context] of facts) test(`${city} presents the audited evidence boundary`, async ({ page }) => {
  await page.goto(`/cities/${city.toLowerCase()}`);
  await expect(page).toHaveTitle(`${city} living-cost evidence | UK Money Reality`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Living costs in ${city}`);
  const main = page.getByRole("main");
  for (const text of context) await expect(main).toContainText(text);
  const rendered = await main.innerText();
  expect(rendered).not.toMatch(/undefined|£|cheapest|best city|most affordable|least affordable|worst|score|DEV_ONLY|BLOCKED_FROM_RELEASE/i);
  if (city === "Birmingham") expect(rendered).not.toMatch(/Bee Bus|Bee Network/);
  await expect(main).toContainText("You confirm the applicable taxpayer status yourself");
  await expect(main).toContainText("fare-product selection is deferred");
  await expect(main).toContainText("14 September 2026");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(city);
  const navigation = page.getByRole("navigation", { name: "Main navigation", exact: true });
  await expect(navigation.getByRole("link", { name: "Cities", exact: true })).toHaveAttribute("aria-current", "page");
  const disclosure = page.locator("summary").first();
  await disclosure.focus();
  expect(await disclosure.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
  await disclosure.press("Enter");
  await expect(page.locator("details").first()).toHaveAttribute("open", "");
  await disclosure.press("Space");
  await expect(page.locator("details").first()).not.toHaveAttribute("open", "");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", new RegExp(city));
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
  const cta = page.getByRole("link", { name: `Compare a move involving ${city}`, exact: true }).first();
  await expect(cta).toHaveAttribute("href", "/calculator");
  await cta.click();
  await expect(page).toHaveURL(/\/calculator$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

for (const width of [1440, 1280, 1024, 768, 390, 320]) test(`city index and evidence layouts at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto("/cities");
  await expect(page).toHaveTitle("Supported cities and living-cost evidence | UK Money Reality");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Supported UK cities");
  const index = page.getByRole("region", { name: "Eight supported cities" });
  await expect(index.getByRole("article")).toHaveCount(8);
  for (const city of cities) {
    await expect(index.getByRole("heading", { name: city, exact: true })).toHaveCount(1);
    await expect(index.getByRole("link", { name: `Explore ${city}`, exact: true })).toHaveAttribute("href", `/cities/${city.toLowerCase()}`);
    await expect(index.getByRole("link", { name: `Compare a move involving ${city}`, exact: true })).toHaveAttribute("href", "/calculator");
  }
  expect(await page.getByRole("main").innerText()).not.toMatch(/undefined|£|cheapest|best city|most affordable|least affordable|worst|score|being prepared/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (width === 1440 || width === 390) await page.screenshot({ path: `/tmp/ukmr-4-2-cities-${width}.png`, fullPage: true });
  // Exercise the actual index link before inspecting the shared template's difficult cases.
  await index.getByRole("link", { name: "Explore London", exact: true }).click();
  await expect(page).toHaveURL(/\/cities\/london$/);
  for (const slug of ["london", "bristol", "edinburgh", "glasgow"]) {
    await page.goto(`/cities/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("region", { name: "Evidence at a glance" }).getByRole("listitem")).toHaveCount(8);
    // Open every source disclosure: long publisher names and effective periods must also fit.
    for (const summary of await page.locator("summary").all()) await summary.click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator("main a, main summary").evaluateAll((elements) => elements.filter((el) => { const box = el.getBoundingClientRect(); return box.left < 0 || box.right > innerWidth; }).map((el) => el.textContent))).toEqual([]);
    for (const summary of await page.locator("summary").all()) await summary.click();
    if (width === 1440 || width === 390) await page.screenshot({ path: `/tmp/ukmr-4-2-${slug}-${width}.png`, fullPage: true });
  }
});

test("unsupported cities return 404 without aliases or fallback", async ({ page }) => {
  for (const slug of ["york", "greater-glasgow", "London"]) {
    const response = await page.goto(`/cities/${slug}`);
    expect(response?.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});
