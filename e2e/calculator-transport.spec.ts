import { expect, test } from "@playwright/test";
import { field } from "./helpers/journey";

for (const width of [1440, 390, 320]) {
  test(`Transport native selects match approved controls at ${width}px`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/calculator");
    await expect(field(page, "current.cityId")).toBeEnabled();
    const measure = (el: Element) => {
      const s = getComputedStyle(el), frame = getComputedStyle(el.parentElement!);
      return { padding: s.padding, height: s.height, fontSize: s.fontSize, radius: s.borderRadius, border: s.borderWidth, inset: frame.paddingRight, frameRadius: frame.borderRadius, frameBorder: frame.borderWidth };
    };
    const approved = await field(page, "current.cityId").evaluate(measure);
    await page.goto("/calculator/transport");
    await expect(field(page, "current.transport.mode")).toBeEnabled();
    for (const role of ["current", "destination"]) {
      const select = field(page, `${role}.transport.mode`), frame = select.locator("..");
      expect(await select.evaluate(measure)).toEqual(approved);
      await expect(select).toHaveCSS("appearance", "auto");
      await expect(select).toHaveCSS("font-size", "16px");
      expect((await select.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await expect(select.locator("option")).toHaveText(["Choose an option", "I don’t know yet", "Enter my monthly household transport cost", "I have no transport cost"]);
      await select.selectOption("AMOUNT");
      await expect(field(page, `${role}.transport.amountGbp`)).toBeVisible();
      await field(page, `${role}.transport.amountGbp`).fill("0");
      await select.selectOption("NONE");
      await expect(field(page, `${role}.transport.amountGbp`)).toHaveCount(0);
      await select.selectOption("UNKNOWN");
    }
    await page.getByRole("heading", { level: 1 }).focus();
    const tabKey = browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab";
    for (const role of ["current", "destination"]) {
      await page.keyboard.press(tabKey);
      const select = field(page, `${role}.transport.mode`), frame = select.locator("..");
      await expect(select).toBeFocused();
      await expect(select).toHaveCSS("outline-style", "none");
      await expect(select).toHaveCSS("box-shadow", "none");
      await expect(frame).toHaveCSS("outline-width", "2px");
      await expect(frame).toHaveCSS("outline-style", "solid");
      await expect(frame).toHaveCSS("outline-offset", "-1px");
      await expect(frame).toHaveCSS("border-color", "rgba(0, 0, 0, 0)");
    }
    await page.getByRole("heading", { level: 1 }).focus();
    await page.screenshot({ path: `/tmp/ukmr-transport-${browserName}-${width}.png`, fullPage: true });
    for (const role of ["current", "destination"]) {
      const select = field(page, `${role}.transport.mode`), frame = select.locator("..");
      // Optional transport modes do not produce a mode error; exercise presentation only.
      await select.evaluate((el) => el.setAttribute("aria-invalid", "true"));
      await expect(frame).toHaveCSS("border-color", "rgb(164, 37, 32)");
      await expect(frame).toHaveCSS("background-color", "rgb(255, 245, 242)");
      await select.focus();
      await expect(frame).toHaveCSS("outline-width", "2px");
      await expect(select).toHaveCSS("outline-style", "none");
      await page.locator(`[data-scenario="${role}"]`).screenshot({ path: `/tmp/ukmr-transport-error-${browserName}-${width}-${role}.png` });
      await select.evaluate((el) => el.setAttribute("aria-invalid", "false"));
      await page.getByRole("heading", { level: 1 }).focus();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
