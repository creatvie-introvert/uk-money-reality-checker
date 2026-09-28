import { expect, test } from "@playwright/test";
import { field, throughReview } from "./helpers/journey";

for (const modes of [["calculated", "calculated"], ["calculated", "override"], ["override", "calculated"], ["override", "override"], ["unknown", "unknown"]]) {
  test(`shared tax year for ${modes.join("/")}`, async ({ page }) => {
    await page.goto("/calculator/income");
    const year = page.getByRole("combobox", { name: "Tax year for this comparison" });
    await expect(year).toHaveValue("");
    await expect(page.locator('[name$="income.taxYear"]')).toHaveCount(0);
    for (const [i, role] of ["current", "destination"].entries()) {
      await expect(field(page, `${role}.income.taxJurisdiction`)).toHaveValue("");
      await field(page, `${role}.income.taxJurisdiction`).selectOption(i === 0 ? "rUK" : "Scotland");
      await field(page, `${role}.income.scope`).check();
      if (modes[i] !== "unknown") await field(page, `${role}.income.grossAnnualSalaryGbp`).fill("50000");
      if (modes[i] === "override") await field(page, `${role}.income.netOverride.amountGbp`).fill("0");
    }
    await page.getByRole("button", { name: /^Continue/ }).click();
    if (modes.includes("calculated")) {
      await expect(year).toBeFocused();
      await expect(year).toHaveAttribute("aria-invalid", "true");
      await expect(year).toHaveAccessibleDescription(/Choose the tax year for this comparison/);
      const link = page.getByRole("alert").getByRole("link", { name: "Choose the tax year for this comparison." });
      await expect(link).toHaveCount(1); await link.click(); await expect(year).toBeFocused();
      await year.selectOption("2026/27");
      await page.getByRole("button", { name: /^Continue/ }).click();
    }
    await expect(page).toHaveURL(/\/spending$/);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(field(page, "current.income.taxJurisdiction")).toHaveValue("rUK");
    await expect(field(page, "destination.income.taxJurisdiction")).toHaveValue("Scotland");
    await expect(year).toHaveValue(modes.includes("calculated") ? "2026/27" : "");
  });
}

test("shared year is shown once on Review, survives editing and resets", async ({ page }) => {
  await throughReview(page);
  await expect(page.getByText("Tax year for this comparison", { exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Edit income", exact: true }).click();
  const year = page.getByRole("combobox", { name: "Tax year for this comparison" });
  await expect(year).toHaveValue("2026/27");
  await year.selectOption("");
  await page.getByRole("button", { name: "Save and return to review" }).click();
  await expect(year).toBeFocused();
  await expect(page.getByRole("alert").getByRole("link", { name: "Choose the tax year for this comparison." })).toHaveCount(1);
  await year.selectOption("2026/27");
  await field(page, "destination.income.taxJurisdiction").selectOption("Scotland");
  await field(page, "destination.income.netOverride.amountGbp").fill("3500");
  await page.getByRole("button", { name: "Save and return to review" }).click();
  await page.getByRole("button", { name: "Edit income", exact: true }).click();
  await expect(year).toHaveValue("2026/27");
  await expect(field(page, "destination.income.netOverride.amountGbp")).toHaveValue("3500");
  await expect(field(page, "current.income.taxJurisdiction")).toHaveValue("rUK");
  await expect(field(page, "destination.income.taxJurisdiction")).toHaveValue("Scotland");
  await page.getByRole("button", { name: "New comparison", exact: true }).click();
  await page.goto("/calculator/income");
  await expect(year).toHaveValue("");
});
