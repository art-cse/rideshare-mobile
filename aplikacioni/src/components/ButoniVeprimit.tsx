"use client";
import { useFormStatus } from "react-dom";
export default function ButoniVeprimit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-busy={pending}>{pending ? "Duke ruajtur…" : children}</button>;
}
