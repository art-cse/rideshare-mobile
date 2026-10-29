import { test, expect } from "@playwright/test";

// Java 6: këtë skenar e ekzekutojmë vetëm me Neon dhe tri udhëtimet
// fillestare (1=08:00, 2=08:15, 3=07:45) të disponueshme.
// Nuk ndryshojmë të dhënat e databazës dhe nuk provojmë rezervime.
test("Java 6: manifesti, kopja publike dhe rifreskimi offline", async ({ page, request, context }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe("RideShare AAB");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(["192x192", "512x512"]);

  for (const icon of ["/icons/icon-192.png", "/icons/icon-512.png"]) {
    const response = await request.get(icon);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  }

  // Server rendering nuk mjafton: prisni që service worker të marrë API-në
  // dhe ta shkruajë në cache, jo vetëm që të shfaqen kartat në HTML.
  await page.goto("/");
  await expect(page.locator(".trip-card")).toHaveCount(3);
  await page.waitForFunction(async () => {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return false;
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) return false;
    const cache = await caches.open("rideshare-public-v1");
    return Boolean(await cache.match("/api/udhetimet"));
  }, null, { timeout: 30_000 });

  // Kontrolloni se shfletuesi vërtet e lexon kopjen e ruajtur.
  await page.goto("/offline.html");
  await expect(page.locator(".trip-card")).toHaveCount(3);
  await expect(page.locator("#source")).toContainText("Lista erdhi nga serveri");
  await expect(page.locator("#saved")).not.toHaveText("—");
  await expect(page.getByRole("button", { name: /Kërko vend/ })).toBeDisabled();

  await context.setOffline(true);
  try {
    // Rifreskimi kërkon një navigim të ri: një tab i hapur nuk mjafton.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".trip-card")).toHaveCount(3);
    await expect(page.locator("#source")).toContainText("Lista e fundit e ruajtur");
    await expect(page.getByRole("button", { name: /Kërko vend/ })).toBeDisabled();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".trip-card")).toHaveCount(3);
  } finally {
    await context.setOffline(false);
  }

  // Kjo kontrollon rikthimin online, POR jo ndryshimin 08:15 → 08:25
  // të Neon; atë provë e kryejmë veçmas dhe rikthejmë vlerën origjinale.
  await page.getByRole("button", { name: "Rifresko listën" }).click();
  await expect(page.locator("#source")).toContainText("Lista erdhi nga serveri");
  await expect(page.locator(".trip-card")).toHaveCount(3);

  // Kjo cache nuk duhet të përfshijë panelin ose rrugët e hyrjes.
  const keys = await page.evaluate(async () => {
    const cache = await caches.open("rideshare-public-v1");
    return (await cache.keys()).map(request => new URL(request.url).pathname);
  });
  expect(keys).toContain("/api/udhetimet");
  expect(keys).not.toContain("/panel");
  expect(keys.some(path => path.startsWith("/api/auth"))).toBe(false);
});
