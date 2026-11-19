import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { profiliIm } from "@/lib/lejet";
import { gjejUdhetimin } from "@/lib/udhetimet";
import { kerkesatGati } from "@/lib/kerkesat";
import { GabimDatabaze } from "@/components/GabimDatabaze";
import { MesazhKerkese } from "@/components/PanelKerkesash";
import PanelGjalle from "@/components/PanelGjalle";
import { lexoGjendjen } from "@/lib/gjendja";

export const dynamic = "force-dynamic";
export default async function Kerko({ params }: { params: Promise<{id: string}> }) {
  const { id } = await params;
  let p, u, gati, state;
  try { p = await profiliIm(); } catch { return <GabimDatabaze />; }
  if (!p) redirect("/panel");
  if (p.roli !== "udhetar") redirect("/shofer?m=ndaluar");
  try { [u, gati] = await Promise.all([gjejUdhetimin(id), kerkesatGati()]); } catch { return <GabimDatabaze />; }
  if (!u) notFound();
  try { state = gati ? await lexoGjendjen(id) : null; } catch { return <GabimDatabaze />; }
  return <main><h1>Kërkesë reale për vend</h1>
    <p>Kërkesa ruhet në Neon dhe i shfaqet shoferit. Vendi rezervohet vetëm kur shoferi e pranon.</p>
    {gati && state ? <PanelGjalle key={`${id}:${JSON.stringify(state)}`} initial={state} tripId={id} /> : <MesazhKerkese value="jo_gati" />}
    <Link href={`/udhetimi/${encodeURIComponent(id)}`}>Kthehu te detajet</Link>
  </main>;
}
