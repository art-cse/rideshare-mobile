import "server-only";
import { profiliIm } from "./lejet";
import { getSql } from "./db";
import type { Gjendja } from "./gjendja-types";

export async function lexoGjendjen(tripId: string | null = null): Promise<Gjendja | null> {
  const p = await profiliIm();
  if (!p) return null;
  // One statement = one PostgreSQL snapshot for request status AND remaining seats.
  // Only the verified session supplies identity; tripId only narrows visible data.
  const rows = await getSql()`WITH actor AS (
    SELECT github_id,emri,roli FROM profilet WHERE github_id=${p.id}
      AND (github_id NOT LIKE 'local:%' OR EXISTS
        (SELECT 1 FROM local_accounts a WHERE a.profile_id=github_id AND NOT a.disabled))
  ), requests AS (
    SELECT k.id::text,k.udhetimi_id,passenger.emri,u.nisja,u.destinacioni,u.ora,
      k.vende,u.vende AS vende_lira,k.statusi,k.krijuar::text,k.latitude,k.longitude
    FROM kerkesat k JOIN udhetimet u ON u.id=k.udhetimi_id
    JOIN profilet passenger ON passenger.github_id=k.udhetari_id CROSS JOIN actor a
    WHERE (${tripId}::text IS NULL OR u.id=${tripId}) AND
      ((a.roli='udhetar' AND k.udhetari_id=a.github_id) OR (a.roli='shofer' AND u.shofer_id=a.github_id))
  ), trips AS (
    SELECT u.id,u.nisja,u.destinacioni,u.ora,u.vendtakimi,u.vende,u.version::text
    FROM udhetimet u CROSS JOIN actor a WHERE u.aktiv AND
      (${tripId}::text IS NULL OR u.id=${tripId}) AND
      ((a.roli='shofer' AND u.shofer_id=a.github_id) OR
       (a.roli='udhetar' AND (${tripId}::text IS NOT NULL OR EXISTS
         (SELECT 1 FROM requests r WHERE r.udhetimi_id=u.id))))
  ) SELECT jsonb_build_object(
      'profil',jsonb_build_object('id',a.github_id,'emri',a.emri,'roli',a.roli),
      'kerkesat',COALESCE((SELECT jsonb_agg(r ORDER BY r.krijuar DESC,r.id DESC) FROM requests r),'[]'::jsonb),
      'udhetimet',COALESCE((SELECT jsonb_agg(t ORDER BY t.id) FROM trips t),'[]'::jsonb)
    ) AS gjendja FROM actor a`;
  return (rows[0]?.gjendja as Gjendja | undefined) ?? null;
}
