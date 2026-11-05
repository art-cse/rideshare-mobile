import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { profiliIm } from "@/lib/lejet";
import { gjejUdhetimin } from "@/lib/udhetimet";
import { kerkesatGati } from "@/lib/kerkesat";
import { GabimDatabaze } from "@/components/GabimDatabaze";
import { MesazhKerkese, NavigimiPanelit } from "@/components/PanelKerkesash";
import FormularKerkese from "@/components/FormularKerkese";

export const dynamic = "force-dynamic";
export default async function Kerko({ params }: { params: Promise<{id: string}> }) {
  const { id } = await params;
  let p, u, gati;
  try { p = await profiliIm(); } catch { return <GabimDatabaze />; }
  if (!p) redirect("/panel");
  if (p.roli !== "udhetar") redirect("/shofer?m=ndaluar");
  try { [u, gati] = await Promise.all([gjejUdhetimin(id), kerkesatGati()]); } catch { return <GabimDatabaze />; }
  if (!u) notFound();
  return <main><NavigimiPanelit profil={p} /><h1>Kërkesë reale për vend</h1>
    <h2>{u.nisja} – {u.destinacioni}</h2><p>Ora: {u.ora} · Vende të lira: {u.vende}</p>
    <p>Kërkesa ruhet në Neon dhe i shfaqet shoferit. Vendi rezervohet vetëm kur shoferi e pranon.</p>
    {!gati ? <MesazhKerkese value="jo_gati" /> : u.vende < 1 ? <MesazhKerkese value="pa_vende" /> : <FormularKerkese id={u.id} vende={u.vende} />}
    <Link href={`/udhetimi/${encodeURIComponent(id)}`}>Kthehu te detajet</Link>
  </main>;
}
