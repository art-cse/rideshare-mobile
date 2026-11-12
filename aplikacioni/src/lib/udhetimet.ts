import "server-only";
import { getSql } from "./db";
export type Udhetim = { id: string; nisja: string; destinacioni: string; ora: string; vendtakimi: string; vende: number };
export async function lexoUdhetimet(): Promise<Udhetim[]> {
  const sql = getSql();
  const rows = await sql`SELECT id, nisja, destinacioni, ora, vendtakimi, vende FROM udhetimet u WHERE (to_jsonb(u)->>'aktiv') IS DISTINCT FROM 'false' ORDER BY id`;
  return rows as Udhetim[];
}
export async function gjejUdhetimin(id: string): Promise<Udhetim | undefined> {
  const sql = getSql();
  const rows = await sql`SELECT id, nisja, destinacioni, ora, vendtakimi, vende FROM udhetimet u WHERE id = ${id} AND (to_jsonb(u)->>'aktiv') IS DISTINCT FROM 'false'`;
  return rows[0] as Udhetim | undefined;
}
