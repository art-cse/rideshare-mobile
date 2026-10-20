import Link from "next/link";
import Hyrja from "@/components/Hyrja";
import { profiliIm } from "@/lib/lejet";
import { ruajOren } from "./actions";
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
  const mesazh = typeof m === "string" && Object.hasOwn(mesazhet, m) ? mesazhet[m] : null;
  return <main><Link href="/">← Kthehu te lista</Link><h1>Paneli im</h1>
    {mesazh && <p role="status">{mesazh}</p>}
    {!p ? <p>Lista është publike. Për panelin hyr me llogarinë tënde GitHub.</p> : <>
      <p>Përshëndetje, {p.emri}. Roli: <strong>{p.roli}</strong>.</p>
      <p>ID ime GitHub: <code>{p.id}</code></p>
    </>}
    <Hyrja brenda={Boolean(p)} />
    {p?.roli === "shofer" ? <form action={ruajOren}>
      <h2>Ndrysho orën e udhëtimit tim</h2>
      <input type="hidden" name="id" value="2" />
      <label htmlFor="ora">Ora e re për udhëtimin 2</label>
      <input id="ora" name="ora" type="time" defaultValue="08:15" required />
      <div><button type="submit">Ruaj orën</button></div>
      <p>Serveri verifikon rolin dhe pronarin për çdo ruajtje.</p>
    </form> : p && <p>Si udhëtar mund të shohësh udhëtimet, por nuk mund të ndryshosh orën.</p>}
    <p>Kërkesa për vend mbetet simulim. Asnjë vend nuk rezervohet.</p>
  </main>;
}
