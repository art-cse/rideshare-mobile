"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
export default function HyrjaLokale() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(false);
  return <form className="local-login" aria-label="Hyr me përdorues" onSubmit={async e => {
    e.preventDefault(); if (pending) return;
    const data = new FormData(e.currentTarget); setPending(true); setError(false); setVisible(false);
    try {
      const result = await signIn("credentials", { username: data.get("username"), password: data.get("password"), redirect: false });
      if (result?.ok) { router.push("/panel"); router.refresh(); return; }
      setError(true);
    } catch { setError(true); }
    setPending(false);
  }}>
    <h2>Hyr me përdorues</h2>
    <div className="login-field"><label htmlFor="username">Përdoruesi</label><input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={32} /></div>
    <div className="login-field"><label htmlFor="password">Fjalëkalimi</label>
      <div className="password-controls"><input id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required maxLength={128} />
        <button type="button" className="password-toggle" aria-controls="password" aria-pressed={visible} aria-label={visible ? "Fshih fjalëkalimin" : "Shfaq fjalëkalimin"} onClick={() => setVisible(v => !v)}>{visible ? "Fshih" : "Shfaq"}</button>
      </div>
    </div>
    <button type="submit" className="login-submit" disabled={pending}>{pending ? "Duke hyrë…" : "Hyr"}</button>
    {error && <p role="alert">Hyrja dështoi. Kontrollo të dhënat; pas 5 provave prit 15 minuta.</p>}
  </form>;
}
