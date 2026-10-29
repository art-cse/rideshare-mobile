import type { Metadata } from "next";
import "./globals.css";
import Pwa from "@/components/Pwa";
export const metadata: Metadata = {
  title: "RideShare · AAB",
  description: "Udhëtime për AAB dhe kërkesa të simuluara për vend.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="sq"><body><Pwa />{children}</body></html>;
}
