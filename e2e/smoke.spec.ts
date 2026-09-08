import { expect, test } from "@playwright/test";

test("development shell loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The rebuild foundation is active." })).toBeVisible();
  await expect(page.getByText("Milestone 0 · Engineering foundation")).toBeVisible();
});