import { redirect } from "next/navigation";
import { profiliIm } from "@/lib/lejet";
import { kerkesatGati, lexoKerkesat, udhetimetEShoferit } from "@/lib/kerkesat";
import { GabimDatabaze } from "@/components/GabimDatabaze";
import { ListaKerkesave, MesazhKerkese, NavigimiPanelit } from "@/components/PanelKerkesash";
import MenaxhoUdhetimin from "@/components/MenaxhoUdhetimin";


export const dynamic = "force-dynamic";
export default async function Shofer({ searchParams }: { searchParams: Promise<{m?: string | string[]; trip?: string}> }) {
  let p;
  try { p = await profiliIm(); } catch { return <GabimDatabaze />; }
  if (!p) redirect("/panel");
  if (p.roli !== "shofer") redirect("/kerkesat?m=ndaluar");
  const { m, trip } = await searchParams;
  const messages: Record<string,string> = {ruajtur:"Udhëtimi u ruajt.",hequr:"Udhëtimi u hoq nga lista.",vjetruar:"Udhëtimi ndryshoi ndërkohë. Rifresko dhe provo përsëri.",ka_pasagjere:"Ka pasagjerë të pranuar: itinerari dhe heqja janë të bllokuara.",fushe:"Kontrollo fushat dhe konfirmimin.",ndaluar:"Nuk ke leje për këtë udhëtim.",databaza:"Ruajtja dështoi. Provo përsëri."};
  let gati, trips, rows;
  try {
    gati = await kerkesatGati();
    [trips, rows] = await Promise.all([udhetimetEShoferit(), gati ? lexoKerkesat() : Promise.resolve([])]);
  } catch { return <GabimDatabaze />; }
  return <main><NavigimiPanelit profil={p} /><h1>Paneli i shoferit</h1><MesazhKerkese value={m} />
      {trip && <p role="status">{messages[trip] ?? "Veprimi nuk u krye."}</p>}
      <MenaxhoUdhetimin />
      <section id="udhetimet"><h2>Udhëtimet e mia</h2>
        {!trips.length && <p>Nuk ke udhëtime të caktuara. Mund të shtosh një udhëtim të ri.</p>}
        {trips.map(u => <article className="trip-card" key={u.id}>
          <h3>{u.nisja} – {u.destinacioni}</h3><p>Ora: {u.ora} · Vende të lira: {u.vende}</p>
          <MenaxhoUdhetimin trip={u} />
        </article>)}
      </section>
      {!gati ? <MesazhKerkese value="jo_gati" /> : <>
        <section id="pritje"><h2>Kërkesat në pritje</h2><ListaKerkesave shofer kerkesat={rows.filter(k => k.statusi === "pending")} /></section>
        <section><h2>Historiku i kërkesave</h2><ListaKerkesave shofer kerkesat={rows.filter(k => k.statusi !== "pending")} /></section>
      </>}
    </main>;
}
