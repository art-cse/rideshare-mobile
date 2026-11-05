import Link from "next/link";
import { redirect } from "next/navigation";
import Hyrja from "@/components/Hyrja";
import { profiliIm } from "@/lib/lejet";
export const dynamic = "force-dynamic";
const mesazhet: Record<string, string> = {
  hyr: "Hyr në llogari para se të ndryshosh udhëtimin.",
  ndaluar: "Nuk ke leje për këtë udhëtim. Ora nuk ndryshoi.",
  fushe: "Shkruaj një orë të vlefshme, p.sh. 08:25. ID duhet të jetë 1, 2 ose 3.",
  ruajtur: "Ora u ruajt me sukses. Kontrollo listën dhe detajet.",
  databaza: "Nuk u lidhëm me databazën. Provo përsëri.",
};
export default async function Panel({ searchParams }: {
  searchParams: Promise<{ m?: string | string[] }>;
}) {
  const { m } = await searchParams;
  let p;
  try { p = await profiliIm(); }
  catch { return <main><h1>Paneli im</h1><p role="alert">{mesazhet.databaza}</p>
    <Link href="/panel">Provo përsëri</Link><p><Link href="/">Kthehu te lista</Link></p></main>; }
  if (p) redirect(`${p.roli === "shofer" ? "/shofer" : "/kerkesat"}${typeof m === "string" && Object.hasOwn(mesazhet, m) ? `?m=${encodeURIComponent(m)}` : ""}`);
  const mesazh = typeof m === "string" && Object.hasOwn(mesazhet, m) ? mesazhet[m] : null;
  return <main><Link href="/">← Kthehu te lista</Link><h1>Paneli im</h1>
    {mesazh && <p role="status">{mesazh}</p>}
    <p>Lista është publike. Për panelin hyr me llogarinë tënde GitHub.</p>
    <Hyrja brenda={false} />
    <p>Pas hyrjes hapet paneli sipas rolit të caktuar në server. Kërkesat reale janë të ndara nga simulimi i Javës 7.</p>
  </main>;
}
