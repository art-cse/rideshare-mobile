# RideShare — Java 8

## Çfarë ndërtova

U shtua zgjedhja lokale e vendtakimit te detajet e udhëtimit. Komponenti `ZgjedhVendtakimin` përdoret si te faqja reale që lexon Neon në server, ashtu edhe te `/java-08-test`, e cila përdor udhëtimin fiktiv të Dritonit, Ferizaj → AAB, 08:15. Faqja e provës nuk kërkon login, databazë ose API të jashtme. Ngrohja e kopjes PWA anashkalohet në këtë rrugë që të mos kërkohet as API-ja e udhëtimeve në sfond.

Dy vlera të pavarura `useState` ruajnë draftin dhe vendtakimin e konfirmuar. Funksioni `konfirmo` pastron tekstin me `trim()`, refuzon tekstin bosh dhe ruan zgjedhjen e mëparshme kur hyrja është e pavlefshme. Ndryshimi i draftit nuk ndryshon konfirmimin.

Butoni i vendndodhjes thërret `navigator.geolocation.getCurrentPosition` vetëm pas klikimit, me `timeout: 10000`. Gjendjet janë `idle`, `loading`, `success`, `denied`, `timeout` dhe `unavailable`. Kodet 1, 2 dhe 3 kanë mesazhe të dallueshme; mungesa e API-së ka mesazhin e vet. Çdo rezultat përfundon pritjen dhe lejon riprovimin. Suksesi shfaq vetëm saktësinë në metra, pa shpikur emër vendi dhe pa konfirmuar automatikisht vendtakim.

Nuk ruhen ose dërgohen koordinata. Zgjedhja është gjendje e komponentit në faqen e hapur; nuk ruhet në Neon ose localStorage dhe nuk dërgohet te Dritoni. Nuk ndryshoi skema ose të dhënat e udhëtimeve.

## Provat që bëra

Provat e mëposhtme u kryen me Playwright/Edge, me pamje 375×844 dhe 390×844. API-ja e vendndodhjes u simulua; nuk u lexua GPS real. Serveri i pavarur përdori Node 22.23.4, pa DATABASE_URL, GITHUB_ID, GITHUB_SECRET ose NEXTAUTH_SECRET. Build-i u krijua me Node 24.15.0. Rezultatet nuk paraqiten si prova personale në telefon ose si vlerësim nga profesori.

### Prova 1: Leja nuk kërkohet sapo hapet faqja.

Hapat: hap dhe rifresko `/java-08-test`; numëro thirrjet e API-së së simuluar. Konfirmo Biblioteka, ndrysho draftin në Parkingu pa konfirmuar dhe provo tekst me vetëm hapësira. Kliko butonin e vendndodhjes, pastaj kthe një rezultat të simuluar me saktësi 37 m.

Pritshmëria: zero kërkesa vendndodhjeje në hapje; teksti i konfirmuar mbetet Biblioteka derisa të konfirmohet një vlerë tjetër e vlefshme. Gjatë leximit shfaqet pritja; pas suksesit shfaqen “Pozicioni u mor” dhe 37 m. Vendtakimi nuk konfirmohet vetvetiu.

Vëzhgimi: të gjitha kontrollet kaluan në të dy gjerësitë. Timeout-i i kërkesës ishte 10000 ms. Nuk u bë kërkesë `/api/` nga faqja e pavarur. Etiketat e kërkuara `data-testid` ekzistonin nga një herë dhe elementet e mesazheve mbetën të montuara edhe kur ishin bosh.

### Prova 2: Refuzimi i lejes nuk e bllokon përdoruesin.

Hapat: pas klikimit simulo kodin 1; konfirmo Parkingu manualisht. Në provë tjetër simulo kodin 3, konfirmo Biblioteka dhe riprovo me sukses. Provo veçmas kodin 2 dhe mungesën e `navigator.geolocation`.

