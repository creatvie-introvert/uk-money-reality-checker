import { expect, test } from "@playwright/test";

test("public entry links, indexing and fixed legacy redirects", async ({ page, request, baseURL }) => {
  const paths = ["/", "/cities", ...["london", "birmingham", "manchester", "leeds", "liverpool", "bristol", "edinburgh", "glasgow"].map((s) => `/cities/${s}`), "/methodology", "/sources", "/privacy", "/accessibility"];
  const targets = new Set<string>();
  for (const path of paths) {
    const response = await page.goto(path);
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
    if (process.env.SMOKE_EXPECT_SITE_URL && new URL(baseURL!).origin === new URL(process.env.SMOKE_EXPECT_SITE_URL).origin) expect(response!.headers()["x-robots-tag"] ?? "").not.toMatch(/noindex/i);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).not.toContainText(/coming soon|being prepared|lorem ipsum|development preview/i);
    const links = await page.locator("a[href]").evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href));
    for (const link of links) {
      const url = new URL(link); expect(["http:", "https:"]).toContain(url.protocol);
      if (url.origin === new URL(baseURL!).origin) targets.add(url.pathname);
    }
    const scripts = await page.locator("script[src]").evaluateAll((els) => els.map((el) => (el as HTMLScriptElement).src));
    expect(scripts.every((url) => new URL(url).origin === new URL(baseURL!).origin)).toBe(true);
    expect(scripts.join()).not.toMatch(/googlesyndication|google-analytics|googletagmanager|vercel-insights|posthog/i);
  }
  for (const target of targets) expect((await request.get(target)).status(), target).toBe(200);
  for (const [legacy, target] of [["/index.html", "/"], ["/privacy.html", "/privacy"], ["/cookies.html", "/privacy#cookies"]]) {
    const response = await request.get(`${legacy}?legacyValue=discard-me`, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    const location = new URL(response.headers().location, baseURL);
    expect(location.origin).toBe(new URL(baseURL!).origin);
    expect(location.pathname + location.hash).toBe(target); expect(location.search).toBe("");
  }
  const robots = await request.get("/robots.txt"); expect(robots.status()).toBe(200);
  const text = await robots.text(); expect(text).toContain("Allow: /"); expect(text).toContain("Disallow: /dev/");
  const xml = await request.get("/sitemap.xml");
  const expected = process.env.SMOKE_EXPECT_SITE_URL ?? process.env.SITE_URL;
  if (expected) {
    expect(xml.status()).toBe(200); const body = await xml.text();
    expect(body.match(/<loc>/g)).toHaveLength(15); expect(body).toContain(`${new URL(expected).origin}/accessibility`);
    expect(body).not.toMatch(/\/dev\/|\/calculator\/results|\/about/);
    expect(text).toContain(`Sitemap: ${new URL(expected).origin}/sitemap.xml`);
  } else {
    // An unsigned local build is deliberately not an indexable production sitemap.
    expect(process.env.SMOKE_BASE_URL, "Deployed checks require SMOKE_EXPECT_SITE_URL").toBeUndefined();
    expect(xml.status()).toBe(503); expect(text).not.toContain("Sitemap:");
  }
});

test("legacy browser preferences are not imported or modified", async ({ page }) => {
  await page.goto("/privacy");
  const legacy = { selectedIncomeRange: "legacy-sentinel", selectedRegion: "legacy-region", selectedHousehold: "legacy-household", cookieConsent: "accepted" };
  await page.evaluate((values) => { for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value); }, legacy);
  await page.goto("/calculator");
  await expect(page.locator('[name="current.cityId"]')).toBeEnabled();
  await expect(page.locator('[name="current.cityId"]')).toHaveValue("");
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(legacy);
  await page.goto("/calculator/results");
  await expect(page.getByRole("link", { name: "Start calculator", exact: true })).toBeVisible();
});
