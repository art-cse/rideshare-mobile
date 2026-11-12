import "server-only";
import { getSql } from "./db";
import { profiliIm } from "./lejet";
import { setTimeout } from "node:timers/promises";
export async function lexoPreferimet() {
  const p = await profiliIm();
  if (!p) return null;
  const rows = await getSql()`SELECT udhetimi_id FROM preferimet WHERE perdoruesi_id=${p.id} ORDER BY udhetimi_id`;
  return rows.map(row => row.udhetimi_id as string);
}
export async function ruajPreferimin(id: unknown, delayMs = 0) {
  const p = await profiliIm();
  if (!p) return { ok: false, error: "hyr" } as const;
  if (typeof id !== "string" || !id || id.length > 100) return { ok: false, error: "fushe" } as const;
  // Deliberate demo delay supplied by the server route, never by the browser.
  // Wait before writing and before taking any database lock.
  if (delayMs > 0) await setTimeout(delayMs);
  // Lock the active trip while inserting; the primary key makes retries idempotent.
  const rows = await getSql()`WITH trip AS (SELECT id FROM udhetimet WHERE id=${id} AND aktiv FOR SHARE),
    saved AS (INSERT INTO preferimet(perdoruesi_id,udhetimi_id) SELECT ${p.id},id FROM trip
      ON CONFLICT DO NOTHING RETURNING udhetimi_id)
    SELECT id FROM trip`;
  if (!rows.length) return { ok: false, error: "mungon" } as const;
  return { ok: true, ids: await lexoPreferimet() } as const;
}