Pritshmëria: kodi 1 shfaq “Leja u refuzua. Shkruaj vendtakimin vetë.”; kodi 3 shfaq “Koha mbaroi”; kodi 2 shpjegon pozicionin e padisponueshëm dhe mungesa e API-së shpjegon mungesën e mbështetjes. Pritja përfundon, butoni riaktivizohet dhe manualja punon në secilin rast.

Vëzhgimi: të gjitha degët kaluan. Riprovimi pas timeout-it kaloi nga `loading` në `success`. Saktësia e vjetër u pastrua në fillim të një kërkese të re. Pas rifreskimit, drafti dhe konfirmimi u zbrazën, sipas kufizimit të gjendjes lokale.

### Prova 3: Dëshmitë në GitHub nuk tregojnë adresën time reale.

Hapat: kontrollo komponentin, testet, raportin dhe ndryshimet e Git-it para publikimit. Kontrollo rrjetin gjatë konfirmimit manual te `/udhetimi/2` dhe krahaso API-në publike përpara/pas.

Pritshmëria: vetëm emra fiktivë dhe saktësi e simuluar; asnjë koordinatë reale, sekret ose shkrim i vendtakimit. Lista e udhëtimeve mbetet e njëjtë.

Vëzhgimi: komponenti lexon vetëm `position.coords.accuracy`; nuk lexon latitude/longitude dhe nuk përdor console, localStorage ose kërkesa rrjeti për vendndodhjen. Testi i suksesit jep vetëm objektin me accuracy 37. Konfirmimi dhe simulimi në faqen reale nuk dërguan POST ose metoda të tjera shkrimi; API publike mbeti identike. Pamja e inspektuar përmbante vetëm Biblioteka dhe udhëtimin fiktiv. Skedarët `.env`, screenshot-et dhe rezultatet lokale të testeve nuk përfshihen në commit.

Kontrollet e ekzekutuara:

