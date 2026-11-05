import Link from "next/link";
import { notFound } from "next/navigation";
import { gjejUdhetimin } from "@/lib/udhetimet";
import { GabimDatabaze } from "@/components/GabimDatabaze";
import ZgjedhVendtakimin from "@/components/ZgjedhVendtakimin";
export const dynamic = "force-dynamic";
export default async function Detajet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let udhetim;
  try { udhetim = await gjejUdhetimin(id); }
  catch { return <GabimDatabaze />; }
  if (!udhetim) notFound();
  return <main><Link href="/">← Kthehu te lista</Link>
    <h1>{udhetim.nisja} – {udhetim.destinacioni}</h1>
    <p>Ora: {udhetim.ora}</p><p>Vendtakimi: {udhetim.vendtakimi}</p>
    <p>Vende të lira: {udhetim.vende}</p>
    {udhetim.vende > 0 ? <Link className="action" href={`/udhetimi/${id}/kerkesa`}>Kërko vend</Link>
      : <button disabled>Nuk ka vende të lira</button>}
    <ZgjedhVendtakimin key={udhetim.id} />
    <section><h2>Kërkesë reale me llogari</h2>
      <p>Për kërkesë që i dërgohet shoferit, hyr si udhëtar. Veprimi “Kërko vend” më sipër mbetet simulim.</p>
      <Link href={`/udhetimi/${encodeURIComponent(id)}/kerko`}>Dërgo kërkesë reale</Link>
    </section>
  </main>;
}
