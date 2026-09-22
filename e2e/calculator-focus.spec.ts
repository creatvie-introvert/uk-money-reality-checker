import { expect, test, type Page } from "@playwright/test";
import { field, throughReview } from "./helpers/journey";

async function expectStepFocus(page: Page) {
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeFocused();
  await expect(heading).toHaveAttribute("tabindex", "-1");
  await expect(heading).toHaveCSS("outline-style", "none");
  await expect(heading).toHaveCSS("outline-width", "0px");
  await expect(heading).toHaveCSS("box-shadow", "none");
}

test("mouse navigation keeps step heading focus without a control-like outline", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("link", { name: "Calculator", exact: true }).click();
  await expect(page).toHaveURL(/\/calculator$/);
  await expectStepFocus(page);
  await field(page, "current.cityId").selectOption("LOC-MAN");
  await field(page, "destination.cityId").selectOption("LOC-LEE");
  await page.getByRole("button", { name: /^Continue/ }).click();
  await expect(page).toHaveURL(/\/calculator\/household$/);
  await expectStepFocus(page);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/calculator$/);
  await expectStepFocus(page);
  await expect(field(page, "current.cityId")).toHaveValue("LOC-MAN");
  await page.getByRole("button", { name: "New comparison", exact: true }).click();
  // Restart on the same step does not rerun the heading-focus effect.
  await expect(page.getByRole("button", { name: "New comparison", exact: true })).toBeVisible();
  await expect(field(page, "current.cityId")).toHaveValue("");
});

test("keyboard navigation and validation retain meaningful focus and control outlines", async ({ page, browserName }) => {
  const tabKey = browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab";
  await page.goto("/");
  const calculator = page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("link", { name: "Calculator", exact: true });
  await calculator.focus(); await calculator.press("Enter");
  await expect(page).toHaveURL(/\/calculator$/);
  await expectStepFocus(page);
  await page.keyboard.press(tabKey);
  await expect(field(page, "current.cityId")).toBeFocused();
  await expect(field(page, "current.cityId")).toHaveCSS("outline-style", "solid");
  await field(page, "current.cityId").selectOption("LOC-MAN");
  await field(page, "destination.cityId").selectOption("LOC-LEE");
  const next = page.getByRole("button", { name: /^Continue/ });
  await next.focus(); await next.press("Enter");
  await expect(page).toHaveURL(/\/calculator\/household$/);
  await expectStepFocus(page);
  await next.focus(); await next.press("Enter");
  await expect(field(page, "household.adults")).toBeFocused();
  await expect(field(page, "household.adults")).toHaveAttribute("aria-invalid", "true");
  await expect(field(page, "household.adults")).toHaveCSS("outline-style", "solid");
  await expect(page.getByRole("alert", { name: "Input errors" })).toBeVisible();
});

test("returning from Results and restarting on another step retain heading focus", async ({ page }) => {
  await throughReview(page);
  await page.getByRole("button", { name: "See my move reality" }).click();
  await expect(page).toHaveURL(/\/calculator\/results$/);
  await expect(page.locator("#result-title")).toBeFocused();
  await page.getByRole("button", { name: /Adjust your inputs/ }).click();
  await expect(page).toHaveURL(/\/calculator\/review$/);
  await expectStepFocus(page);
  await page.getByRole("button", { name: "New comparison", exact: true }).click();
  await expect(page).toHaveURL(/\/calculator$/);
  await expectStepFocus(page);
  await expect(field(page, "current.cityId")).toHaveValue("");
});

test("programmatically refocused step title has no outline or shadow", async ({ page }) => {
  await page.goto("/calculator");
  await expectStepFocus(page);
  // Establish keyboard modality, then exercise the same DOM focus API as the journey.
  await page.keyboard.press("Tab");
  await page.getByRole("heading", { level: 1 }).evaluate((heading) => heading.focus());
  await expectStepFocus(page);
});
