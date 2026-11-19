# RideShare — Java 10

## Çfarë ndërtova
Kërkesat reale të udhëtarit dhe paneli i shoferit tani rilexojnë gjendjen nga serveri automatikisht, afërsisht çdo 5 sekonda. Endpoint-i `GET /api/gjendja` përdor sesionin ekzistues dhe lexon nga PostgreSQL kërkesat dhe vendet në një deklaratë SQL të vetme. Kështu statusi dhe vendet e përgjigjes vijnë nga i njëjti snapshot. Udhëtari sheh vetëm kërkesat e veta; shoferi vetëm kërkesat dhe udhëtimet që zotëron. Parametri opsional `udhetimi` e ngushton leximin dhe nuk përcakton identitetin.

Ndryshimi ndaj Javës 9: preferimi personal me yll mbetet i veçantë; Java 10 sinkronizon rezervimet reale ndërmjet dy sesioneve. Kërkesa standarde ka 1 vend. Funksionaliteti ekzistues për më shumë vende ruhet; testi i kësaj jave përdor vetëm 1. Kërkesa në pritje nuk zbrit vende. Pranimi kryhet nga funksioni ekzistues `rideshare_request_action`, i cili bllokon udhëtimin me `FOR UPDATE` dhe përditëson statusin/vendet në të njëjtin transaksion. Për kërkesën me 1 vend, numri kalon nga 2 në 1 vetëm një herë.

Polling-u planifikon leximin pas përfundimit të të mëparshmit, nuk mbivendos kërkesa, anulon fetch-in gjatë largimit/ndryshimit dhe injoron përgjigjet e vjetruara. Leximi ka timeout 12 sekonda. Përgjigjet personale kanë `Cache-Control: private, no-store, max-age=0` dhe `Vary: Cookie`; service worker-i ekzistues nuk i ruan. Gjendja e fundit mbahet vetëm në memorien e komponentit, jo në localStorage. Ndryshimi i sesionit ose kthimi 401 fsheh të dhënat personale.

Në offline ose gabim serveri ruhet pamja e fundit, shfaqet “Po rilidhemi — të dhënat mund të jenë të vjetra.” dhe veprimet e formularëve bllokohen. Rilidhja nis një lexim të ri dhe paralajmërimi hiqet vetëm pasi përgjigjja të jetë e suksesshme.

## Përgatitja e provës
Provat automatike u ekzekutuan më 19 nëntor 2026 me Playwright/Edge dhe PostgreSQL 17 lokal, të izoluar nga Neon production. U përdorën udhëtimet fiktive `w10-a` dhe `w10-b`, me 2 vende secili. Profili fiktiv `100` ishte shoferi pronar, `300` udhëtari; `200` dhe `400` shërbyen për prova privatësie/lejesh. Sesionet ishin në dy BrowserContext të ndara, me cookies të ndara, në gjerësitë 375 dhe 390 px. Sesionet e këtyre provave u nënshkruan me sekretin fiktiv lokal; nuk pretendohet provë interaktive OAuth nga studenti.

Skema dhe funksioni i pranimit në Neon u inspektuan vetëm për lexim. Nuk u ndryshua skema, rolet, pronësia ose të dhënat production për të simuluar skenarët. Fixture-t krijohen vetëm në databazën lokale dhe udhëtimet `w10-a`/`w10-b` pastrohen pas provave. Llogaritë reale të aplikacionit nuk publikohen këtu me fjalëkalime.

## Provat që bëra
Këto janë vëzhgime nga testet automatike të ekzekutuara me ndihmën e AI; nuk janë deklarim për provë personale në klasë.

### Prova 1: Rasti 1 · Kërkesa mbërrin te shoferi
- Hapat: dy sesionet hapën të njëjtin aplikacion lokal; shoferi hapi `/shofer`, udhëtari `/udhetimi/w10-a/kerko` dhe dërgoi kërkesën standarde për 1 vend.
- Çfarë prisja: kërkesa të shfaqej në të dy ekranet pa Refresh manual, me status “Në pritje” dhe ende 2 vende.
- Çfarë pa realisht shoferi dhe udhëtari, pa Refresh: polling-u e solli kërkesën te shoferi; të dy kartelat treguan “Në pritje” dhe 2 vende. Prova kaloi në të dyja gjerësitë.
- Ku e verifikova ruajtjen: SELECT i drejtpërdrejtë në PostgreSQL lokal konfirmoi `statusi='pending'` dhe `vende=1` në kërkesë; përgjigjja e API-së dhe pamjet përdorën të njëjtën gjendje të ruajtur.

### Prova 2: Rasti 2 · Pranimi përditëson të dy ekranet
- Hapat dhe vendet para/pas: shoferi shtypi “Prano kërkesën”. Vendet kaluan 2 → 1; udhëtari mori përditësimin automatikisht, pa Refresh.
- Përsëritja e pranimit dhe prova me 0 vende: thirrja e përsëritur e funksionit me të njëjtën ID ktheu `perfunduar` dhe la 1 vend. Testet ekzistuese `kerkesat.test.ts` u ekzekutuan edhe në PostgreSQL real lokal: 21/21 kaluan, përfshirë 0 vende, dy pranime për vendin e fundit, dy pranime të së njëjtës kërkesë, pronar të gabuar dhe rollback të transaksionit.
- Çfarë pashë realisht te të dy përdoruesit: “U pranua” dhe 1 vend në kartelën e kërkesës. Shoferi pa edhe vendet e përditësuara te udhëtimi i vet. Testet nuk u mbështetën vetëm te çaktivizimi i butonit për të provuar idempotencën.

