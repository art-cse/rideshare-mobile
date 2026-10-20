import Link from "next/link";
export function GabimDatabaze() {
  return <main><h1>RideShare</h1>
    <Link href="/panel">Hyr / Paneli im</Link>
    <p role="alert">Nuk u lidhëm me databazën. Provo përsëri.</p>
    <Link href="/">Kthehu te lista</Link>
  </main>;
}
