"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { profiliIm } from "@/lib/lejet";
import { getSql } from "@/lib/db";
export async function menaxhoUdhetimin(data: FormData) {
  let result = "databaza";
  try {
    const p = await profiliIm();
    const operation = data.get("operation");
    const id = operation === "create" ? randomUUID() : data.get("id");
    const version = data.get("version");
    const seats = data.get("vende");
    if (!p) result = "hyr";
    else if (p.roli !== "shofer") result = "ndaluar";
    else if (typeof id !== "string" || id.length > 100 || !["create","edit","archive"].includes(String(operation)) ||
      (operation !== "create" && (typeof version !== "string" || !/^\d{1,15}$/.test(version))) ||
      (operation === "archive" ? data.get("confirm") !== "on" : typeof seats !== "string" || !/^[0-8]$/.test(seats))) result = "fushe";
    else {
      const fields = ["nisja", "destinacioni", "ora", "vendtakimi"].map(k => data.get(k));
      if (operation !== "archive" && fields.some(v => typeof v !== "string" || v.length > 200)) result = "fushe";
      else {
        const rows = await getSql()`SELECT rideshare_manage_trip(${p.id},${operation},${id},${version || null}::bigint,
          ${fields[0]},${fields[1]},${fields[2]},${fields[3]},${operation === "archive" ? null : Number(seats)}::integer) AS result`;
        result = rows[0].result;
      }
    }
  } catch { result = "databaza"; }
  revalidatePath("/", "layout");
  redirect(`/shofer?trip=${encodeURIComponent(result)}`);
}
