import { test, expect, type Page } from "@playwright/test";

declare global {
  interface Window {
    week08Geo: {
      calls: number;
      timeout?: number;
      succeed: (accuracy: number) => void;
      fail: (code: number) => void;
    };
  }
}

async function mockLocation(page: Page) {
  await page.addInitScript(() => {
    window.week08Geo = { calls: 0, succeed: () => {}, fail: () => {} };
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
      getCurrentPosition(success: PositionCallback, error: PositionErrorCallback, options?: PositionOptions) {
        window.week08Geo.calls++;
        window.week08Geo.timeout = options?.timeout;
        // Entirely fictional point for display tests; never use personal GPS data.
        window.week08Geo.succeed = accuracy => success({ coords: { accuracy, latitude: 0.125, longitude: 0.25 } } as GeolocationPosition);
        window.week08Geo.fail = code => error({ code } as GeolocationPositionError);
      },
    } });
  });
}

async function confirm(page: Page, text = "Biblioteka") {
  await page.getByTestId("meeting-input").fill(text);
  await page.getByTestId("confirm-meeting").click();
  await expect(page.getByTestId("confirmed-meeting")).toHaveText(text.trim());
}

test.beforeEach(async ({ page }) => {
  await mockLocation(page);
  await page.goto("/java-08-test");
});

test("1: faqja nuk kërkon leje ose API në hapje", async ({ page }) => {
  const apiCalls: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) apiCalls.push(request.url()); });
  await page.reload();
  await expect(page.getByTestId("location-status")).toHaveAttribute("data-state", "idle");
  for (const id of ["meeting-input", "confirm-meeting", "confirmed-meeting", "meeting-error", "locate-me", "location-status", "location-accuracy"]) {
    await expect(page.getByTestId(id)).toHaveCount(1);
  }
  await confirm(page); // Hydration and handlers have completed; still no location request.
  expect(await page.evaluate(() => window.week08Geo.calls)).toBe(0);
  expect(apiCalls).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("2: konfirmimi pastron hapësirat dhe ruan Biblioteka", async ({ page }) => {
  await confirm(page, "  Biblioteka  ");
  await expect(page.getByTestId("meeting-error")).toBeEmpty();
});

test("3: ndryshimi i draftit nuk ndryshon konfirmimin", async ({ page }) => {
  await confirm(page);
  await page.getByTestId("meeting-input").fill("Parkingu");
  await expect(page.getByTestId("confirmed-meeting")).toHaveText("Biblioteka");
});

test("4: teksti bosh nuk zëvendëson zgjedhjen e vlefshme", async ({ page }) => {
  await confirm(page);
  await page.getByTestId("meeting-input").fill("   ");
  await page.getByTestId("confirm-meeting").click();
  await expect(page.getByTestId("meeting-error")).toContainText("Shkruaj një vendtakim");
  await expect(page.getByTestId("confirmed-meeting")).toHaveText("Biblioteka");
  await confirm(page, "Parkingu");
  await expect(page.getByTestId("meeting-error")).toBeEmpty();
});

test("5: suksesi shfaq 37 m pa konfirmuar vendtakim", async ({ page }) => {
  await page.getByTestId("locate-me").click();
  await expect(page.getByTestId("location-status")).toHaveAttribute("data-state", "loading");
  await expect(page.getByTestId("locate-me")).toBeDisabled();
  expect(await page.evaluate(() => window.week08Geo.timeout)).toBe(10000);
  await page.evaluate(() => window.week08Geo.succeed(37));
  await expect(page.getByTestId("location-status")).toHaveAttribute("data-state", "success");
  await expect(page.getByTestId("location-status")).toContainText("Pozicioni u mor");
  await expect(page.getByTestId("location-accuracy")).toHaveText("Saktësia: 37 m");
  const map = page.getByRole("link", { name: "Hap vendndodhjen në Google Maps" });
  await expect(map).toHaveAttribute("href", "https://www.google.com/maps/search/?api=1&query=0.125%2C0.25");
  await expect(map).toHaveAttribute("target", "_blank");
  await expect(page.getByTestId("location-coordinates")).not.toContainText("0.125");
  await expect(page.getByTestId("confirmed-meeting")).toBeEmpty();
  await expect(page.getByTestId("locate-me")).toBeEnabled();
  await confirm(page);
  await page.getByTestId("locate-me").click();
  await expect(page.getByTestId("location-accuracy")).toBeEmpty();
  await expect(page.getByTestId("location-coordinates")).toBeEmpty();
  await page.evaluate(() => window.week08Geo.fail(1));
  await expect(page.getByTestId("confirmed-meeting")).toHaveText("Biblioteka");
});

test("6: refuzimi lejon konfirmimin manual", async ({ page }) => {
  await page.getByTestId("locate-me").click();
  await page.evaluate(() => window.week08Geo.fail(1));
  await expect(page.getByTestId("location-status")).toHaveAttribute("data-state", "denied");
  await expect(page.getByTestId("location-status")).toHaveText("Leja u refuzua. Shkruaj vendtakimin vetë.");
  await expect(page.getByTestId("locate-me")).toBeEnabled();
  await confirm(page, "Parkingu");
});

test("7: timeout përfundon pritjen dhe lejon riprovim", async ({ page }) => {
  await page.getByTestId("locate-me").click();
  await page.evaluate(() => window.week08Geo.fail(3));
  await expect(page.getByTestId("location-status")).toHaveAttribute("data-state", "timeout");
  await expect(page.getByTestId("location-status")).toContainText("Koha mbaroi");
  await expect(page.getByTestId("locate-me")).toBeEnabled();
  await confirm(page);
  await page.getByTestId("locate-me").click();
  await expect(page.getByTestId("location-status")).toHaveAttribute("data-state", "loading");
  await page.evaluate(() => window.week08Geo.succeed(37));
  await expect(page.getByTestId("location-status")).toHaveAttribute("data-state", "success");
  expect(await page.evaluate(() => window.week08Geo.calls)).toBe(2);
});

test("8: pa geolocation funksionon zgjedhja manuale", async ({ page }) => {
  await page.evaluate(() => Object.defineProperty(navigator, "geolocation", { value: undefined }));
  await page.getByTestId("locate-me").click();
  await expect(page.getByTestId("location-status")).toHaveAttribute("data-state", "unavailable");
  await expect(page.getByTestId("location-status")).toContainText("nuk e mbështet");
  await expect(page.getByTestId("locate-me")).toBeEnabled();
  await confirm(page);
});

test("kodi 2 dhe rifreskimi: manualja punon, gjendja nuk ruhet", async ({ page }) => {
  await page.getByTestId("locate-me").click();
  await page.evaluate(() => window.week08Geo.fail(2));
  await expect(page.getByTestId("location-status")).toHaveAttribute("data-state", "unavailable");
  await expect(page.getByTestId("location-status")).toContainText("Pozicioni nuk është i disponueshëm");
  await expect(page.getByTestId("locate-me")).toBeEnabled();
  await confirm(page);
  await page.reload();
  await expect(page.getByTestId("confirmed-meeting")).toBeEmpty();
  await expect(page.getByTestId("meeting-input")).toHaveValue("");
  await expect(page.getByTestId("location-coordinates")).toBeEmpty();
});
