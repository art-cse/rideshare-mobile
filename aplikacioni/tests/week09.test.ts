import { beforeAll, beforeEach, afterAll, test, expect, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const mocks = vi.hoisted(() => ({ session: vi.fn(), sql: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("../src/lib/auth", () => ({ authOptions: {} }));
vi.mock("../src/lib/db", () => ({ getSql: () => mocks.sql }));
import { hashPassword, verifyPassword } from "../src/lib/password";
import { localLogin } from "../src/lib/local-login";
import { profiliIm } from "../src/lib/lejet";
import { lexoPreferimet, ruajPreferimin } from "../src/lib/preferimet";
const db = new PGlite();
const driver = "local:11111111-1111-4111-8111-111111111111";
const passenger = "local:22222222-2222-4222-8222-222222222222";
const login = (id: string | null) => mocks.session.mockResolvedValue(id ? { user: { id } } : null);
async function manage(actor: string, op: string, id="1", version="0", time="08:30") {
  return (await db.query<{result:string}>("SELECT rideshare_manage_trip($1,$2,$3,$4,'Prishtina','AAB',$5,'Stacioni',2) AS result",[actor,op,id,version,time])).rows[0].result;
}
beforeAll(async () => {
  for (const file of ["schema.sql","schema-java05.sql","migrations/001-seat-requests.sql","migrations/002-request-location.sql","migrations/003-accounts-trips-favorites.sql"]) await db.exec(readFileSync(file,"utf8"));
  const hash = await hashPassword("Only-local-test-123");
  await db.query("INSERT INTO profilet(github_id,emri,roli) VALUES ($1,'Driver','shofer'),($2,'Passenger','udhetar')",[driver,passenger]);
  await db.query("INSERT INTO local_accounts(profile_id,username,password_hash) VALUES ($1,'driver_test',$3),($2,'passenger_test',$3)",[driver,passenger,hash]);
},30000);
beforeEach(async () => {
  await db.exec("TRUNCATE kerkesat,preferimet RESTART IDENTITY; UPDATE local_accounts SET attempts=0,disabled=false,window_start=now();");
  await db.query("UPDATE udhetimet SET shofer_id=$1,aktiv=true,nisja='Prishtina',destinacioni='AAB',ora='08:00',vendtakimi='Stacioni',vende=2 WHERE id='1'",[driver]);
  // Version is intentionally monotonic, including fixture changes.
  mocks.sql.mockImplementation(async (strings: TemplateStringsArray,...values: unknown[]) =>
    (await db.query(strings.reduce((s,part,i)=>s+(i?`$${i}`:"")+part,""),values)).rows);
  login(passenger);
});
afterAll(async () => { await db.close(); });
async function version() { return String((await db.query<{version:number}>("SELECT version FROM udhetimet WHERE id='1'")).rows[0].version); }
test("salted passwords, invalid login, throttle and disabled accounts", async () => {
  const hash = await hashPassword("Only-local-test-123");
  expect(await verifyPassword("Only-local-test-123",hash)).toBe(true);
  expect(await verifyPassword("wrong",hash)).toBe(false);
  expect(await hashPassword("Only-local-test-123")).not.toBe(hash);
  expect((await localLogin("driver_test","Only-local-test-123"))?.id).toBe(driver);
  for(let n=0;n<4;n++) expect(await localLogin("driver_test","wrong")).toBeNull();
  expect(await localLogin("driver_test","Only-local-test-123")).toBeNull();
  await db.exec("UPDATE local_accounts SET window_start=now()-interval '16 minutes'");
  expect((await localLogin("driver_test","Only-local-test-123"))?.id).toBe(driver);
  await db.exec("UPDATE local_accounts SET disabled=true");
  login(driver); expect(await profiliIm()).toBeNull();
  expect(await localLogin("driver_test","Only-local-test-123")).toBeNull();
});
test("favorites persist, are personal and idempotent; no seat or request effects", async () => {
  expect(await lexoPreferimet()).toEqual([]);
  expect((await ruajPreferimin("1")).ok).toBe(true);
  await Promise.all([ruajPreferimin("1"),ruajPreferimin("1"),ruajPreferimin("1")]);
  expect(await lexoPreferimet()).toEqual(["1"]);
  expect((await db.query("SELECT * FROM preferimet")).rows).toHaveLength(1);
  expect((await db.query<{vende:number}>("SELECT vende FROM udhetimet WHERE id='1'")).rows[0].vende).toBe(2);
  expect((await db.query("SELECT * FROM kerkesat")).rows).toHaveLength(0);
  login(driver); expect(await lexoPreferimet()).toEqual([]);
  login(null); expect((await ruajPreferimin("1")).ok).toBe(false);
});
test("controlled database refusal before insert leaves no favorite; retry succeeds", async () => {
  await db.exec("CREATE FUNCTION reject_favorite_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test refusal'; END $$; CREATE TRIGGER reject_favorite_test BEFORE INSERT ON preferimet FOR EACH ROW EXECUTE FUNCTION reject_favorite_test();");
  try { await expect(ruajPreferimin("1")).rejects.toThrow("test refusal"); expect(await lexoPreferimet()).toEqual([]); }
  finally { await db.exec("DROP TRIGGER reject_favorite_test ON preferimet; DROP FUNCTION reject_favorite_test();"); }
  expect((await ruajPreferimin("1")).ok).toBe(true);
});
test("drivers create/edit/archive own trips; passengers and different owners refused", async () => {
  expect(await manage(passenger,"edit","1",await version())).toBe("ndaluar");
  expect(await manage(driver,"create","new-trip")).toBe("ruajtur");
  expect(await manage(driver,"edit","2","0")).toBe("ndaluar");
  expect(await manage(driver,"edit","1",await version())).toBe("ruajtur");
  expect(await manage(driver,"edit","1","0")).toBe("vjetruar");
  await db.query("SELECT rideshare_request_action($1,'create','1',NULL,1)",[passenger]);
  expect(await manage(driver,"archive","1",await version())).toBe("hequr");
  expect((await db.query<{statusi:string}>("SELECT statusi FROM kerkesat")).rows[0].statusi).toBe("rejected");
  expect((await ruajPreferimin("1")).ok).toBe(false);
});
test("local driver approval preserves location, deducts once and blocks stale editing/removal", async () => {
  const old = await version();
  await db.query("SELECT rideshare_create_request_with_location($1,'1',1,0.125,0.25)",[passenger]);
  expect((await db.query<{r:string}>("SELECT rideshare_request_action($1,'accept',NULL,1, NULL) r",[driver])).rows[0].r).toBe("pranuar");
  expect(await manage(driver,"edit","1",old)).toBe("vjetruar");
  expect(await manage(driver,"archive","1",await version())).toBe("ka_pasagjere");
  expect(await manage(driver,"edit","1",await version())).toBe("ka_pasagjere");
  expect((await db.query("SELECT latitude,longitude FROM kerkesat")).rows[0]).toEqual({latitude:0.125,longitude:0.25});
});
