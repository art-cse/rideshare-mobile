"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { veproKerkesen } from "@/lib/kerkesat";

function rifresko() {
  revalidatePath("/");
  revalidatePath("/kerkesat");
  revalidatePath("/shofer");
  revalidatePath("/udhetimi/[id]", "page");
  revalidatePath("/udhetimi/[id]/kerkesa", "page");
}
export async function dergoKerkesen(data: FormData) {
  const result = await veproKerkesen("create", data.get("id"), data.get("vende"));
  rifresko();
  redirect(`/kerkesat?m=${encodeURIComponent(result)}`);
}
export async function pranoKerkesen(data: FormData) {
  const result = await veproKerkesen("accept", data.get("id"));
  rifresko();
  redirect(`/shofer?m=${encodeURIComponent(result)}`);
}
export async function refuzoKerkesen(data: FormData) {
  const result = await veproKerkesen("reject", data.get("id"));
  rifresko();
  redirect(`/shofer?m=${encodeURIComponent(result)}`);
}
export async function anuloKerkesen(data: FormData) {
  const result = await veproKerkesen("cancel", data.get("id"));
  rifresko();
  redirect(`/kerkesat?m=${encodeURIComponent(result)}`);
}
