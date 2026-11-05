import Link from "next/link";
import Hyrja from "./Hyrja";
import ButoniVeprimit from "./ButoniVeprimit";
import type { Kerkese } from "@/lib/kerkesat";
import type { Profil } from "@/lib/lejet";
import { etiketatStatusit, mesazhetKerkesat } from "@/lib/mesazhet-kerkesat";
import { anuloKerkesen, pranoKerkesen, refuzoKerkesen } from "@/app/kerkesat/actions";

export function NavigimiPanelit({ profil }: { profil: Profil }) {
  return <><nav aria-label="Llogaria">
    <Link href="/">Udhëtimet</Link>{" · "}
    {profil.roli === "shofer" ? <><Link href="/shofer">Paneli i shoferit</Link>{" · "}
      <Link href="/shofer#udhetimet">Udhëtimet e mia</Link>{" · "}<Link href="/shofer#pritje">Kërkesat në pritje</Link></>
      : <Link href="/kerkesat">Kërkesat e mia</Link>}
  </nav><p>{profil.emri} · {profil.roli === "shofer" ? "Shofer" : "Udhëtar"}</p>
    <p>ID ime GitHub: <code>{profil.id}</code></p><Hyrja brenda />
  </>;
}
export function MesazhKerkese({ value }: { value?: string | string[] }) {
  const message = typeof value === "string" && Object.hasOwn(mesazhetKerkesat, value) ? mesazhetKerkesat[value] : null;
  return message ? <p role="status">{message}</p> : null;
}
export function ListaKerkesave({ kerkesat, shofer = false }: { kerkesat: Kerkese[]; shofer?: boolean }) {
  if (!kerkesat.length) return <p>Nuk ka kërkesa për momentin.</p>;
  return <div className="trip-list">{kerkesat.map(k => <article className="trip-card" key={k.id} data-request-id={k.id}>
    <h3>{k.nisja} – {k.destinacioni}</h3>
    <p>Ora: {k.ora} · Vende të kërkuara: {k.vende}</p>
    {shofer && <p>Udhëtari: {k.emri}</p>}
    <p>Statusi: <strong>{etiketatStatusit[k.statusi]}</strong></p>
    <p>Dërguar: <time dateTime={new Date(k.krijuar).toISOString()}>{new Intl.DateTimeFormat("sq-AL", {
      dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Budapest",
    }).format(new Date(k.krijuar))} (Europe/Budapest)</time></p>
    <Link href={`/udhetimi/${encodeURIComponent(k.udhetimi_id)}`}>Shiko udhëtimin</Link>
    {k.statusi === "pending" && (shofer ? <div className="request-actions">
      <form action={pranoKerkesen}><input type="hidden" name="id" value={k.id} /><ButoniVeprimit>Prano kërkesën</ButoniVeprimit></form>
      <form action={refuzoKerkesen}><input type="hidden" name="id" value={k.id} /><ButoniVeprimit>Refuzo kërkesën</ButoniVeprimit></form>
    </div> : <form action={anuloKerkesen}><input type="hidden" name="id" value={k.id} /><ButoniVeprimit>Anulo kërkesën</ButoniVeprimit></form>)}
  </article>)}</div>;
}
