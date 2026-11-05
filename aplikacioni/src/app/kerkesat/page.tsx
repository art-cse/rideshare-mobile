import { redirect } from "next/navigation";
import { profiliIm } from "@/lib/lejet";
import { kerkesatGati, lexoKerkesat } from "@/lib/kerkesat";
import { GabimDatabaze } from "@/components/GabimDatabaze";
import { ListaKerkesave, MesazhKerkese, NavigimiPanelit } from "@/components/PanelKerkesash";

export const dynamic = "force-dynamic";
export default async function Kerkesat({ searchParams }: { searchParams: Promise<{m?: string | string[]}> }) {
  let p;
  try { p = await profiliIm(); } catch { return <GabimDatabaze />; }
  if (!p) redirect("/panel");
  if (p.roli === "shofer") redirect("/shofer");
  const { m } = await searchParams;
  let gati, rows;
  try {
    gati = await kerkesatGati();
    rows = gati ? await lexoKerkesat() : [];
  } catch { return <GabimDatabaze />; }
  return <main><NavigimiPanelit profil={p} /><h1>Kërkesat e mia</h1><MesazhKerkese value={m} />
      <p>Vetëm pranimi nga shoferi rezervon vendet. Kërkesat në pritje mund të anulohen.</p>
      {gati ? <ListaKerkesave kerkesat={rows} /> : <MesazhKerkese value="jo_gati" />}
    </main>;
}
