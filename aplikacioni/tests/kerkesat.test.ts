import { beforeAll, beforeEach, afterAll, test, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";

const mocks = vi.hoisted(() => ({ session: vi.fn(), sql: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("../src/lib/auth", () => ({ authOptions: {} }));
vi.mock("../src/lib/db", () => ({ getSql: () => mocks.sql }));
import { veproKerkesen, lexoKerkesat, udhetimetEShoferit } from "../src/lib/kerkesat";
import { profiliIm } from "../src/lib/lejet";

// Fixed localhost-only test DB: never load DATABASE_URL or production .env files.
const pool = process.env.RIDESHARE_LOCAL_POSTGRES === "1" ? new Pool({
  connectionString: "postgresql://rideshare_test:local-test-only@127.0.0.1:55432/rideshare_test",
}) : null;
const memory = pool ? null : new PGlite();
async function query(text: string, values: unknown[] = []): Promise<Record<string, unknown>[]> {
  return pool ? (await pool.query(text, values)).rows : (await memory!.query<Record<string, unknown>>(text, values)).rows;
}
async function exec(text: string) { if (pool) await pool.query(text); else await memory!.exec(text); }
function login(id: string) { mocks.session.mockResolvedValue({ user: { id, name: `Test ${id}` } }); }
async function seats() { return Number((await query("SELECT vende FROM udhetimet WHERE id='1'"))[0].vende); }
async function status(id = "1") { return (await query("SELECT statusi FROM kerkesat WHERE id=$1", [id]))[0]?.statusi; }
async function request(passenger = "300", trip = "1", count = "1") {
  login(passenger); return veproKerkesen("create", trip, count);
}

beforeAll(async () => {
  for (const file of ["schema.sql", "schema-java05.sql", "migrations/001-seat-requests.sql"]) await exec(readFileSync(file, "utf8"));
}, 30000);
beforeEach(async () => {
  mocks.sql.mockReset().mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) =>
    query(strings.reduce((s, part, i) => s + (i ? `$${i}` : "") + part, ""), values));
  mocks.session.mockReset();
  await exec(`TRUNCATE kerkesat RESTART IDENTITY;
    INSERT INTO profilet(github_id,emri,roli) VALUES ('100','Driver One','shofer'),('200','Driver Two','shofer'),
      ('300','Passenger One','udhetar'),('400','Passenger Two','udhetar')
    ON CONFLICT(github_id) DO UPDATE SET roli=EXCLUDED.roli;
    UPDATE udhetimet SET shofer_id='100', vende=1 WHERE id='1';
    UPDATE udhetimet SET shofer_id='200', vende=2 WHERE id='2';
    UPDATE udhetimet SET shofer_id='100', vende=0 WHERE id='3';`);
});
afterAll(async () => { await pool?.end(); await memory?.close(); });

test("unauthenticated and fictional sessions cannot create, read or approve", async () => {
  for (const user of [null, { user: { id: "DEMO-SHOFER-2" } }]) {
    mocks.session.mockResolvedValue(user);
    for (const op of ["create", "accept", "reject", "cancel"] as const) expect(await veproKerkesen(op, "1", "1")).toBe("hyr");
    await expect(lexoKerkesat()).rejects.toThrow("hyr");
  }
  expect(mocks.sql).not.toHaveBeenCalled();
});
test("new verified identity defaults to passenger; database controls driver role", async () => {
  await exec("DELETE FROM profilet WHERE github_id='500'");
  login("500"); expect((await profiliIm())?.roli).toBe("udhetar");
  expect(await veproKerkesen("accept", "1")).toBe("ndaluar");
  login("100"); expect((await profiliIm())?.roli).toBe("shofer");
  expect(await veproKerkesen("create", "1", "1")).toBe("ndaluar");
});
test("passenger creates pending request without deducting seats", async () => {
  expect(await request()).toBe("derguar"); expect(await status()).toBe("pending"); expect(await seats()).toBe(1);
  expect((await lexoKerkesat()).map(k => k.emri)).toEqual(["Passenger One"]);
});
test("reads are scoped to passenger and trip owner", async () => {
  await request(); await request("400", "2");
  login("300"); expect((await lexoKerkesat()).map(k => k.udhetimi_id)).toEqual(["1"]);
  login("100"); expect((await lexoKerkesat()).map(k => k.udhetimi_id)).toEqual(["1"]);
  expect((await udhetimetEShoferit()).map(t => t.id)).toEqual(["1", "3"]);
  login("200"); expect((await lexoKerkesat()).map(k => k.udhetimi_id)).toEqual(["2"]);
  login("400"); await expect(udhetimetEShoferit()).rejects.toThrow("ndaluar");
});
test("acceptance atomically deducts seats once and preserves status on reread", async () => {
  await request(); login("100"); expect(await veproKerkesen("accept", "1")).toBe("pranuar");
  expect(await seats()).toBe(0); expect(await status()).toBe("accepted");
  expect(await veproKerkesen("accept", "1")).toBe("perfunduar"); expect(await seats()).toBe(0);
  login("300"); expect((await lexoKerkesat())[0].statusi).toBe("accepted");
  expect(await veproKerkesen("cancel", "1")).toBe("perfunduar");
});
test("rejection does not change seats and permits a later new request", async () => {
  await request(); login("100"); expect(await veproKerkesen("reject", "1")).toBe("refuzuar");
  expect(await status()).toBe("rejected"); expect(await seats()).toBe(1);
  expect(await request()).toBe("derguar");
});
test("only the passenger can cancel their pending request", async () => {
  await request(); login("400"); expect(await veproKerkesen("cancel", "1")).toBe("ndaluar");
  login("300"); expect(await veproKerkesen("cancel", "1")).toBe("anuluar");
  expect(await seats()).toBe(1); expect(await status()).toBe("cancelled");
  login("100"); expect(await veproKerkesen("accept", "1")).toBe("perfunduar");
  expect(await request()).toBe("derguar");
});
test("other driver and passengers cannot accept or reject", async () => {
  await request();
  for (const id of ["200", "300", "400"]) {
    login(id); for (const op of ["accept", "reject"] as const) expect(await veproKerkesen(op, "1")).toBe("ndaluar");
  }
  expect(await status()).toBe("pending"); expect(await seats()).toBe(1);
});
test("stale role and ownership are rechecked in the SQL mutation", async () => {
  await request(); login("100");
  const run = mocks.sql.getMockImplementation()!;
  mocks.sql.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    if (strings.join("").includes("SELECT public.rideshare_request_action")) await exec("UPDATE profilet SET roli='udhetar' WHERE github_id='100'");
    return run(strings, ...values);
  });
  expect(await veproKerkesen("accept", "1")).toBe("ndaluar"); expect(await seats()).toBe(1);
  mocks.sql.mockImplementation(run); await exec("UPDATE profilet SET roli='shofer' WHERE github_id='100'; UPDATE udhetimet SET shofer_id='200' WHERE id='1'");
  expect(await veproKerkesen("accept", "1")).toBe("ndaluar");
});
test("duplicate active requests and invalid values cannot create rows", async () => {
  expect(await request()).toBe("derguar"); expect(await request()).toBe("dyfish");
  for (const count of ["0", "-1", "9", "1.5", "1 OR 1=1", null]) {
    expect(await veproKerkesen("create", "2", count)).toBe("fushe");
  }
  expect(await veproKerkesen("create", "999", "1")).toBe("mungon");
  expect(await veproKerkesen("create", "3", "1")).toBe("pa_vende");
  expect(await veproKerkesen("create", "2", "3")).toBe("pa_vende");
  login("100");
  for (const id of ["1 OR 1=1", "-1", "9223372036854775808", new Blob()]) expect(await veproKerkesen("accept", id)).toBe("fushe");
  expect(await veproKerkesen("accept", "999")).toBe("ndaluar");
});
test("unassigned or demo-driver trips cannot take real requests", async () => {
  await exec("UPDATE udhetimet SET shofer_id=NULL WHERE id='1'"); expect(await request()).toBe("pa_shofer");
  await exec("UPDATE udhetimet SET shofer_id='DEMO-SHOFER-2' WHERE id='1'"); expect(await request()).toBe("pa_shofer");
});
test("two pending requests compete for last seat; only one acceptance succeeds", async () => {
  await request(); await request("400"); login("100");
  const results = await Promise.all([veproKerkesen("accept", "1"), veproKerkesen("accept", "2")]);
  expect(results.sort()).toEqual(["pa_vende", "pranuar"]);
  expect(await seats()).toBe(0);
  expect((await query("SELECT statusi FROM kerkesat ORDER BY statusi")).map(k => k.statusi)).toEqual(["accepted", "pending"]);
});
test("concurrent repeated acceptance cannot deduct twice", async () => {
  await request(); login("100");
  expect((await Promise.all([veproKerkesen("accept", "1"), veproKerkesen("accept", "1")])).sort()).toEqual(["perfunduar", "pranuar"]);
  expect(await seats()).toBe(0);
});
test("database constraints and repeatable migration preserve data", async () => {
  await request(); await exec(readFileSync("migrations/001-seat-requests.sql", "utf8"));
  expect(await status()).toBe("pending"); expect(await seats()).toBe(1);
  await expect(query("INSERT INTO kerkesat(udhetimi_id,udhetari_id,vende) VALUES('1','300',1)")).rejects.toThrow();
  await expect(query("INSERT INTO kerkesat(udhetimi_id,udhetari_id,vende) VALUES('missing','400',1)")).rejects.toThrow();
  await expect(query("INSERT INTO kerkesat(udhetimi_id,udhetari_id,vende) VALUES('1','400',0)")).rejects.toThrow();
  await expect(query("UPDATE udhetimet SET vende=-1 WHERE id='1'")).rejects.toThrow();
});
test("database failure returns feedback without claiming success", async () => {
  login("300"); mocks.sql.mockRejectedValue(new Error("unavailable"));
  expect(await veproKerkesen("create", "1", "1")).toBe("databaza");
});

