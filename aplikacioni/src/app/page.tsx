import Link from "next/link";
import { KartaUdhetimi } from "@/components/KartaUdhetimi";
import { GabimDatabaze } from "@/components/GabimDatabaze";
import { lexoUdhetimet, type Udhetim } from "@/lib/udhetimet";
export const dynamic = "force-dynamic";
export default async function Home() {
  let udhetimet: Udhetim[];
  try { udhetimet = await lexoUdhetimet(); }
  catch { return <GabimDatabaze />; }
  return <main><p className="eyebrow">RideShare · Laboratori AAB</p>
    <h1>Udhëtimet për AAB</h1>
    <Link href="/panel">Hyr / Paneli im</Link>
    <p>Zgjidh nisjen dhe shiko detajet. Kërkesat për vend janë vetëm simulim.</p>
    {udhetimet.length === 0 ? <p>Nuk ka udhëtime për momentin.</p> :
      <div className="trip-list">{udhetimet.map(u => <KartaUdhetimi key={u.id} udhetim={u} />)}</div>}
  </main>;
}
