import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { throughReview } from "../e2e/helpers/journey";

test("production routes, headers, static assets, reflow and local performance", async ({ page }, testInfo) => {
  const observations = [];
  const assetFailures: string[] = [];
  page.on("response", (r) => { if (r.status() >= 400) assetFailures.push(`${r.status()} ${r.url()}`); });
  page.on("requestfailed", (r) => assetFailures.push(r.url()));
  await page.addInitScript(() => {
    (window as Window & { launchCls: number }).launchCls = 0;
    if (PerformanceObserver.supportedEntryTypes.includes("layout-shift")) new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!shift.hadRecentInput) (window as Window & { launchCls: number }).launchCls += shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  for (const route of ["/", "/cities", "/cities/london", "/methodology", "/sources", "/calculator", "/calculator/results"]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    const headers = response!.headers();
    expect(headers["x-powered-by"]).toBeUndefined();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("no-referrer");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    if (route === "/sources") await expect(page.locator("details")).toHaveCount(32);
    // 720 CSS px is the reflow equivalent of a 1440px desktop at 200% browser zoom.
    for (const width of [1440, 720, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath(route.replaceAll("/", "_") + "-320.png"), fullPage: true });
    await page.screenshot({ path: testInfo.outputPath(route.replaceAll("/", "_") + "-320-viewport.png") });
    await page.setViewportSize({ width: 1440, height: 1000 });
    observations.push({ route, ...(await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      return { cls: PerformanceObserver.supportedEntryTypes.includes("layout-shift") ? (window as Window & { launchCls: number }).launchCls : null, domContentLoadedMs: nav.domContentLoadedEventEnd, transferBytes: nav.transferSize, resources: performance.getEntriesByType("resource").length, fonts: performance.getEntriesByType("resource").filter((r) => /\.(woff|ttf|otf)/.test(r.name)).length };
    })) });
    const links = await page.locator('a[href^="http"]').evaluateAll((els) => els.map((a) => ({ url: (a as HTMLAnchorElement).href, target: (a as HTMLAnchorElement).target, rel: (a as HTMLAnchorElement).rel })));
    expect(links.every((a) => /^https?:\/\//.test(a.url) && (a.target !== "_blank" || /noopener/.test(a.rel) && /noreferrer/.test(a.rel)))).toBe(true);
  }
  expect(assetFailures).toEqual([]);
  await writeFile(testInfo.outputPath("local-performance.json"), JSON.stringify(observations, null, 2));
  await testInfo.attach("local-performance", { body: JSON.stringify(observations, null, 2), contentType: "application/json" });
});

for (const partial of [false, true]) test(`production ${partial ? "partial" : "complete"} calculation has no financial network or storage persistence`, async ({ page, context }, testInfo) => {
  const requests: { method: string; url: string; body: string | null }[] = [];
  const errors: string[] = [];
  page.on("request", (r) => requests.push({ method: r.method(), url: r.url(), body: r.postData() }));
  page.on("pageerror", (e) => errors.push(e.message));
  const started = Date.now();
  await throughReview(page, partial);
  const before = Date.now();
  await page.getByRole("button", { name: "See my move reality" }).click();
  await expect(page.locator("#result-title")).toBeVisible();
  const calculationAndRenderMs = Date.now() - before;
  const loadedJs = await page.evaluate(() => {
    const scripts = (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).filter((r) => /\.js(?:\?|$)/.test(r.name));
    return { resourceCount: scripts.length, decodedBytes: scripts.reduce((sum, r) => sum + r.decodedBodySize, 0), transferBytes: scripts.reduce((sum, r) => sum + r.transferSize, 0) };
  });
  await expect(page.locator("#coverage")).toContainText(partial ? "6 of 8 cost categories resolved" : "8 of 8 cost categories resolved");
  if (partial) {
    await expect(page.locator("#salary")).toContainText("Salary result unavailable");
    await expect(page.getByRole("main")).toContainText("After known costs");
    await expect(page.locator("#overview")).toContainText("Both sides need complete amounts");
  } else await expect(page.locator("#salary")).not.toContainText("Salary result unavailable");
  await page.getByRole("button", { name: "Basis & sources: Rent, current, Manchester", exact: true }).press("Enter");
  await expect(page.getByRole("button", { name: "Basis & sources: Rent, current, Manchester", exact: true })).toHaveAttribute("aria-expanded", "true");
  for (const width of [1440, 720, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath("result-320.png"), fullPage: true });
  await page.screenshot({ path: testInfo.outputPath("result-320-viewport.png") });
  expect(errors).toEqual([]);
  expect(requests.every((r) => ["GET", "HEAD"].includes(r.method) && r.body === null && new URL(r.url).origin === "http://127.0.0.1:3100")).toBe(true);
  expect(new URL(page.url()).search).toBe("");
  expect(requests.some((r) => /50000|60000|amountGbp|grossAnnual/.test(r.url))).toBe(false);
  expect(await page.evaluate(async () => ({ local: localStorage.length, session: sessionStorage.length, dbs: (await indexedDB.databases()).length, caches: (await caches.keys()).length }))).toEqual({ local: 0, session: 0, dbs: 0, caches: 0 });
  expect(await context.cookies()).toEqual([]);
  await writeFile(testInfo.outputPath("privacy-and-interaction.json"), JSON.stringify({ calculationAndRenderMs, loadedJs, journeyMs: Date.now() - started, requestCount: requests.length, methods: [...new Set(requests.map((r) => r.method))] }));
  await testInfo.attach("privacy-and-interaction", { body: JSON.stringify({ calculationAndRenderMs, loadedJs, journeyMs: Date.now() - started, requestCount: requests.length, methods: [...new Set(requests.map((r) => r.method))] }), contentType: "application/json" });
});

test("production 404 and dev/static-data isolation", async ({ page, request }) => {
  for (const path of ["/not-a-page", "/cities/york", "/dev/calculator-results", "/src/data/raw/ukmr_data_pack_and_source_register_v3_1.xlsx", "/src/data/generated/2026-07-v1/rent/release.json"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "We couldn’t find that page" })).toBeVisible();
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("main")).not.toContainText("/Users/");
    await page.getByRole("link", { name: "Back to home", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  }
  expect((await request.get("/calculator")).headers()["set-cookie"]).toBeUndefined();
});