### Prova 3: Rasti 3 · Ndërprerja dhe rilidhja
- ID-ja e udhëtimit të ri të provës, cila dritare ishte offline dhe si e provova: `w10-b`, fillimisht 2 vende. Pas dërgimit, vetëm BrowserContext i udhëtarit kaloi offline me Playwright; shoferi mbeti online.
- Pamja e fundit gjatë ndërprerjes: udhëtari mbajti “Në pritje” dhe 2 vende, shfaqi “Po rilidhemi” dhe butoni i anulimit u çaktivizua. Ndërkohë shoferi pranoi dhe pa 1 vend.
- Çfarë ndryshoi pas rilidhjes: pas kthimit online dhe leximit të suksesshëm, udhëtari pa “U pranua” dhe 1 vend; paralajmërimi u hoq pa Refresh. Prova kaloi në të dyja gjerësitë. Një test tjetër simuloi përgjigje HTTP 503 dhe verifikoi ruajtjen e vlerave të fundit.

## Ku gjendet puna
- `aplikacioni/src/app/api/gjendja/route.ts`: endpoint-i privat GET, validimi i filtrit, 401/503 dhe header-at kundër cache-it.
- `aplikacioni/src/lib/gjendja.ts` dhe `gjendja-types.ts`: snapshot-i nga databaza dhe kontrata e përgjigjes.
- `aplikacioni/src/lib/polling.ts`: timer pas përfundimit, timeout, anulim dhe mbrojtje nga përgjigjet e vjetra.
- `aplikacioni/src/components/useGjendja.ts`: rilidhja, offline, kontrolli i sesionit dhe pastrimi i efekteve.
- `aplikacioni/src/components/PanelGjalle.tsx` dhe `PanelKerkesash.tsx`: të dy ekranet, statusi dhe vendet e lira, bllokimi i veprimeve offline.
- `aplikacioni/src/app/kerkesat/page.tsx`, `src/app/shofer/page.tsx`, `src/app/udhetimi/[id]/kerko/page.tsx`: integrimi në rrjedhën ekzistuese.
- Pranimi ekzistues: `aplikacioni/src/app/kerkesat/actions.ts` → `src/lib/kerkesat.ts` → funksioni SQL nga `migrations/003-accounts-trips-favorites.sql`; tabelat bazë nga `schema.sql`, `schema-java05.sql` dhe migrimet 001–003. Nuk u nevojit migrim i ri.
- Testet: `tests/week10.spec.ts`, `tests/week10.test.ts`, `tests/polling.test.ts` dhe regresionet ekzistuese.
- Demonstrimi: https://rideshare-mobile-five.vercel.app/panel
- Repository: https://github.com/art-cse/rideshare-mobile

## Prova me kolegun
Nuk është kryer dhe mbetet e paverifikuar. Në klasë kolegu mund të zgjedhë një udhëtim të ri fiktiv me 2 vende, me shoferin pronar në dritare normale dhe udhëtarin në dritare private. Parashikimi për t'u diskutuar para veprimit: dërgimi lë 2 vende, pranimi i një vendi lë 1, pranimi i përsëritur lë sërish 1. Pastaj ndërpritet vetëm rrjeti i udhëtarit në DevTools dhe provohet rilidhja. Vëzhgimi personal duhet shtuar pasi të kryhet realisht. `rideshare_request_action` mbron rezervimin; `polling.ts` dhe `useGjendja.ts` vetëm rilexojnë rezultatin.

## Çfarë mbetet për përmirësim
Intervali është 5 sekonda pas përfundimit të leximit, prandaj rrjeti i ngadaltë mund ta zgjasë përditësimin. Shfletuesi mund të kufizojë timer-at e skedave në sfond; kthimi në skedë nis lexim të ri. Nëse serveri ka kryer pranimin por përgjigjja humbet, pamja duhet të pajtohet nga leximi i ardhshëm; nuk premtohet rezultat para konfirmimit. Ndryshimi i versionit të udhëtimit rifreskon formularin e redaktimit të shoferit për të shmangur mbishkrimin e vendeve me vlera të vjetra.

Prova manuale në dy telefona dhe prova me kolegun mbeten për studentin. Build-i lokal raportoi një advisory sigurie për versionin ekzistues Next.js 16.4.2; pas përsëritjes build-i përfundoi, por rekomandimi për përditësim mbetet i hapur. Nuk u bë përmirësim i varësive jashtë detyrës së Javës 10.

## Ndihma nga AI (Artificial Intelligence – inteligjencë artificiale)
AI ndihmoi me inspektimin e kodit dhe skemës, projektimin/zbatimin e snapshot-it dhe polling-ut, trajtimin e offline/sesionit, debugimin dhe ekzekutimin e testeve automatike. Dy përputhje në testet e shfletuesit u korrigjuan gjatë provave: selektori i alert-it përfshinte edhe njoftuesin e Next.js, dhe `Vary` përmbante edhe header-at e framework-ut përveç Cookie. Këto nuk paraqiten si prova personale të studentit. Raporti përshkruan ndihmën reale dhe dallon verifikimin automatik nga demonstrimi manual i pakryer.

## Pas dorëzimit të parë — përditëso më vonë
Java 10 nuk është dorëzuar automatikisht. Nuk ka ende link Issue ose feedback për këtë javë. Pas dorëzimit nga studenti shtohen linku, commit-i i kontrolluar dhe rezultati real i komentit të botit. 2/2 teknikisht nuk provon funksionimin e aplikacionit.
