"use client";
import { useEffect, useState } from "react";
import type { Gjendja } from "@/lib/gjendja-types";
import { startPolling } from "@/lib/polling";

export function useGjendja(initial: Gjendja, tripId?: string) {
  const [data, setData] = useState(initial);
  const [stale, setStale] = useState(false);
  const [privateHidden, setPrivateHidden] = useState(false);
  const [expired, setExpired] = useState(false);
  const identity = initial.profil.id, role = initial.profil.roli;
  useEffect(() => {
    const poll = startPolling<Gjendja | null>({
      read: async signal => {
        if (!navigator.onLine) throw new Error("offline");
        const response = await fetch(`/api/gjendja${tripId ? `?udhetimi=${encodeURIComponent(tripId)}` : ""}`, { signal, cache: "no-store", credentials: "same-origin" });
        if (response.status === 401) return null;
        if (!response.ok) throw new Error("server");
        const next = await response.json();
        if (!next?.profil || !Array.isArray(next.kerkesat) || !Array.isArray(next.udhetimet)) throw new Error("response");
        return next;
      },
      receive: next => {
        if (!next || next.profil.id !== identity || next.profil.roli !== role) {
          setPrivateHidden(true); setExpired(true); return;
        }
        setData(next); setStale(false); setPrivateHidden(false); setExpired(false);
      },
      failed: () => setStale(true),
    });
    const offline = () => { setStale(true); poll.invalidate(); };
    const online = () => poll.refresh();
    // A new cookie in another tab must not leave the old user's private view visible.
    const sessionChanged = (event: StorageEvent) => {
      if (event.key === "nextauth.message") { setPrivateHidden(true); poll.invalidate(); }
    };
    const focus = () => { if (navigator.onLine) poll.invalidate(); };
    const visibility = () => { if (document.visibilityState === "visible") focus(); };
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) { setPrivateHidden(true); poll.invalidate(); }
    };
    window.addEventListener("offline", offline); window.addEventListener("online", online);
    window.addEventListener("storage", sessionChanged); window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pageshow", restored);
    return () => {
      poll.stop(); window.removeEventListener("offline", offline); window.removeEventListener("online", online);
      window.removeEventListener("storage", sessionChanged); window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pageshow", restored);
    };
  }, [identity, role, tripId]);
  return { data, stale, privateHidden, expired };
}
