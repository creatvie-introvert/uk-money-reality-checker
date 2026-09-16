import { expect, test } from "@playwright/test";

test("public homepage opens the existing calculator", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("See what a move could really mean for your monthly money");
  await page.getByRole("link", { name: "Compare your move", exact: true }).click();
  await expect(page).toHaveURL(/\/calculator$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Where are you moving?");
  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Calculator progress" })).toBeVisible();
  await expect(page.locator('[name="current.cityId"]')).toHaveValue("");
});
