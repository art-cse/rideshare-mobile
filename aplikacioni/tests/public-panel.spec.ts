import { test, expect } from "@playwright/test";

test("lista dhe paneli hapen publikisht në telefon", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const path of ["/", "/udhetimi/2", "/udhetimi/2/kerkesa", "/panel"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const action of await page.locator("main a, main button").all()) {
      expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.locator("main").evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    for (const href of await page.locator("main a").evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href))) {
      expect(new URL(href).origin).toBe(new URL(page.url()).origin);
    }
    await page.screenshot({ path: testInfo.outputPath(`${path.replaceAll("/", "-") || "home"}.png`), fullPage: true });
  }
  await expect(page.getByRole("button", { name: "Hyr me GitHub" })).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
  await page.getByRole("link", { name: /Kthehu te lista/ }).click();
  await expect(page.locator(".trip-card")).toHaveCount(3);
  expect(errors).toEqual([]);
});
