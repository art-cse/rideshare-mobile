"use client";

import { useId, useState, type FormEvent } from "react";

type Gjendja = "idle" | "loading" | "success" | "denied" | "timeout" | "unavailable";

const mesazhet: Record<Gjendja, string> = {
  idle: "Vendndodhja kërkohet vetëm kur shtyp butonin.",
  loading: "Po kërkojmë vendndodhjen…",
  success: "Pozicioni u mor. Shkruaj dhe konfirmo një vendtakim të dallueshëm.",
  denied: "Leja u refuzua. Shkruaj vendtakimin vetë.",
  timeout: "Koha mbaroi. Provo sërish ose shkruaj vendtakimin vetë.",
  unavailable: "Pozicioni nuk është i disponueshëm. Provo sërish ose shkruaj vendtakimin vetë.",
};

export default function ZgjedhVendtakimin() {
  const id = useId();
  const [teksti, setTeksti] = useState("");
  const [vendtakimi, setVendtakimi] = useState("");
  const [gabimi, setGabimi] = useState("");
  const [gjendja, setGjendja] = useState<Gjendja>("idle");
  const [saktesia, setSaktesia] = useState<number | null>(null);
  const [koordinatat, setKoordinatat] = useState<{ latitude: number; longitude: number } | null>(null);
  const [paMbeshtetje, setPaMbeshtetje] = useState(false);

  function konfirmo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const vlera = teksti.trim();
    if (!vlera) {
      setGabimi("Shkruaj një vendtakim përpara konfirmimit.");
      return;
    }
    setVendtakimi(vlera);
    setGabimi("");
  }

  function lexoVendndodhjen() {
    setSaktesia(null);
    setKoordinatat(null);
    setPaMbeshtetje(false);
    if (!navigator.geolocation) {
      setPaMbeshtetje(true);
      setGjendja("unavailable");
      return;
    }
    setGjendja("loading");
    try {
      navigator.geolocation.getCurrentPosition(
        position => {
          // Koordinatat shfaqen vetëm lokalisht; nuk ruhen ose dërgohen.
          setSaktesia(position.coords.accuracy);
          const { latitude, longitude } = position.coords;
          if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            setKoordinatat({ latitude, longitude });
          }
          setGjendja("success");
        },
        error => {
          setGjendja(error.code === 1 ? "denied" : error.code === 3 ? "timeout" : "unavailable");
        },
        { timeout: 10000 },
      );
    } catch {
      setGjendja("unavailable");
    }
  }

  return <section className="meeting-point" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>Zgjidh vendtakimin tënd</h2>
    <p>Zgjedhja mbetet vetëm në këtë faqe dhe humbet pas rifreskimit. Nuk i dërgohet shoferit dhe nuk rezervon vend.</p>
    <form onSubmit={konfirmo}>
      <label htmlFor={`${id}-input`}>Shkruaj vendtakimin</label>
      <input id={`${id}-input`} data-testid="meeting-input" value={teksti}
        onChange={event => setTeksti(event.target.value)}
        aria-invalid={Boolean(gabimi)} aria-describedby={`${id}-error`} autoComplete="off" />
      <button type="submit" data-testid="confirm-meeting">Konfirmo në telefon</button>
      <p id={`${id}-error`} data-testid="meeting-error" role="alert">{gabimi}</p>
      <p>Vendtakimi i konfirmuar: <strong data-testid="confirmed-meeting" aria-live="polite">{vendtakimi}</strong></p>
    </form>
    <button type="button" data-testid="locate-me" disabled={gjendja === "loading"} onClick={lexoVendndodhjen}>
      Përdor vendndodhjen time
    </button>
    <p data-testid="location-status" data-state={gjendja} role="status">
      {paMbeshtetje ? "Ky shfletues nuk e mbështet vendndodhjen. Shkruaj vendtakimin vetë." : mesazhet[gjendja]}
    </p>
    <p data-testid="location-accuracy" aria-live="polite">{saktesia !== null ? `Saktësia: ${saktesia} m` : ""}</p>
    <div data-testid="location-coordinates" aria-live="polite">
      {koordinatat && <>
        <p>Gjerësia gjeografike (latitude): {koordinatat.latitude.toFixed(6)}°</p>
        <p>Gjatësia gjeografike (longitude): {koordinatat.longitude.toFixed(6)}°</p>
        <p>Koordinatat shfaqen vetëm në këtë faqe. Nuk ruhen dhe nuk i dërgohen shoferit.</p>
      </>}
    </div>
  </section>;
}
