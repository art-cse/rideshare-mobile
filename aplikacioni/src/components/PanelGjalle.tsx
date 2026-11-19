"use client";
import Link from "next/link";
import type { Gjendja } from "@/lib/gjendja-types";
import { useGjendja } from "./useGjendja";
import { ListaKerkesave, NavigimiPanelit } from "./PanelKerkesash";
import MenaxhoUdhetimin from "./MenaxhoUdhetimin";
import FormularKerkese from "./FormularKerkese";

export default function PanelGjalle({ initial, tripId }: { initial: Gjendja; tripId?: string }) {
  const { data, stale, privateHidden, expired } = useGjendja(initial, tripId);
  if (privateHidden) return <section aria-live="polite">
    <p>{expired ? "Sesioni ndryshoi ose përfundoi. Hyr përsëri për të parë të dhënat e tua." : "Po verifikojmë sesionin…"}</p>
    {stale && <p role="alert">Po rilidhemi — të dhënat mund të jenë të vjetra.</p>}
    <Link href="/panel">Hap panelin e llogarisë</Link>
  </section>;
  const shofer = data.profil.roli === "shofer";
  const trip = tripId ? data.udhetimet.find(t => t.id === tripId) : undefined;
  const active = data.kerkesat.some(k => k.udhetimi_id === tripId && ["pending", "accepted"].includes(k.statusi));
  return <section aria-label="Gjendja e sinkronizuar">
    <NavigimiPanelit profil={data.profil} />
    {stale ? <p role="alert">Po rilidhemi — të dhënat mund të jenë të vjetra.</p> :
      <p className="sync-state">Gjendja u lexua nga serveri. Përditësim automatik çdo 5 sekonda.</p>}
    <fieldset className="live-controls" disabled={stale} onSubmitCapture={e => { if (stale || !navigator.onLine) e.preventDefault(); }}
      onClickCapture={e => { if (stale && (e.target as HTMLElement).closest("a")) e.preventDefault(); }}>
      <legend className="sr-only">Udhëtimet dhe kërkesat</legend>
      {shofer && <><MenaxhoUdhetimin />
        <section id="udhetimet"><h2>Udhëtimet e mia</h2>
          {!data.udhetimet.length && <p>Nuk ke udhëtime të caktuara. Mund të shtosh një udhëtim të ri.</p>}
          {data.udhetimet.map(u => <article className="trip-card" key={u.id} data-trip-id={u.id}>
            <h3>{u.nisja} – {u.destinacioni}</h3><p>Ora: {u.ora} · Vende të lira: <strong data-testid="trip-seats">{u.vende}</strong></p>
            <MenaxhoUdhetimin key={`${u.id}:${u.version}`} trip={u} />
          </article>)}
        </section>
        <section id="pritje"><h2>Kërkesat në pritje</h2><ListaKerkesave shofer kerkesat={data.kerkesat.filter(k => k.statusi === "pending")} /></section>
        <section><h2>Historiku i kërkesave</h2><ListaKerkesave shofer kerkesat={data.kerkesat.filter(k => k.statusi !== "pending")} /></section>
      </>}
      {!shofer && <>
        {tripId && (trip ? <><h2>{trip.nisja} – {trip.destinacioni}</h2>
          <p>Ora: {trip.ora} · Vende të lira: <strong data-testid="trip-seats">{trip.vende}</strong></p>
          {!active && (trip.vende > 0 ? <FormularKerkese id={trip.id} vende={trip.vende} /> : <p>Nuk ka vende të lira.</p>)}
        </> : <p>Udhëtimi nuk është më aktiv.</p>)}
        <ListaKerkesave kerkesat={data.kerkesat} />
      </>}
    </fieldset>
  </section>;
}
