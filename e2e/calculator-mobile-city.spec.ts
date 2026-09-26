import { expect, test } from "@playwright/test";

test.use({ isMobile: true, hasTouch: true });

for (const width of [320, 390]) {
  test(`native City controls accept touch and retain independent selections at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/calculator");
    const current = page.getByRole("group", { name: "Where you live now", exact: true }).getByRole("combobox", { name: "City" });
    const destination = page.getByRole("group", { name: "Where you’re moving", exact: true }).getByRole("combobox", { name: "City" });
    const next = page.getByRole("button", { name: /^Continue/ });

    for (const city of [current, destination]) {
      await expect(city).toBeEnabled(); // Checks inherited fieldset disability too.
      await expect(city).toHaveAttribute("aria-required", "true");
      await expect(city.locator("option")).toHaveText([
        "Choose an option", "London", "Manchester", "Birmingham", "Leeds",
        "Liverpool", "Bristol", "Edinburgh", "Glasgow",
      ]);
      await city.scrollIntoViewIfNeeded();
      expect(await city.evaluate((el) => {
        const box = el.getBoundingClientRect();
        return el.tagName === "SELECT" && box.height >= 44 &&
          document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === el;
      })).toBe(true);
      await city.tap();
      await expect(city).toBeFocused();
      // Playwright cannot operate the physical iOS picker. Close any desktop popup;
      // selectOption below verifies the native change event and controlled state.
      await city.press("Escape");
    }
    await next.tap();
    await expect(current).toBeFocused();
    await expect(current).toHaveAttribute("aria-invalid", "true");
    await current.selectOption("LOC-MAN");
    await expect(destination).toHaveValue("");
    await next.tap();
    await expect(page).toHaveURL(/\/calculator$/);
    await expect(destination).toBeFocused();
    await expect(destination).toHaveAccessibleDescription(/choose a city/i);
    await destination.selectOption("LOC-LEE");
    await current.selectOption("LOC-BRS");
    await expect(destination).toHaveValue("LOC-LEE");
    await next.tap();
    await expect(page).toHaveURL(/\/calculator\/household$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    for (const name of ["adults", "children"]) {
      const input = page.locator(`[name="household.${name}"]`);
      const increase = page.getByRole("button", { name: `Increase ${name}`, exact: true });
      const decrease = page.getByRole("button", { name: `Decrease ${name}`, exact: true });
      await expect(input).toHaveValue("");
      await increase.tap(); await expect(input).toHaveValue("1");
      await increase.tap(); await expect(input).toHaveValue("2");
      await decrease.tap(); await expect(input).toHaveValue("1");
      if (name === "children") { await decrease.tap(); await expect(input).toHaveValue("0"); }
      await expect(decrease).toBeDisabled();
    }
    await expect(page.getByRole("alert", { name: "Input errors" })).toHaveCount(0);
    await page.getByRole("button", { name: "Back to move setup", exact: true }).tap();
    await expect(current).toHaveValue("LOC-BRS");
    await expect(destination).toHaveValue("LOC-LEE");
    await next.tap();
    await expect(page).toHaveURL(/\/calculator\/household$/);
    expect(errors).toEqual([]);
  });
}
