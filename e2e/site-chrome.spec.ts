import { expect, test } from "@playwright/test";
import { field, throughReview } from "./helpers/journey";

for (const width of [320, 390, 700, 701, 768, 1000, 1001, 1440]) {
  test(`shared header and footer at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/cities/london", "/calculator", "/calculator/results"]) {
      await page.goto(route);
      await expect(page.getByRole("banner")).toHaveCount(1);
      await expect(page.getByRole("contentinfo")).toHaveCount(1);
      const menu = page.getByRole("button", { name: /^(Menu|Close menu)$/ });
      const nav = page.getByRole("navigation", { name: "Main navigation", exact: true, includeHidden: true });
      if (width <= 700) {
        await expect(nav).toBeHidden();
        await menu.click();
        await expect(menu).toHaveAttribute("aria-expanded", "true");
      } else await expect(menu).toBeHidden();
      const selected = route.startsWith("/calculator") ? "Calculator" : route.startsWith("/cities") ? "Cities" : "Home";
      await expect(nav.getByRole("link", { name: selected, exact: true })).toHaveAttribute("aria-current", "page");
      for (const link of await nav.getByRole("link").all()) await expect(link).toBeVisible();
      if (width <= 700) await menu.click();

      const footer = page.getByRole("contentinfo");
      const explore = footer.getByRole("navigation", { name: "Explore", exact: true });
      const legal = footer.getByRole("navigation", { name: "Legal & support", exact: true });
      for (const [name, href] of [["Calculator", "/calculator"], ["Cities", "/cities"], ["Methodology", "/methodology"], ["Sources", "/sources"]]) {
        await expect(explore.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
      }
      for (const [name, href] of [["Privacy", "/privacy"], ["Accessibility", "/accessibility"]]) {
        await expect(legal.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
      }
      await expect(footer.getByRole("link", { name: /FAQ/i })).toHaveCount(0);
      const brandBox = (await footer.getByRole("link", { name: "UK Money Reality home" }).boundingBox())!;
      const exploreBox = (await explore.boundingBox())!;
      const legalBox = (await legal.boundingBox())!;
      if (width > 1000) {
        expect(Math.abs(brandBox.y - exploreBox.y)).toBeLessThan(2);
        expect(brandBox.x).toBeLessThan(exploreBox.x);
        expect(exploreBox.x).toBeLessThan(legalBox.x);
      } else if (width > 700) {
        expect(brandBox.y).toBeLessThan(exploreBox.y);
        expect(Math.abs(exploreBox.y - legalBox.y)).toBeLessThan(2);
        expect(exploreBox.x).toBeLessThan(legalBox.x);
      } else {
        expect(brandBox.y).toBeLessThan(exploreBox.y);
        expect(exploreBox.y).toBeLessThan(legalBox.y);
        expect(exploreBox.x).toBe(legalBox.x);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}

test("mobile menu keyboard, close, route change and resize behaviour", async ({ page, browserName }) => {
  const tabKey = browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab";
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /^(Menu|Close menu)$/ });
  const nav = page.getByRole("navigation", { name: "Main navigation", exact: true, includeHidden: true });
  await toggle.focus();
  await page.keyboard.press(tabKey);
  expect(await nav.evaluate((el) => el.contains(document.activeElement))).toBe(false);
  await toggle.focus(); await page.keyboard.press("Enter");
  await expect(nav).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-controls", (await nav.getAttribute("id"))!);
  await page.keyboard.press(tabKey);
  await expect(nav.getByRole("link", { name: "Home", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(nav).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.press("Space");
  await nav.getByRole("link", { name: "Cities", exact: true }).click();
  await expect(page).toHaveURL(/\/cities$/);
  await expect(nav).toBeHidden();
  await toggle.click();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(nav).toBeHidden();
  await toggle.click();
  await nav.getByRole("link", { name: "Calculator", exact: true }).focus();
  await page.keyboard.press(tabKey);
  await expect(nav).toBeHidden(); // Tab leaves the navigation; no focus trap.
  await toggle.focus(); await toggle.press("Enter");
  await page.setViewportSize({ width: 1024, height: 844 });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "Home", exact: true })).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toggle).toBeFocused();
  await expect(nav).toBeHidden();
});

test("shared chrome preserves calculator and Results actions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await throughReview(page);
  await page.getByRole("button", { name: "See my move reality" }).click();
  await expect(page).toHaveURL(/\/calculator\/results$/);
  const sections = page.getByRole("navigation", { name: "Result sections" });
  for (const [label, hash] of [["Overview", "overview"], ["Cost breakdown", "breakdown"], ["Biggest changes", "changes"], ["Salary reality", "salary"], ["How we calculated this", "methodology"]]) {
    await sections.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${hash}$`));
  }
  await page.getByRole("banner").getByRole("link", { name: "Compare", exact: true }).click();
  await expect(page).toHaveURL(/#breakdown$/);
  await page.getByRole("banner").getByRole("link", { name: "How it works", exact: true }).click();
  await expect(page).toHaveURL(/#methodology$/);
  await page.getByRole("button", { name: /Adjust your inputs/ }).click();
  await expect(page).toHaveURL(/\/calculator\/review$/);
  await page.getByRole("button", { name: "Edit move", exact: true }).click();
  await expect(field(page, "current.cityId")).toHaveValue("LOC-MAN");
  await expect(field(page, "destination.cityId")).toHaveValue("LOC-LON");
  await page.getByRole("button", { name: "New comparison", exact: true }).click();
  await expect(page).toHaveURL(/\/calculator$/);
  await expect(field(page, "current.cityId")).toHaveValue("");
});

test("Results start a new comparison clears the journey", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await throughReview(page);
  await page.getByRole("button", { name: "See my move reality" }).click();
  await page.getByRole("button", { name: /Start a new comparison/ }).click();
  await expect(page).toHaveURL(/\/calculator$/);
  await expect(field(page, "destination.cityId")).toHaveValue("");
});
