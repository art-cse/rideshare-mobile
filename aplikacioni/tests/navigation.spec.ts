import { test, expect } from "@playwright/test";

test("lista, detajet, simulimi dhe rastet kufitare në pamjen e telefonit", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".trip-card")).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const links = page.getByRole("link", { name: "Shiko detajet" });
  expect((await links.first().boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await links.nth(1).click();
  await expect(page).toHaveURL(/\/udhetimi\/2$/);
  await expect(page.getByText("Ora: 08:15")).toBeVisible();
  await expect(page.getByText("Vendtakimi: Te stacioni kryesor")).toBeVisible();
  await expect(page.getByText("Vende të lira: 1")).toBeVisible();
  await page.getByRole("link", { name: "Kërko vend" }).click();
  await expect(page.getByRole("heading", { name: "Simulim: Në pritje" })).toBeVisible();
  await expect(page.getByText(/Asnjë vend nuk është rezervuar/)).toBeVisible();
  await page.getByRole("link", { name: /Kthehu te detajet/ }).click();
  await expect(page).toHaveURL(/\/udhetimi\/2$/);
  await page.getByRole("link", { name: /Kthehu te lista/ }).click();
  await expect(page.locator(".trip-card")).toHaveCount(3);
  await page.goto("/udhetimi/3");
  await expect(page.getByRole("button", { name: "Nuk ka vende të lira" })).toBeDisabled();
  await page.goto("/udhetimi/3/kerkesa");
  await expect(page.getByRole("heading", { name: "Nuk ka vende të lira" })).toBeVisible();
  for (const path of ["/udhetimi/99", "/udhetimi/99/kerkesa"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Udhëtimi nuk u gjet" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Kthehu te lista" })).toBeVisible();
  }
});
