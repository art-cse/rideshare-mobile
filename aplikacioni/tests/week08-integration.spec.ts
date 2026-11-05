import { test, expect } from "@playwright/test";

test("vendtakimi në detajet reale mbetet lokal dhe nuk ndryshon udhëtimet", async ({ page, request }) => {
  const before = await request.get("/api/udhetimet");
  expect(before.ok()).toBe(true);
  const trips = await before.json();
  const writes: string[] = [];
  page.on("request", request => {
    if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url());
  });
  await page.goto("/udhetimi/2");
  await expect(page.getByTestId("location-status")).toHaveAttribute("data-state", "idle");
  await page.getByLabel("Shkruaj vendtakimin").fill("Biblioteka");
  await page.getByRole("button", { name: "Konfirmo në telefon" }).click();
  await expect(page.getByTestId("confirmed-meeting")).toHaveText("Biblioteka");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Kërko vend" }).click();
  await expect(page.getByRole("heading", { name: "Simulim: Në pritje" })).toBeVisible();
  await expect(page.getByText(/Asnjë vend nuk është rezervuar/)).toBeVisible();
  await page.goto("/udhetimi/1");
  await expect(page.getByTestId("confirmed-meeting")).toBeEmpty();
  expect(writes).toEqual([]);
  const after = await request.get("/api/udhetimet");
  expect(await after.json()).toEqual(trips);
});
