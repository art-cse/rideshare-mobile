import { test, expect as baseExpect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { hashPassword } from "../src/lib/password";
const driver = "local:11111111-1111-4111-8111-111111111111";
const passenger = "local:22222222-2222-4222-8222-222222222222";
const expect = baseExpect.configure({ timeout: 25_000 });
test.setTimeout(90_000);
test.describe("Week 9 and local accounts — isolated PostgreSQL", () => {
  test.skip(process.env.RIDESHARE_LOCAL_POSTGRES !== "1", "Local database required");
  test.describe.configure({ mode: "serial" });
  let pool: Pool;
  test.beforeAll(async ({ baseURL }) => {
    if (baseURL !== "http://localhost:3002") throw new Error("Local target only");
    pool = new Pool({connectionString:"postgresql://rideshare_test:local-test-only@127.0.0.1:55432/rideshare_test"});
    await pool.query("TRUNCATE kerkesat RESTART IDENTITY");
    for(const file of ["schema.sql","schema-java05.sql","migrations/001-seat-requests.sql","migrations/002-request-location.sql","migrations/003-accounts-trips-favorites.sql"]) await pool.query(readFileSync(file,"utf8"));
    const hash = await hashPassword("Only-local-test-123");
    await pool.query("INSERT INTO profilet(github_id,emri,roli) VALUES($1,'Driver Test','shofer'),($2,'Passenger Test','udhetar') ON CONFLICT(github_id) DO NOTHING",[driver,passenger]);
    await pool.query("INSERT INTO local_accounts(profile_id,username,password_hash) VALUES($1,'driver_test',$3),($2,'passenger_test',$3) ON CONFLICT(profile_id) DO UPDATE SET password_hash=EXCLUDED.password_hash",[driver,passenger,hash]);
  });
  test.beforeEach(async () => {
    await pool.query("TRUNCATE kerkesat,preferimet RESTART IDENTITY; UPDATE local_accounts SET attempts=0,disabled=false,window_start=now(); DELETE FROM udhetimet WHERE id NOT IN ('1','2','3');");
    await pool.query("UPDATE udhetimet SET aktiv=true,shofer_id=$1,ora='08:00',vende=2 WHERE id='1'",[driver]);
  });
  test.afterAll(async () => { await pool?.end(); });
  async function login(page: Page, username: string) {
    await page.context().clearCookies(); await page.goto("/panel");
    await page.getByLabel("Përdoruesi",{exact:true}).fill(username);
    await page.getByLabel("Fjalëkalimi",{exact:true}).fill("Only-local-test-123");
    await page.getByRole("button",{name:"Hyr",exact:true}).click();
    await expect(page).toHaveURL(username === "driver_test" ? /\/shofer$/ : /\/kerkesat$/);
  }
  test("optimistic star/count, confirmation, persistence, repeat and personal isolation", async ({page}) => {
    await login(page,"passenger_test"); await page.goto("/udhetimi/1");
    const button=page.getByRole("button",{name:"☆ Ruaj udhëtimin"}); await expect(button).toBeEnabled();
    let release!: () => void; const gate=new Promise<void>(resolve => {release=resolve;}); let posts=0;
    await page.route("**/api/preferimet",async route => {
      if(route.request().method()==="POST") {posts++; await gate;}
      await route.continue();
    });
    await button.click();
    await expect(page.getByRole("button",{name:"★ Po ruhet…"})).toBeDisabled();
    await expect(page.getByTestId("favorites-count")).toHaveText("1");
    await expect(page.getByText("Po presim konfirmimin e serverit.")).toBeVisible();
    await page.getByRole("button",{name:"★ Po ruhet…"}).evaluate((b: HTMLButtonElement) => {b.click();b.click();});
    expect(posts).toBe(1); const started = Date.now(); release();
    await expect(page.getByText("U ruajt te të preferuarat.")).toBeVisible();
    expect(Date.now() - started).toBeGreaterThanOrEqual(15_000);
    await page.reload(); await expect(page.getByRole("button",{name:"★ I ruajtur"})).toBeDisabled();
    const results=await page.evaluate(async () => Promise.all([1,2,3].map(async () => (await fetch('/api/preferimet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'1',perdoruesi_id:'forged'})})).status)));
    expect(results).toEqual([200,200,200]);
    expect((await pool.query("SELECT * FROM preferimet WHERE perdoruesi_id=$1 AND udhetimi_id='1'",[passenger])).rowCount).toBe(1);
    expect((await pool.query("SELECT vende FROM udhetimet WHERE id='1'")).rows[0].vende).toBe(2);
    expect((await pool.query("SELECT * FROM kerkesat")).rowCount).toBe(0);
    await login(page,"driver_test"); await page.goto("/udhetimi/1");
    await expect(page.getByTestId("favorites-count")).toHaveText("0");
    expect(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
  test("real database refusal rolls back optimistic UI and retry succeeds", async ({page}) => {
    await login(page,"passenger_test"); await page.goto("/udhetimi/1");
    await pool.query("CREATE OR REPLACE FUNCTION favorite_browser_refusal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'local test'; END $$; CREATE TRIGGER favorite_browser_refusal BEFORE INSERT ON preferimet FOR EACH ROW EXECUTE FUNCTION favorite_browser_refusal();");
    try {
      await page.getByRole("button",{name:"☆ Ruaj udhëtimin"}).click();
      await expect(page.getByText("Nuk u ruajt. Provo përsëri.")).toBeVisible();
      await expect(page.getByTestId("favorites-count")).toHaveText("0");
      await expect(page.getByRole("button",{name:"☆ Provo përsëri"})).toBeEnabled();
      expect((await pool.query("SELECT * FROM preferimet")).rowCount).toBe(0);
    } finally { await pool.query("DROP TRIGGER favorite_browser_refusal ON preferimet; DROP FUNCTION favorite_browser_refusal();"); }
    await page.getByRole("button",{name:"☆ Provo përsëri"}).click();
    await expect(page.getByText("U ruajt te të preferuarat.")).toBeVisible();
  });
  test("username driver creates, edits and removes a trip",async ({page}) => {
    await login(page,"driver_test");
    await page.getByText("Shto udhëtim",{exact:true}).click();
    const create=page.getByRole("form",{name:"Shto udhëtim",exact:true});
    await create.getByLabel("Nisja",{exact:true}).fill("Test city");
    await create.getByLabel("Destinacioni",{exact:true}).fill("AAB");
    await create.getByLabel("Ora",{exact:true}).fill("09:00");
    await create.getByLabel("Vendtakimi",{exact:true}).fill("Test station");
    await create.getByRole("button",{name:"Shto udhëtimin"}).click();
    await expect(page.getByText("Udhëtimi u ruajt.")).toBeVisible();
    const card=page.locator("article").filter({hasText:"Test city"});
    await card.getByText("Ndrysho / hiq udhëtimin").click();
    await card.getByLabel("Ora",{exact:true}).fill("09:30");
    await card.getByRole("button",{name:"Ruaj ndryshimet"}).click();
    await expect(card).toContainText("09:30");
    await card.getByText("Ndrysho / hiq udhëtimin").click();
    await card.getByRole("checkbox").check();
    await card.getByRole("button",{name:"Hiq udhëtimin"}).click();
    await expect(page.getByText("Udhëtimi u hoq nga lista.")).toBeVisible();
    await expect(card).toHaveCount(0);
    expect((await pool.query("SELECT aktiv FROM udhetimet WHERE nisja='Test city'")).rows[0].aktiv).toBe(false);
  });
  test("passenger shares map link and username driver approves existing trip",async ({page,context}) => {
    await context.grantPermissions(["geolocation"]); await context.setGeolocation({latitude:0.125,longitude:0.25,accuracy:37});
    await login(page,"passenger_test"); await page.goto("/udhetimi/1/kerko");
    await page.getByRole("button",{name:/Përdor vendndodhjen time/}).click();
    await expect(page.getByRole("link",{name:/Google Maps/})).toBeVisible();
    await page.getByRole("button",{name:"Dërgo kërkesën reale"}).click();
    await expect(page).toHaveURL(/m=derguar/);
    await login(page,"driver_test");
    await expect(page.getByRole("link",{name:/Google Maps/})).toHaveAttribute("href","https://www.google.com/maps/search/?api=1&query=0.125%2C0.25");
    await page.getByRole("button",{name:"Prano kërkesën"}).click();
    await expect(page.locator('[data-request-id="1"]')).toContainText("Pranuar");
    expect((await pool.query("SELECT vende FROM udhetimet WHERE id='1'")).rows[0].vende).toBe(1);
  });
});
