import Link from "next/link";
import ZgjedhVendtakimin from "@/components/ZgjedhVendtakimin";

export default function Java08Test() {
  return <main>
    <Link href="/">← Kthehu te lista</Link>
    <h1>Vendtakimi në RideShare</h1>
    <p>Udhëtim fiktiv për prova: Dritoni · Ferizaj → AAB · Ora: 08:15.</p>
    <ZgjedhVendtakimin />
  </main>;
}
