import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { getSql } from "./db";

export type Profil = { id: string; emri: string; roli: "udhetar" | "shofer" };
export type Rezultat = "hyr" | "ndaluar" | "fushe" | "ruajtur" | "databaza";

export async function profiliIm(): Promise<Profil | null> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id || !/^\d+$/.test(id)) return null;
  const sql = getSql();
  // Identiteti vjen vetëm nga sesioni; profili i ri fillon si udhëtar.
  await sql`INSERT INTO profilet (github_id, emri) VALUES (${id}, ${session.user.name ?? "Student"})
    ON CONFLICT (github_id) DO NOTHING`;
  const rows = await sql`SELECT github_id AS id, emri, roli FROM profilet WHERE github_id = ${id}`;
  return (rows[0] as Profil | undefined) ?? null;
}

export async function ndryshoOren(id: unknown, ora: unknown): Promise<Rezultat> {
  try {
    const p = await profiliIm();
    if (!p) return "hyr";
    if (p.roli !== "shofer") return "ndaluar";
    if (typeof id !== "string" || typeof ora !== "string" ||
      !/^[123]$/.test(id) || !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(ora)) return "fushe";
    const sql = getSql();
    // Pronësia dhe roli kontrollohen përsëri në vetë shkrimin në databazë.
    const rows = await sql`UPDATE udhetimet SET ora = ${ora}
      WHERE id = ${id} AND shofer_id = ${p.id}
        AND EXISTS (SELECT 1 FROM profilet WHERE github_id = ${p.id} AND roli = 'shofer')
      RETURNING id`;
    return rows.length === 1 ? "ruajtur" : "ndaluar";
  } catch {
    return "databaza";
  }
}
