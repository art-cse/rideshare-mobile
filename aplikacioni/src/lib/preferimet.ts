import "server-only";
import { getSql } from "./db";
import { profiliIm } from "./lejet";
export async function lexoPreferimet() {
  const p = await profiliIm();
  if (!p) return null;
  const rows = await getSql()`SELECT udhetimi_id FROM preferimet WHERE perdoruesi_id=${p.id} ORDER BY udhetimi_id`;
  return rows.map(row => row.udhetimi_id as string);
}
export async function ruajPreferimin(id: unknown) {
  const p = await profiliIm();
  if (!p) return { ok: false, error: "hyr" } as const;
  if (typeof id !== "string" || !id || id.length > 100) return { ok: false, error: "fushe" } as const;
  // Lock the active trip while inserting; the primary key makes retries idempotent.
  const rows = await getSql()`WITH trip AS (SELECT id FROM udhetimet WHERE id=${id} AND aktiv FOR SHARE),
    saved AS (INSERT INTO preferimet(perdoruesi_id,udhetimi_id) SELECT ${p.id},id FROM trip
      ON CONFLICT DO NOTHING RETURNING udhetimi_id)
    SELECT id FROM trip`;
  if (!rows.length) return { ok: false, error: "mungon" } as const;
  return { ok: true, ids: await lexoPreferimet() } as const;
}
