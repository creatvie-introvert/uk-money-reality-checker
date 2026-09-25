import { expect, test } from "@playwright/test";
import { cityPhotography } from "../src/product/homepage/city-photography";

for (const width of [1440, 1280, 1024, 1001, 1000, 921, 920, 901, 900, 768, 701, 700, 390, 360, 320]) {
  test(`V4 sections, disclosures and reflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator("main section")).toHaveCount(7);
    expect(await page.locator("main section").evaluateAll((nodes) => nodes.map((node) => node.id))).toEqual(["hero", "example", "how", "cities", "evidence-context", "faq", "start"]);
    await expect(page.locator("#how ol > li")).toHaveCount(3);
    const cityImages = page.locator("#cities img");
    await expect(cityImages).toHaveCount(8);
    await page.locator("#cities").scrollIntoViewIfNeeded();
    for (const photo of Object.values(cityPhotography)) {
      const image = page.locator(`#cities a[href="/cities/${photo.citySlug}"] img`);
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveAttribute("alt", "");
      await expect(image).toHaveAttribute("loading", "lazy");
      await expect(image).toHaveCSS("object-position", photo.objectPosition);
      await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
      const url = new URL(await image.evaluate((el: HTMLImageElement) => el.currentSrc));
      expect(url.origin).toBe(new URL(page.url()).origin);
      expect(url.pathname).toBe("/_next/image");
      expect(url.searchParams.get("url")).toBe(photo.localFilename);
    }
    const grid = page.locator('#cities ul').first();
    expect(await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(width <= 360 ? 1 : width <= 1000 ? 2 : 4);
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

test("FAQ keyboard, reduced motion and working city destinations", async ({ page }) => {
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
  const cityCard = page.locator('#cities a[href="/cities/london"]');
  await cityCard.hover();
  await page.keyboard.press("Tab");
  await cityCard.focus();
  await expect(cityCard).toHaveCSS("outline-style", "solid");
  await expect(cityCard).toHaveCSS("outline-width", "3px");
  await expect(cityCard).toHaveCSS("outline-offset", "4px");
  await expect(cityCard.locator("img")).toHaveCSS("transition-duration", "0s");
  await expect(cityCard.locator("img")).toHaveCSS("transform", "none");
  for (const slug of ["london", "birmingham", "manchester", "leeds", "liverpool", "bristol", "edinburgh", "glasgow"]) {
    await page.goto("/");
    await page.locator(`#cities a[href="/cities/${slug}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/cities/${slug}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("photo credits open by keyboard and retain source, licence and edit notices", async ({ page }) => {
  await page.goto("/");
  const credits = page.locator("#city-photo-credits");
  const summary = credits.locator("summary");
  await expect(summary).toHaveText("City photo credits and licences");
  await summary.focus();
  await summary.press("Enter");
  await expect(credits).toHaveAttribute("open", "");
  await expect(summary).toHaveCSS("outline-style", "solid");
  await expect(credits.locator("li")).toHaveCount(8);
  for (const photo of Object.values(cityPhotography)) {
    const item = credits.locator("li").filter({ hasText: photo.imageTitle });
    await expect(item).toContainText(photo.creator);
    for (const url of [photo.sourcePageUrl, photo.licenceUrl]) {
      const link = item.locator(`a[href="${url}"]`);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      await expect(link).toContainText("opens in new tab");
    }
  }
  await expect(credits).toContainText("Chocolateediter");
  await expect(credits).toContainText("Public-domain dedication; credit retained for provenance");
  await expect(credits).toContainText("is not financial evidence");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await summary.press("Space");
  await expect(credits).not.toHaveAttribute("open");
});

test("fine-pointer image zoom is disabled when reduced motion is enabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const card = page.locator('#cities a[href="/cities/london"]');
  const image = card.locator("img");
  await card.hover();
  await expect(image).toHaveCSS("transition-duration", "0.45s");
  await expect(image).toHaveCSS("transform", "matrix(1.06, 0, 0, 1.06, 0, 0)");
  await page.mouse.move(0, 0);
  await page.keyboard.press("Tab");
  await card.focus();
  await expect(card).toHaveCSS("outline-style", "solid");
  await expect(image).toHaveCSS("transform", "matrix(1.06, 0, 0, 1.06, 0, 0)");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(image).toHaveCSS("transition-duration", "0s");
  await expect(image).toHaveCSS("transform", "none");
});

test.describe("touch city photography", () => {
  test.use({ isMobile: true, hasTouch: true });
  test("does not zoom for touch or focus", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const card = page.locator('#cities a[href="/cities/london"]');
    await card.scrollIntoViewIfNeeded();
    await card.focus();
    await expect(card.locator("img")).toHaveCSS("transition-duration", "0s");
    await expect(card.locator("img")).toHaveCSS("transform", "none");
    await card.tap();
    await expect(page).toHaveURL(/\/cities\/london$/);
  });
});
