import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("login screen is accessible and responsive", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "HT Management" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Đăng nhập" })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
