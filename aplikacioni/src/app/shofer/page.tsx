import { redirect } from "next/navigation";
import { profiliIm } from "@/lib/lejet";
import { kerkesatGati } from "@/lib/kerkesat";
import { GabimDatabaze } from "@/components/GabimDatabaze";
import { MesazhKerkese } from "@/components/PanelKerkesash";
import PanelGjalle from "@/components/PanelGjalle";
import { lexoGjendjen } from "@/lib/gjendja";


export const dynamic = "force-dynamic";
export default async function Shofer({ searchParams }: { searchParams: Promise<{m?: string | string[]; trip?: string}> }) {
  let p;
  try { p = await profiliIm(); } catch { return <GabimDatabaze />; }
  if (!p) redirect("/panel");
  if (p.roli !== "shofer") redirect("/kerkesat?m=ndaluar");
  const { m, trip } = await searchParams;
  const messages: Record<string,string> = {ruajtur:"Udhëtimi u ruajt.",hequr:"Udhëtimi u hoq nga lista.",vjetruar:"Udhëtimi ndryshoi ndërkohë. Rifresko dhe provo përsëri.",ka_pasagjere:"Ka pasagjerë të pranuar: itinerari dhe heqja janë të bllokuara.",fushe:"Kontrollo fushat dhe konfirmimin.",ndaluar:"Nuk ke leje për këtë udhëtim.",databaza:"Ruajtja dështoi. Provo përsëri."};
  let gati, rows;
  try {
    gati = await kerkesatGati();
    rows = gati ? await lexoGjendjen() : null;
  } catch { return <GabimDatabaze />; }
  return <main><h1>Paneli i shoferit</h1><MesazhKerkese value={m} />
      {trip && <p role="status">{messages[trip] ?? "Veprimi nuk u krye."}</p>}
      {gati && rows ? <PanelGjalle key={JSON.stringify(rows)} initial={rows} /> : <MesazhKerkese value="jo_gati" />}
    </main>;
}
