"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
export default function Preferimi({ id }: { id: string }) {
  const [ids, setIds] = useState<string[] | null>(null);
  const [state, setState] = useState<"loading"|"ready"|"login"|"load-error"|"pending"|"success"|"error">("loading");
  const busy = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/preferimet", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (response.status === 401) { setState("login"); return; }
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.ids)) throw new Error("read");
      setIds(data.ids); setState("ready");
    }).catch(() => { if (!controller.signal.aborted) setState("load-error"); });
    return () => controller.abort();
  }, [id]);
  if (state === "loading") return <p role="status">Duke lexuar preferimet…</p>;
  if (state === "login") return <p><Link href="/panel">Hyr për të ruajtur udhëtimin</Link></p>;
  if (state === "load-error") return <p role="alert">Preferimet nuk u lexuan. Rifresko faqen.</p>;
  const saved = ids?.includes(id) ?? false;
  const pending = state === "pending";
  const shown = saved || pending;
  return <section aria-label="Udhëtimi i preferuar"><h2>Preferimi im</h2>
    <button disabled={pending || saved} aria-pressed={shown} onClick={async () => {
      if (busy.current || saved) return;
      busy.current = true; setState("pending");
      try {
        const response = await fetch("/api/preferimet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
        const data = await response.json();
        if (!response.ok || !data.ok || !Array.isArray(data.ids) || !data.ids.includes(id)) throw new Error("save");
        setIds(data.ids); setState("success");
      } catch { setState("error"); }
      finally { busy.current = false; }
    }}>{shown ? "★" : "☆"} {pending ? "Po ruhet…" : saved ? "I ruajtur" : state === "error" ? "Provo përsëri" : "Ruaj udhëtimin"}</button>
    <p role="status">{pending ? "Po presim konfirmimin e serverit." : state === "error" ? "Nuk u ruajt. Provo përsëri." : state === "success" ? "U ruajt te të preferuarat." : saved ? "Preferimet u lexuan nga serveri." : "Nuk është te të preferuarat."}</p>
    <p>Të preferuarat: <strong data-testid="favorites-count">{(ids?.length ?? 0) + (pending && !saved ? 1 : 0)}</strong></p>
    <small>Preferim personal · jo rezervim</small>
  </section>;
}
