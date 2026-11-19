import { redirect } from "next/navigation";
import { profiliIm } from "@/lib/lejet";
import { kerkesatGati } from "@/lib/kerkesat";
import { lexoGjendjen } from "@/lib/gjendja";
import PanelGjalle from "@/components/PanelGjalle";
import { GabimDatabaze } from "@/components/GabimDatabaze";
import { MesazhKerkese } from "@/components/PanelKerkesash";

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
    rows = gati ? await lexoGjendjen() : null;
  } catch { return <GabimDatabaze />; }
  return <main><h1>Kërkesat e mia</h1><MesazhKerkese value={m} />
      <p>Vetëm pranimi nga shoferi rezervon vendet. Kërkesat në pritje mund të anulohen.</p>
      {gati && rows ? <PanelGjalle key={JSON.stringify(rows)} initial={rows} /> : <MesazhKerkese value="jo_gati" />}
    </main>;
}
