import type { Kerkese } from "./kerkesat";
import type { Profil } from "./lejet";
export type UdhetimGjalle = {id: string; nisja: string; destinacioni: string; ora: string; vendtakimi: string; vende: number; version: string};
export type Gjendja = { profil: Profil; kerkesat: Kerkese[]; udhetimet: UdhetimGjalle[] };
