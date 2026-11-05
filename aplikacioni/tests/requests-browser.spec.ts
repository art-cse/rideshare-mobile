import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { Pool } from "pg";
import { readFileSync } from "node:fs";

test.describe("kërkesat reale — vetëm PostgreSQL lokal", () => {
  test.skip(process.env.RIDESHARE_LOCAL_POSTGRES !== "1", "Requires isolated localhost database and test server");
  test.describe.configure({ mode: "serial" });
  let pool: Pool;
  test.beforeAll(async ({ baseURL }) => {
    if (baseURL !== "http://localhost:3002") throw new Error("Refusing non-local test target");
    pool = new Pool({ connectionString: "postgresql://rideshare_test:local-test-only@127.0.0.1:55432/rideshare_test" });
    for (const file of ["schema.sql", "schema-java05.sql", "migrations/001-seat-requests.sql", "migrations/002-request-location.sql"]) await pool.query(readFileSync(file, "utf8"));
  });
  test.beforeEach(async () => {
    await pool.query(`TRUNCATE kerkesat RESTART IDENTITY;
      INSERT INTO profilet(github_id,emri,roli) VALUES ('100','Driver One','shofer'),('200','Driver Two','shofer'),
      ('300','Passenger One','udhetar'),('400','Passenger Two','udhetar') ON CONFLICT(github_id) DO UPDATE SET roli=EXCLUDED.roli;
      UPDATE udhetimet SET shofer_id='100',vende=1 WHERE id='1';
      UPDATE udhetimet SET shofer_id='200',vende=2 WHERE id='2';
      UPDATE udhetimet SET shofer_id='100',vende=0 WHERE id='3';`);
  });
  test.afterAll(async () => { await pool?.end(); });

  async function login(context: BrowserContext, id: string) {
    await context.clearCookies();
    const token = await encode({ secret: "local-request-workflow-test-only-not-for-deployment", token: { sub: id, name: `Test ${id}` }, maxAge: 3600 });
    await context.addCookies([{ name: "next-auth.session-token", value: token, url: "http://localhost:3002", httpOnly: true, sameSite: "Lax" }]);
  }
  async function create(page: Page, trip = "1") {
    await page.goto(`/udhetimi/${trip}/kerko`);
    await page.getByRole("button", { name: "Dërgo kërkesën reale" }).click();
    await expect(page).toHaveURL(/\/kerkesat\?m=derguar$/);
  }
  async function tripSeats() { return (await pool.query("SELECT vende FROM udhetimet WHERE id='1'")).rows[0].vende; }

  test("role-aware login redirects and anonymous access protection", async ({ page, context }) => {
    await page.goto("/shofer"); await expect(page).toHaveURL(/\/panel$/);
    await login(context, "300"); await page.goto("/panel"); await expect(page).toHaveURL(/\/kerkesat$/);
    await page.goto("/shofer"); await expect(page).toHaveURL(/\/kerkesat\?m=ndaluar$/);
    await login(context, "100"); await page.goto("/panel"); await expect(page).toHaveURL(/\/shofer$/);
    await expect(page.getByRole("heading", { name: "Udhëtimet e mia" })).toBeVisible();
    await page.goto("/udhetimi/1/kerko"); await expect(page).toHaveURL(/\/shofer\?m=ndaluar$/);
  });

  test("passenger submits; different driver accepts; refresh preserves status", async ({ page, context }) => {
    await login(context, "300"); await create(page);
    await expect(page.locator("[data-request-id='1']")).toContainText("Në pritje");
    expect(await tripSeats()).toBe(1);
    await page.reload(); await expect(page.locator("[data-request-id='1']")).toContainText("Në pritje");
    await login(context, "100"); await page.goto("/shofer");
    await expect(page.locator("[data-request-id='1']")).toContainText("Passenger One");
    await page.getByRole("button", { name: "Prano kërkesën" }).click();
    await expect(page.getByRole("status")).toContainText("Kërkesa u pranua");
    expect(await tripSeats()).toBe(0);
    await expect(page.getByRole("button", { name: "Prano kërkesën" })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await login(context, "300"); await page.goto("/kerkesat"); await page.reload();
    await expect(page.locator("[data-request-id='1']")).toContainText("Pranuar");
    await expect(page.getByRole("button", { name: "Anulo kërkesën" })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test("duplicate, rejection and cancellation keep counts correct", async ({ page, context }) => {
    await login(context, "300"); await create(page);
    await page.goto("/udhetimi/1/kerko"); await page.getByRole("button", { name: "Dërgo kërkesën reale" }).click();
    await expect(page.getByRole("status")).toContainText("Ke tashmë një kërkesë aktive");
    await login(context, "100"); await page.goto("/shofer"); await page.getByRole("button", { name: "Refuzo kërkesën" }).click();
    await expect(page.locator("[data-request-id='1']")).toContainText("Refuzuar"); expect(await tripSeats()).toBe(1);
    await login(context, "300"); await create(page);
    await page.getByRole("button", { name: "Anulo kërkesën" }).click();
    await expect(page.getByRole("status")).toContainText("Kërkesa në pritje u anulua");
    await page.reload(); await expect(page.locator("[data-request-id='2']")).toContainText("Anuluar");
    expect(await tripSeats()).toBe(1);
  });

  test("other users cannot view requests and forged driver form is refused", async ({ page, context }) => {
    await login(context, "300"); await create(page);
    await login(context, "400"); await page.goto("/kerkesat"); await expect(page.locator("[data-request-id]")).toHaveCount(0);
    await create(page, "2");
    await login(context, "200"); await page.goto("/shofer");
    await expect(page.locator("[data-request-id='1']")).toHaveCount(0);
    const form = page.locator("[data-request-id='2'] form").first();
    await form.locator('input[name="id"]').evaluate((input: HTMLInputElement) => { input.value = "1"; });
    await form.getByRole("button", { name: "Prano kërkesën" }).click();
    await expect(page.getByRole("status")).toContainText("Nuk ke leje");
    expect(await tripSeats()).toBe(1);
    expect((await pool.query("SELECT statusi FROM kerkesat WHERE id=1")).rows[0].statusi).toBe("pending");
  });

  test("session lost before submit cannot create request", async ({ page, context }) => {
    await login(context, "300"); await page.goto("/udhetimi/1/kerko");
    await context.clearCookies(); await page.getByRole("button", { name: "Dërgo kërkesën reale" }).click();
    await expect(page).toHaveURL(/\/panel$/);
    expect((await pool.query("SELECT count(*)::int AS n FROM kerkesat")).rows[0].n).toBe(0);
  });

  async function locate(page: Page) {
    await page.addInitScript(() => Object.defineProperty(navigator, "geolocation", { value: {
      getCurrentPosition(success: PositionCallback) { success({ coords: { latitude: 0.125, longitude: 0.25, accuracy: 37 } } as GeolocationPosition); },
    } }));
    await page.goto("/udhetimi/1/kerko");
    await page.getByTestId("locate-me").click();
    await expect(page.getByRole("link", { name: "Hap vendndodhjen në Google Maps" })).toBeVisible();
  }
  test("submitted map link reaches only the assigned driver and survives refresh", async ({ page, context }) => {
    await login(context, "300"); await locate(page);
    expect((await pool.query("SELECT count(*)::int AS n FROM kerkesat")).rows[0].n).toBe(0);
    await page.getByRole("button", { name: "Dërgo kërkesën reale" }).click();
    await expect(page).toHaveURL(/\/kerkesat\?m=derguar$/);
    await login(context, "100"); await page.goto("/shofer"); await page.reload();
    await expect(page.getByRole("link", { name: "Hap vendndodhjen e takimit në Google Maps" })).toHaveAttribute("href", "https://www.google.com/maps/search/?api=1&query=0.125%2C0.25");
    await login(context, "200"); await page.goto("/shofer");
    await expect(page.getByRole("link", { name: "Hap vendndodhjen e takimit në Google Maps" })).toHaveCount(0);
    expect(await tripSeats()).toBe(1);
  });
  test("passenger can omit the map link after obtaining a location", async ({ page, context }) => {
    await login(context, "300"); await locate(page);
    await page.getByRole("checkbox", { name: "Përfshi lidhjen Google Maps për shoferin" }).uncheck();
    await page.getByRole("button", { name: "Dërgo kërkesën reale" }).click();
    await expect(page).toHaveURL(/\/kerkesat\?m=derguar$/);
    await login(context, "100"); await page.goto("/shofer");
    await expect(page.getByRole("link", { name: "Hap vendndodhjen e takimit në Google Maps" })).toHaveCount(0);
    expect((await pool.query("SELECT latitude,longitude FROM kerkesat")).rows[0]).toEqual({ latitude: null, longitude: null });
  });
});
