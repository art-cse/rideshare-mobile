import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, beforeEach, test, expect, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), sql: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("../src/lib/auth", () => ({ authOptions: {} }));
vi.mock("../src/lib/db", () => ({ getSql: () => mocks.sql }));
import { ndryshoOren, profiliIm } from "../src/lib/lejet";
import { lexoUdhetimet, gjejUdhetimin } from "../src/lib/udhetimet";

const db = new PGlite();
async function query(strings: TemplateStringsArray, ...values: unknown[]) {
  const text = strings.reduce((s, part, i) => s + (i ? `$${i}` : "") + part, "");
  return (await db.query(text, values)).rows;
}
beforeAll(async () => {
  await db.exec(readFileSync("schema.sql", "utf8"));
  await db.exec(readFileSync("schema-java05.sql", "utf8"));
}, 30000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  mocks.sql.mockReset().mockImplementation(query);
  mocks.session.mockReset().mockResolvedValue({ user: { id: "12345", name: "Student test" } });
  await db.exec("DELETE FROM profilet WHERE github_id = '67890'; UPDATE udhetimet SET shofer_id = NULL WHERE id = '2'; DELETE FROM profilet WHERE github_id = '12345'; UPDATE udhetimet SET ora = '08:15' WHERE id = '2';");
});
async function driver() {
  await profiliIm();
  await db.exec("UPDATE profilet SET roli = 'shofer' WHERE github_id = '12345'; UPDATE udhetimet SET shofer_id = '12345' WHERE id = '2';");
}
test("schema reruns preserve times and ownership, with exactly three trips", async () => {
  await driver();
  await db.exec("UPDATE udhetimet SET ora = '08:25' WHERE id = '2'");
  await db.exec(readFileSync("schema.sql", "utf8"));
  await db.exec(readFileSync("schema-java05.sql", "utf8"));
  expect(await lexoUdhetimet()).toHaveLength(3);
  expect((await gjejUdhetimin("2"))?.ora).toBe("08:25");
  expect((await db.query("SELECT shofer_id FROM udhetimet WHERE id = '2'")).rows).toEqual([{ shofer_id: "12345" }]);
  expect(await gjejUdhetimin("99")).toBeUndefined();
  expect(await gjejUdhetimin("2' OR '1'='1")).toBeUndefined();
});
test("logged out and fictional identities cannot write or create profiles", async () => {
  for (const user of [null, { user: { id: "DEMO-SHOFER-2" } }]) {
    mocks.session.mockResolvedValue(user);
    expect(await ndryshoOren("2", "08:25")).toBe("hyr");
  }
  expect(mocks.sql).not.toHaveBeenCalled();
});
test("first login is a passenger and cannot write", async () => {
  expect((await profiliIm())?.roli).toBe("udhetar");
  expect(await ndryshoOren("2", "08:25")).toBe("ndaluar");
});
test("owner can update and restore trip 2; forged trip 1 is denied", async () => {
  await driver();
  expect(await ndryshoOren("2", "08:25")).toBe("ruajtur");
  expect((await gjejUdhetimin("2"))?.ora).toBe("08:25");
  expect(await ndryshoOren("1", "08:25")).toBe("ndaluar");
  expect((await gjejUdhetimin("1"))?.ora).toBe("08:00");
  expect(await ndryshoOren("2", "08:15")).toBe("ruajtur");
});
test("invalid IDs, times and non-string fields never update", async () => {
  await driver();
  for (const [id, time] of [["99", "08:25"], ["2", "24:00"], ["2", "08:60"], ["2", "8:25"], ["2", "08:25'"], [null, "08:25"], ["2", new Blob()]]) {
    expect(await ndryshoOren(id, time)).toBe("fushe");
  }
  expect((await gjejUdhetimin("2"))?.ora).toBe("08:15");
});
test("role revoked after profile read is rechecked inside UPDATE", async () => {
  await driver();
  mocks.sql.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    if (strings.join("").includes("UPDATE udhetimet")) {
      await db.exec("UPDATE profilet SET roli = 'udhetar' WHERE github_id = '12345'");
    }
    return query(strings, ...values);
  });
  expect(await ndryshoOren("2", "08:25")).toBe("ndaluar");
  expect((await gjejUdhetimin("2"))?.ora).toBe("08:15");
});
test("stale form after signout requires login", async () => {
  await driver();
  mocks.session.mockResolvedValue(null);
  expect(await ndryshoOren("2", "08:25")).toBe("hyr");
});
test("database failures are distinct", async () => {
  mocks.sql.mockRejectedValue(new Error("test connection failure"));
  expect(await ndryshoOren("2", "08:25")).toBe("databaza");
});
test("database constraints reject invalid time, seats and role", async () => {
  await expect(db.exec("UPDATE udhetimet SET ora = '24:00' WHERE id = '2'")).rejects.toThrow();
  await expect(db.exec("UPDATE udhetimet SET vende = -1 WHERE id = '2'")).rejects.toThrow();
  await expect(db.exec("UPDATE profilet SET roli = 'admin'")).rejects.toThrow();
});
