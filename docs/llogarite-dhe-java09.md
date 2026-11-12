# Llogaritë lokale, udhëtimet dhe Java 9

Hap `/panel`. Hyr me përdorues/fjalëkalim ose GitHub. Llogaritë e krijuara sipas kërkesës:

| Përdoruesi | Roli | Udhëtimet ekzistuese |
|---|---|---|
| dreni | shofer | 1 dhe 3 |
| lira | shofer | 2 |
| arta | udhëtar | dërgon kërkesa dhe ruan preferime |

Fjalëkalimet e gjeneruara ndodhen vetëm në `.env.local-accounts.txt` në kompjuterin lokal (i përjashtuar nga Git). Në databazë ruhen hash-e scrypt me salt të rastësishëm. Nuk ka regjistrim publik, zgjedhje roli në formular ose fjalëkalime në repository. Çdo llogari lejon 5 tentativa hyrjeje për 15 minuta. Llogaritë e çaktivizuara nuk mund të përdorin as sesionin ekzistues. `art-cse` mbetet udhëtar.

## Shoferi
Në `/shofer`, “Shto udhëtim” krijon udhëtim me pronar nga sesioni. “Ndrysho / hiq udhëtimin” lejon ndryshimin e nisjes, destinacionit, orës, vendtakimit dhe vendeve të lira (0–8). Versioni në databazë ndalon mbishkrimin e një formulari të vjetruar, përfshirë rastin kur një aprovim sapo ka zbritur vendet.

Heqja kërkon konfirmim, arkivon udhëtimin dhe refuzon kërkesat në pritje. Nuk fshin historikun. Nëse ka pasagjerë të pranuar, heqja dhe ndryshimi i itinerarit/orës/vendtakimit refuzohen. Numri i vendeve të lira mund të përditësohet. Shoferi menaxhon vetëm udhëtimet e veta.

Për të provuar pranimin: hyr si `arta`, hap një udhëtim me vende dhe zgjidh “Dërgo kërkesë reale”. Mund të përdorësh vendndodhjen dhe ta ndash me kutinë përkatëse. Dërgo kërkesën, dil dhe hyr si shoferi i udhëtimit. Paneli tregon lidhjen Google Maps dhe butonat “Prano kërkesën” / “Refuzo kërkesën”. Miratimi zbrit vendet vetëm një herë. Preferimi me yll është veprim tjetër dhe nuk rezervon vende.

## Migrimi dhe testet
Migrimet ekzekutohen sipas rendit 001, 002, 003 pas skemave bazë. `scripts/provision-local-accounts.mjs` është script njëpërdorimësh me kontrolle pronësie, transaksion dhe dalje private; refuzon mbishkrimin e llogarive ekzistuese. Nuk duhet ekzekutuar sërish për të ndryshuar fjalëkalime.

Verifikimi më 12 nëntor 2026: lint dhe TypeScript pa gabime; build production kaloi; Vitest 34 kaluan / 1 provë konkurrence e kapërcyer në PGlite, pastaj 21/21 prova kërkesash kaluan në PostgreSQL real të izoluar. Playwright: Java 9 dhe llogaritë 8/8; kërkesat reale 14/14; Java 8 18/18. Të gjitha provat që ndryshojnë të dhëna përdorin vetëm databazën lokale, jo Neon production.

Provat e Javës 9: `RIDESHARE_LOCAL_POSTGRES=1`, serveri lokal me `tests/support/local-postgres.cjs`, `PLAYWRIGHT_BASE_URL=http://localhost:3002`, pastaj `npx playwright test tests/week09.spec.ts --workers=1`. Mos drejto fixture-t kundër production. Refuzimi i kontrolluar BEFORE INSERT krijohet dhe hiqet vetëm nga testet.