test("failure after seat update rolls back both changes", async () => {
  await request(); login("100");
  await exec(`CREATE OR REPLACE FUNCTION fail_accept_test() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.statusi='accepted' THEN RAISE EXCEPTION 'test failure'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fail_accept_test BEFORE UPDATE ON kerkesat FOR EACH ROW EXECUTE FUNCTION fail_accept_test();`);
  try {
    expect(await veproKerkesen("accept", "1")).toBe("databaza");
    expect(await seats()).toBe(1); expect(await status()).toBe("pending");
  } finally { await exec("DROP TRIGGER fail_accept_test ON kerkesat; DROP FUNCTION fail_accept_test()"); }
});

test("competing acceptance and cancellation finish in one consistent state", async () => {
  await request();
  const results = await Promise.all([
    query("SELECT rideshare_request_action('100','accept',NULL,1,NULL) AS result"),
    query("SELECT rideshare_request_action('300','cancel',NULL,1,NULL) AS result"),
  ]);
  const final = await status();
  expect(["accepted", "cancelled"]).toContain(final);
  expect(await seats()).toBe(final === "accepted" ? 0 : 1);
  expect(results.flat().map(r => r.result)).toContain("perfunduar");
});

test.skipIf(!pool)("real PostgreSQL: approval waits for trip lock, then sees committed seat count", async () => {
  await request(); await request("400");
  const first = await pool!.connect(), second = await pool!.connect();
  try {
    await first.query("BEGIN");
    expect((await first.query("SELECT rideshare_request_action('100','accept',NULL,1,NULL) AS result")).rows[0].result).toBe("pranuar");
    const pid = (await second.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
    const competing = second.query("SELECT rideshare_request_action('100','accept',NULL,2,NULL) AS result");
    await expect.poll(async () => (await pool!.query("SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1", [pid])).rows[0]?.wait_event_type).toBe("Lock");
    await first.query("COMMIT");
    expect((await competing).rows[0].result).toBe("pa_vende");
    expect(await seats()).toBe(0);
  } finally { await first.query("ROLLBACK"); first.release(); second.release(); }
});
