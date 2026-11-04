import { test, expect } from "@playwright/test";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Opt-in: creates one fictional row and removes only that row afterward.
// Run with WEEK7_DATABASE_TEST=1 and --workers=1 against the matching database.
test.describe("Java 7: klikim apo rezervim", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(process.env.WEEK7_DATABASE_TEST !== "1", "Requires explicit database fixture opt-in");
  const id = "java7-p7-107";
  let sql: NeonQueryFunction<false, false>;
  let inserted = false;

  test.beforeAll(async () => {
    if (!process.env.DATABASE_URL) process.loadEnvFile(".env.local");
    sql = neon(process.env.DATABASE_URL!);
    // No upsert: never overwrite a pre-existing row with this ID.
    await sql`INSERT INTO udhetimet (id, nisja, destinacioni, ora, vendtakimi, vende)
      VALUES (${id}, 'Mitrovicë', 'AAB', '10:25', 'Te stacioni', 3)`;
    inserted = true;
  });
  test.afterAll(async () => {
    if (inserted) await sql`DELETE FROM udhetimet WHERE id = ${id}`;
  });

  test("Prova 1: lista → detajet → simulimi ruan udhëtimin dhe vendet", async ({ page }) => {
    await page.goto("/");
    await page.locator(`a[href="/udhetimi/${id}"]`).click();
    await expect(page.getByText("Ora: 10:25")).toBeVisible();
    await page.getByRole("link", { name: "Kërko vend" }).click();
    await expect(page).toHaveURL(new RegExp(`/udhetimi/${id}/kerkesa$`));
    await expect(page.getByRole("heading", { name: "Simulim: Në pritje" })).toBeVisible();
    await expect(page.getByText(/Asnjë vend nuk është rezervuar/)).toBeVisible();
    const rows = await sql`SELECT vende FROM udhetimet WHERE id = ${id}`;
    expect(rows[0].vende).toBe(3);
  });

  test("Prova 2: simulimi identifikon ID-në, linjën dhe orën", async ({ page }) => {
    await page.goto(`/udhetimi/${id}/kerkesa`);
    await expect(page.getByText(`Udhëtimi ${id}: Mitrovicë – AAB · Ora: 10:25`, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test("Prova 3: vetëm vendet ndryshojnë nga 3 në 0", async ({ page }) => {
    await sql`UPDATE udhetimet SET vende = 0 WHERE id = ${id}`;
    await page.goto(`/udhetimi/${id}`);
    await expect(page.getByRole("button", { name: "Nuk ka vende të lira" })).toBeDisabled();
    await page.goto(`/udhetimi/${id}/kerkesa`);
    await expect(page.getByRole("heading", { name: "Nuk ka vende të lira" })).toBeVisible();
    await expect(page.getByText(`Udhëtimi ${id}: Mitrovicë – AAB · Ora: 10:25`, { exact: true })).toBeVisible();
    await expect(page.getByText("Asnjë kërkesë nuk është dërguar dhe asnjë vend nuk është rezervuar.")).toBeVisible();
    const rows = await sql`SELECT vende FROM udhetimet WHERE id = ${id}`;
    expect(rows[0].vende).toBe(0);
  });
});
