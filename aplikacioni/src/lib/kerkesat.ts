import "server-only";
import { getSql } from "./db";
import { profiliIm } from "./lejet";

export type Statusi = "pending" | "accepted" | "rejected" | "cancelled";
export type Kerkese = {
  id: string; udhetimi_id: string; emri: string; nisja: string; destinacioni: string;
  ora: string; vende: number; statusi: Statusi; krijuar: string;
};
export type Veprim = "create" | "accept" | "reject" | "cancel";

export async function kerkesatGati() {
  const rows = await getSql()`SELECT to_regprocedure('public.rideshare_request_action(text,text,text,bigint,integer)') IS NOT NULL AS gati`;
  return rows[0].gati === true;
}

export async function veproKerkesen(operation: Veprim, id: unknown, seats?: unknown): Promise<string> {
  try {
    const p = await profiliIm();
    if (!p) return "hyr";
    if ((operation === "create" || operation === "cancel") ? p.roli !== "udhetar" : p.roli !== "shofer") return "ndaluar";
    if (typeof id !== "string" || !id || id.length > 100) return "fushe";
    if (operation === "create") {
      if (typeof seats !== "string" || !/^[1-8]$/.test(seats)) return "fushe";
    } else if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > BigInt("9223372036854775807")) return "fushe";
    if (!await kerkesatGati()) return "jo_gati";
    const rows = await getSql()`SELECT public.rideshare_request_action(
      ${p.id}, ${operation}, ${operation === "create" ? id : null},
      ${operation === "create" ? null : id}::bigint,
      ${operation === "create" ? Number(seats) : null}::integer) AS rezultat`;
    return rows[0].rezultat as string;
  } catch { return "databaza"; }
}

// Reads derive the identity from the session and repeat the role/ownership filter
// in SQL; no caller-supplied passenger or driver identity is accepted.
export async function lexoKerkesat() : Promise<Kerkese[]> {
  const p = await profiliIm();
  if (!p) throw new Error("hyr");
  const rows = await getSql()`SELECT k.id::text, k.udhetimi_id, p.emri,
    u.nisja, u.destinacioni, u.ora, k.vende, k.statusi, k.krijuar::text
    FROM kerkesat k JOIN udhetimet u ON u.id = k.udhetimi_id
    JOIN profilet p ON p.github_id = k.udhetari_id
    JOIN profilet actor ON actor.github_id = ${p.id}
    WHERE (actor.roli = 'udhetar' AND k.udhetari_id = actor.github_id)
       OR (actor.roli = 'shofer' AND u.shofer_id = actor.github_id)
    ORDER BY k.krijuar DESC, k.id DESC`;
  return rows as Kerkese[];
}

export async function udhetimetEShoferit() {
  const p = await profiliIm();
  if (!p || p.roli !== "shofer") throw new Error("ndaluar");
  const rows = await getSql()`SELECT u.id, u.nisja, u.destinacioni, u.ora, u.vende
    FROM udhetimet u JOIN profilet p ON p.github_id = u.shofer_id
    WHERE p.github_id = ${p.id} AND p.roli = 'shofer' ORDER BY u.id`;
  return rows as {id: string; nisja: string; destinacioni: string; ora: string; vende: number}[];
}