- `npm ci`: përfundoi; raportoi 8 dobësi moderate në varësitë ekzistuese. Nuk u krye përditësim i pakërkuar i varësive.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`: kaluan; 9 teste njësie për lejet dhe leximet kaluan me PGlite dhe sesione të simuluara.
- `week08.spec.ts`: 18/18 kaluan në Node 22 pa kredenciale (tetë sjelljet e kërkuara dhe një provë shtesë për kodin 2/rifreskimin, secila në dy gjerësi).
- `week08-integration.spec.ts`: 2/2 kaluan me Neon vetëm për lexim dhe komponentin në detajet reale.
- `navigation.spec.ts`, `public-panel.spec.ts`, `pwa.spec.ts`: 6/6 kaluan, përfshirë kërkesën e simuluar, ID-në që mungon, zero vende, kopjen offline dhe rikthimin online.
- `unconfigured.spec.ts`: fillimisht dështoi te paneli në të dy gjerësitë, sepse serverit iu hoq edhe NEXTAUTH_SECRET. Kontrolli i gabimit të databazës kaloi. Me një sekret të përkohshëm testimi, pa Neon/OAuth, 2/2 kaluan; kodi i panelit nuk u ndryshua.

Hyrja interaktive me GitHub dhe GPS-i real nuk u provuan në këtë javë. Testet e lejeve përdorin sesione të simuluara; nuk pretendojnë të verifikojnë procesin e plotë OAuth.

## Ku gjendet puna

- `aplikacioni/src/components/ZgjedhVendtakimin.tsx`: formulari i përbashkët, konfirmimi manual dhe leximi i vendndodhjes.
- `aplikacioni/src/app/udhetimi/[id]/page.tsx`: ruan leximin Neon në server dhe përfshin komponentin klient me çelësin e ID-së.
- `aplikacioni/src/app/java-08-test/page.tsx`: demonstrimi publik me të dhëna lokale fiktive.
- `aplikacioni/src/components/Pwa.tsx`: anashkalon kërkesën e kopjes publike në faqen e pavarur të provës.
- `aplikacioni/src/app/globals.css`: stili minimal i formularit për telefon.
- `aplikacioni/tests/week08.spec.ts` dhe `aplikacioni/tests/week08-integration.spec.ts`: provat e sjelljes dhe integrimit.
- `mobile-week08.json`: `{"version":1,"path":"/java-08-test"}` në rrënjën e repository-t.
- `java-08.md`: ky raport. `package.json` dhe `package-lock.json` mbeten së bashku te `aplikacioni/`.

Faqja lokale: http://localhost:3000/java-08-test. Pas publikimit, e njëjta rrugë është te https://rideshare-mobile-five.vercel.app/java-08-test.

Nga `aplikacioni/`, me serverin përkatës të nisur:

```powershell
npx.cmd playwright test tests/week08.spec.ts --workers=1
npx.cmd playwright test tests/week08-integration.spec.ts tests/navigation.spec.ts tests/public-panel.spec.ts tests/pwa.spec.ts --workers=1
```

Grupi i parë punon pa kredenciale. Grupi i dytë kërkon databazën ekzistuese me tri udhëtimet fiktive, por nuk i ndryshon ato. Për një port tjetër përdor `PLAYWRIGHT_BASE_URL`. Mos ekzekuto testet e Javës 7 që krijojnë rreshta kur kërkohet verifikim vetëm me lexim.

## Çfarë mbetet për përmirësim

Konfirmimi humbet pas rifreskimit dhe nuk ndahet me shoferin. Kjo është zgjedhje lokale e këtij MVP-je. Një version i ardhshëm mund të projektojë dërgimin me pëlqim dhe kontroll lejesh; ky version nuk e zbaton. Duhet provuar personalisht në një telefon real mbi HTTPS, përfshirë refuzimin dhe rivendosjen e lejes.

Testet lokale mbulojnë tetë sjelljet e kërkuara dhe dokumenti ndjek shabllonin. Rezultatet 6/6 dhe 8/8 nga boti i profesorit nuk janë marrë; nuk është krijuar Issue i Javës 8. Dorëzimi pret miratimin e studentit.

## Ndihma nga AI (Artificial Intelligence – inteligjencë artificiale)

Codex ndihmoi me implementimin, debugging, testet automatike dhe përgatitjen e raportit. Rezultatet më sipër u verifikuan me mjete automatike dhe kontroll të kodit; provat personale në telefon dhe demonstrimi para kolegut mbeten për studentin.

## Prova me një hyrje të re

- Hyrja që provova: automatikisht u provua Biblioteka e konfirmuar, pastaj drafti Parkingu pa konfirmim; u provua edhe tekst vetëm me hapësira. Zgjedhja e hyrjes nga kolegu mbetet në pritje.
- Parashikimi im para klikimit: parashikimi personal i studentit ende nuk është dhënë. Pritshmëria teknike e testit ishte që Biblioteka të mbetej e konfirmuar dhe hapësirat të jepnin gabim.
- Çfarë pashë realisht: testet automatike e konfirmuan këtë sjellje në 375px dhe 390px. Vëzhgimi personal me kolegun nuk është kryer ende.
- Skedari dhe funksioni që e shpjegojnë: `aplikacioni/src/components/ZgjedhVendtakimin.tsx`, funksioni `konfirmo`; `onChange` ndryshon vetëm draftin `teksti`.
- Çfarë kuptova ose korrigjova: logjika ndan shkrimin nga konfirmimi; `trim()` dhe kthimi i hershëm mbrojnë zgjedhjen e vlefshme. Shpjegimi personal dhe reflektimi i studentit mbeten për demonstrimin.

Studenti duhet të kryejë personalisht njërën nga dy provat me kolegun, të parashikojë rezultatin para klikimit dhe ta shpjegojë në klasë. Kontrolli automatik nuk verifikon vërtetësinë e provës.
