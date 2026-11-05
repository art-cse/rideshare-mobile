"use client";
import { useState } from "react";
import { dergoKerkesen } from "@/app/kerkesat/actions";
import ZgjedhVendtakimin from "./ZgjedhVendtakimin";
import ButoniVeprimit from "./ButoniVeprimit";
import type { Koordinata } from "@/lib/harta";

export default function FormularKerkese({ id, vende }: { id: string; vende: number }) {
  const [location, setLocation] = useState<Koordinata | null>(null);
  const [share, setShare] = useState(true);
  return <>
    <ZgjedhVendtakimin onLocationChange={setLocation} />
    <form action={dergoKerkesen}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="latitude" value={share && location ? location.latitude : ""} />
      <input type="hidden" name="longitude" value={share && location ? location.longitude : ""} />
      <label htmlFor="vende">Sa vende kërkon?</label>
      <input id="vende" name="vende" type="number" min="1" max={Math.min(8, vende)} defaultValue="1" required />
      {location ? <label><input className="share-location" type="checkbox" checked={share} onChange={event => setShare(event.target.checked)} />
        Përfshi lidhjen Google Maps për shoferin
      </label> : <p>Mund ta dërgosh kërkesën pa vendndodhje, ose ta marrësh atë me butonin më sipër.</p>}
      <p>Lidhja e përfshirë ruhet me kërkesën dhe shihet nga ti dhe shoferi i udhëtimit. Vendtakimi i shkruar mbetet vetëm në telefon.</p>
      <ButoniVeprimit>Dërgo kërkesën reale</ButoniVeprimit>
    </form>
  </>;
}
