import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 375, height: 812 } });
test("pa Neon: gabimi është i qartë; paneli publik kërkon hyrje", async ({ page }) => {
  for (const path of ["/", "/udhetimi/2", "/udhetimi/3/kerkesa"]) {
    await page.goto(`http://localhost:3000${path}`);
    await expect(page.locator('main [role="alert"]')).toHaveText("Nuk u lidhëm me databazën. Provo përsëri.");
    await expect(page.locator(".trip-card")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto("http://localhost:3000/panel");
  await expect(page.getByRole("button", { name: "Hyr me GitHub" })).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
  await page.goto("http://localhost:3000/panel?m=ndaluar");
  await expect(page.getByRole("status")).toContainText("Nuk ke leje");
  await page.goto("http://localhost:3000/panel?m=toString");
  await expect(page.getByRole("button", { name: "Hyr me GitHub" })).toBeVisible();
});
