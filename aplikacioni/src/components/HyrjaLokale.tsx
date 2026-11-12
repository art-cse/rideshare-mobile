"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
export default function HyrjaLokale() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  return <form aria-label="Hyr me përdorues" onSubmit={async e => {
    e.preventDefault(); if (pending) return;
    const data = new FormData(e.currentTarget); setPending(true); setError(false);
    try {
      const result = await signIn("credentials", { username: data.get("username"), password: data.get("password"), redirect: false });
      if (result?.ok) { router.push("/panel"); router.refresh(); return; }
      setError(true);
    } catch { setError(true); }
    setPending(false);
  }}>
    <h2>Hyr me përdorues</h2>
    <label htmlFor="username">Përdoruesi</label><input id="username" name="username" autoComplete="username" required maxLength={32} />
    <label htmlFor="password">Fjalëkalimi</label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={128} />
    <button disabled={pending}>{pending ? "Duke hyrë…" : "Hyr"}</button>
    {error && <p role="alert">Hyrja dështoi. Kontrollo të dhënat; pas 5 provave prit 15 minuta.</p>}
  </form>;
}
