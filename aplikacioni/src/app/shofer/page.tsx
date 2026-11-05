import { redirect } from "next/navigation";
import { profiliIm } from "@/lib/lejet";
import { kerkesatGati, lexoKerkesat, udhetimetEShoferit } from "@/lib/kerkesat";
import { GabimDatabaze } from "@/components/GabimDatabaze";
import { ListaKerkesave, MesazhKerkese, NavigimiPanelit } from "@/components/PanelKerkesash";
import ButoniVeprimit from "@/components/ButoniVeprimit";
import { ruajOren } from "@/app/panel/actions";

export const dynamic = "force-dynamic";
export default async function Shofer({ searchParams }: { searchParams: Promise<{m?: string | string[]}> }) {
  let p;
  try { p = await profiliIm(); } catch { return <GabimDatabaze />; }
  if (!p) redirect("/panel");
  if (p.roli !== "shofer") redirect("/kerkesat?m=ndaluar");
  const { m } = await searchParams;
  let gati, trips, rows;
  try {
    gati = await kerkesatGati();
    [trips, rows] = await Promise.all([udhetimetEShoferit(), gati ? lexoKerkesat() : Promise.resolve([])]);
  } catch { return <GabimDatabaze />; }
  return <main><NavigimiPanelit profil={p} /><h1>Paneli i shoferit</h1><MesazhKerkese value={m} />
      <section id="udhetimet"><h2>Udhëtimet e mia</h2>
        {!trips.length && <p>Nuk ke udhëtime të caktuara. Caktimi bëhet nga administrimi i databazës.</p>}
        {trips.map(u => <article className="trip-card" key={u.id}>
          <h3>{u.nisja} – {u.destinacioni}</h3><p>Ora: {u.ora} · Vende të lira: {u.vende}</p>
          {/^[123]$/.test(u.id) && <form action={ruajOren}>
            <input type="hidden" name="id" value={u.id} /><label htmlFor={`ora-${u.id}`}>Ndrysho orën e udhëtimit tim</label>
            <input id={`ora-${u.id}`} name="ora" type="time" defaultValue={u.ora} required /><ButoniVeprimit>Ruaj orën</ButoniVeprimit>
          </form>}
        </article>)}
      </section>
      {!gati ? <MesazhKerkese value="jo_gati" /> : <>
        <section id="pritje"><h2>Kërkesat në pritje</h2><ListaKerkesave shofer kerkesat={rows.filter(k => k.statusi === "pending")} /></section>
        <section><h2>Historiku i kërkesave</h2><ListaKerkesave shofer kerkesat={rows.filter(k => k.statusi !== "pending")} /></section>
      </>}
    </main>;
}
