import Link from "next/link";
import { notFound } from "next/navigation";
import { gjejUdhetimin } from "@/lib/udhetimet";
import { GabimDatabaze } from "@/components/GabimDatabaze";
export const dynamic = "force-dynamic";
export default async function Kerkesa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let udhetim;
  try { udhetim = await gjejUdhetimin(id); }
  catch { return <GabimDatabaze />; }
  if (!udhetim) notFound();
  return <main><Link href={`/udhetimi/${id}`}>← Kthehu te detajet</Link>
    {udhetim.vende > 0 ? <><h1>Simulim: Në pritje</h1>
      <p>Kërkesa për udhëtimin {udhetim.nisja} – {udhetim.destinacioni} nuk është dërguar. Asnjë vend nuk është rezervuar.</p></>
      : <><h1>Nuk ka vende të lira</h1><p>Asnjë kërkesë nuk është dërguar dhe asnjë vend nuk është rezervuar.</p></>}
    <Link href="/">Kthehu te lista</Link>
  </main>;
}
