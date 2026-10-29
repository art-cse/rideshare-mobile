# RideShare — Java 6 · PWA dhe puna offline

**Statusi (29.10.2026):** Kodi për Javën 6 është në GitHub dhe në deployment-in e prodhimit Vercel (commit `ab3af5b95346785ab5d3b4385b49d66fd4f572be`). Databaza Neon u kontrollua drejtpërdrejt; tri provat në shfletues dhe testi me internet të ndërprerë **nuk janë kryer ende**. Nuk po shënohen si të kaluara pa u parë rezultati real.

## Çfarë ndërtova

- `aplikacioni/src/app/manifest.ts`: manifesti PWA, emri RideShare AAB, `standalone`, ikonat 192×192 dhe 512×512.
- `aplikacioni/src/app/api/udhetimet/route.ts`: API publike `GET /api/udhetimet` me vetëm fushat `id`, `nisja`, `destinacioni`, `ora`, `vendtakimi` dhe `vende`.
- `aplikacioni/public/sw.js`: service worker që ruan dokumentin offline, ikonat dhe listën publike; provon serverin përpara kopjes lokale.
- `aplikacioni/public/offline.html`: lexues i thjeshtë me karta, kohën e kopjes dhe burimin e listës. Veprimi për kërkesë vendi është i çaktivizuar.
- `aplikacioni/src/components/Pwa.tsx`: regjistron service worker-in dhe përpiqet të mbushë kopjen e listës kur worker-i kontrollon faqen.
- `aplikacioni/src/app/layout.tsx`: e vendos komponentin PWA në aplikacion.

Offline lexohet **vetëm lista publike**. Nuk krijohet rezervim dhe nuk ruhen sesione, profile ose të dhëna private në këtë cache.

## Provat që bëra

### Prova 1: Manifesti dhe vizita online

**Hapat:** Hap `/manifest.webmanifest`, `/icons/icon-192.png`, `/icons/icon-512.png`. Hap faqen kryesore dhe kontrollo Application → Service Workers dhe Cache Storage → `rideshare-public-v1`.

**Pritshmëria:** Emri RideShare AAB, ikonat 192×192 / 512×512, service worker aktiv dhe tri udhëtimet të ruajtura në kopjen publike.

**Rezultati i verifikuar:** Më 29.10.2026, nga deployment-i i prodhimit u kërkuan drejtpërdrejt `/manifest.webmanifest`, të dy ikonat, `/sw.js`, `/offline.html` dhe `/api/udhetimet`: secila adresë ktheu HTTP 200 me llojin e duhur të përmbajtjes. Manifesti ka emrin dhe përmasat e sakta. API ktheu JSON me tri udhëtimet (ID 1 = 08:00, ID 2 = 08:15, ID 3 = 07:45), që përputhen me SELECT nga Neon. Skedarët dhe konfigurimi janë të pranishëm në GitHub dhe deploy i Vercel është READY.

**Nuk është verifikuar ende** në shfletues aktivizimi i worker-it, prania e `/api/udhetimet` në Cache Storage, koha e kopjes dhe instalimi.

### Prova 2: Pa internet dhe pas rifreskimit

**Hapat:** Me internet, hap faqen dhe sigurohu që ruhet lista. Në skedën RideShare aktivizo DevTools → Network → Offline. Rifresko `/`; kontrollo tri kartat, mesazhin e kopjes dhe kohën.

**Pritshmëria:** Shfaqet kopja e fundit me paralajmërim se mund të jetë e vjetruar; kërkesa për vend mbetet e çaktivizuar.

**Rezultati:** Në pritje të provës reale në shfletues. Prania e kodit `sw.js` nuk është provë se rifreskimi offline kalon.

### Prova 3: Lidhja rikthehet

**Hapat:** Pasi është ruajtur ora 08:15 e ID 2, mbaje skedën RideShare offline. Në Neon ndrysho përkohësisht ID 2 në 08:25, pastaj kthehu online dhe shtyp `Rifresko listën`. Në fund rikthe 08:15.

```sql
UPDATE udhetimet SET ora = '08:25' WHERE id = '2';
-- Pas verifikimit:
UPDATE udhetimet SET ora = '08:15' WHERE id = '2';
```

**Pritshmëria:** Offline shihet 08:15, kurse pas rifreskimit online 08:25 dhe koha e re e ruajtjes.

**Rezultati:** Nuk është kryer ky ndryshim i përkohshëm; Neon u kontrollua vetëm me SELECT. Ora e ID 2 është ende 08:15.

## Ku gjendet puna

- Repository: https://github.com/art-cse/rideshare-mobile
- Demo prodhimi: https://rideshare-mobile-five.vercel.app
- Commit-i i PWA: https://github.com/art-cse/rideshare-mobile/commit/ab3af5b95346785ab5d3b4385b49d66fd4f572be

## Testi automatik i përgatitur

`aplikacioni/tests/pwa.spec.ts` përmban një test Playwright për manifestin, ikonat, aktivizimin e service worker-it, kopjen e ruajtur, rifreskimin pa internet dhe kthimin online. Testi **është krijuar në kod**, por nuk është ekzekutuar në një shfletues real gjatë këtij verifikimi. Për ekzekutim me Edge dhe bazën e prodhimit (nga `aplikacioni/`):

```powershell
$env:PLAYWRIGHT_BASE_URL='https://rideshare-mobile-five.vercel.app'
npm.cmd run test:browser -- tests/pwa.spec.ts
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

Kjo provë automatike nuk e ndryshon orën në databazë; skenari manual 08:15 → 08:25 → 08:15 mbetet veçmas.

## Çfarë mbetet për përmirësim

Duhet bërë prova e parë online, pastaj prova pas rifreskimit pa internet dhe prova e përditësimit pasi lidhja të rikthehet. Në vizitën e parë pa kopje të ruajtur, lista nuk mund të shfaqet. Kopja offline mund të jetë e vjetruar dhe nuk konfirmon rezervim. Duhet shënuar koha reale e kopjes dhe rezultati i dukshëm i secilës provë përpara vlerësimit në klasë.

## Ndihma nga AI (Artificial Intelligence – inteligjencë artificiale)

AI ndihmoi me përgatitjen e kodit dhe të raportit, krahasimin me kërkesat e ushtrimeve, kontrollin e repository-t dhe kontrollin read-only të Neon/Vercel. Tri provat interaktive në shfletues mbeten për t'u kryer nga përdoruesi; nuk po paraqiten si prova të realizuara.
