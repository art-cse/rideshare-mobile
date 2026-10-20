"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ndryshoOren, type Rezultat } from "@/lib/lejet";

export async function ruajOren(formData: FormData) {
  const id = formData.get("id");
  let mesazh: Rezultat;
  try { mesazh = await ndryshoOren(id, formData.get("ora")); }
  catch { mesazh = "databaza"; }
  if (mesazh === "ruajtur") {
    revalidatePath("/");
    revalidatePath(`/udhetimi/${id}`);
  }
  redirect(`/panel?m=${mesazh}`);
}
