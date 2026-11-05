# RideShare · Java 7

## Rasti im

GitHub: art-cse

Kodi: P7-107

Skenari i zgjedhur (numri dhe titulli, nga Rastet 1–5): 3 — Klikim apo rezervim.

ID i udhëtimit në projektin tim: java7-p7&#45;107 (rresht i përkohshëm vetëm për prova).

Të dhënat fiktive të rastit: Mitrovicë → AAB, ora 10:25, 3 vende. Kodi dhe vlerat llogariten nga gjeneratori i kursit për `art-cse`. Vendtakimi i provës: Te stacioni.

## Parashikimi

Parashikimi personal për rastin me zero vende, dhënë para korrigjimit: “Nuk ka vende te lira”.

Pritshmëria teknike për rastin me vende: pas klikimit shfaqet “Simulim: Në pritje”, identifikohet i njëjti udhëtim dhe asnjë vend nuk rezervohet. Kjo pritshmëri teknike nuk zëvendëson shpjegimin personal të studentit.

## Dy probleme

1. Ekrani i simulimit nuk tregon orën e nisjes. Në kontrollin lokal para ndryshimit, `/udhetimi/2/kerkesa` nuk përmbante 08:15, megjithëse API e kthente këtë orë. Udhëtimet me të njëjtën linjë dallohen më vështirë.
2. Ekrani i simulimit nuk tregon vendtakimin. I njëjti kontroll nuk gjente “Te stacioni kryesor”; përdoruesi duhet të kthehet te detajet. Ky përmirësim mbetet jashtë korrigjimit të vogël të zgjedhur.

## Korrigjimi

Skedari: aplikacioni/src/app/udhetimi/[id]/kerkesa/page.tsx

Shfaqen ID-ja, linja dhe ora nga udhëtimi i lexuar në databazë, për të dy gjendjet e vendeve. Nuk shtohet rezervim real. Testi i problemit dështoi para korrigjimit dhe kaloi pas tij në build-in e prodhimit lokal.

## Versionet

Para: https://github.com/art-cse/rideshare-mobile/commit/46bb39586644a0ee4b548150b172f48ff9c8226a

Pas: https://github.com/art-cse/rideshare-mobile/commit/7cba6258a95080e5cce71787a9b6e0ddb55769d7

## Provat që bëra

Kontrolli fillestar më 05.11.2026: API lokale HTTP 200 me tri udhëtimet; te simulimi i udhëtimit 2 mungonin ora dhe vendtakimi. Provat më poshtë u ekzekutuan me Edge/Playwright, build prodhimi lokal dhe Neon real, në pamjet 375×844 dhe 390×844. Të gjashtë ekzekutimet kaluan. Rreshti fiktiv u krijua vetëm për prova dhe u fshi më pas; API konfirmoi rikthimin te tri udhëtimet origjinale me të njëjtat vlera.

### Prova 1

Hapat: hap listën, zgjidh `java7-p7-107`, shiko detajet dhe kliko “Kërko vend”.

Pritshmëria: i njëjti ID në URL, ora 10:25 në detaje, status simulimi dhe asnjë rezervim.

Vëzhgimi: “Simulim: Në pritje” dhe paralajmërimi pa rezervim u shfaqën. SELECT pas klikimit konfirmoi ende 3 vende.

### Prova 2

Hapat: hap drejtpërdrejt ekranin e simulimit për të njëjtin ID.

Pritshmëria: shfaqen ID-ja, Mitrovicë – AAB dhe ora 10:25; ekrani nuk del horizontalisht jashtë telefonit.

Vëzhgimi: para korrigjimit mungonte përmbledhja; pas korrigjimit u shfaq e plotë dhe pa tejkalim horizontal në të dy gjerësitë.

### Prova 3

Hapat: ndrysho vetëm `vende` nga 3 në 0, rihap detajet dhe provo edhe URL-në direkte të simulimit.

Pritshmëria: “Nuk ka vende të lira”, butoni i çaktivizuar, identifikimi dhe ora mbeten të njëjta, asnjë kërkesë ose rezervim.

Vëzhgimi: të gjitha pritshmëritë u plotësuan; SELECT konfirmoi 0 vende pas hapjes direkte.

Komanda nga `aplikacioni/`, me serverin lokal të nisur dhe DATABASE_URL për të njëjtën databazë:

```powershell
$env:WEEK7_DATABASE_TEST='1'
npx.cmd playwright test tests/week07.spec.ts --workers=1
Remove-Item Env:WEEK7_DATABASE_TEST
```

Provat shkruajnë vetëm rreshtin e përkohshëm. Mos i ekzekuto paralelisht; INSERT refuzon një ID ekzistuese. Nëse procesi ndërpritet me forcë, kontrollo dhe pastro rreshtin e provës para përsëritjes.

Kontrolle shtesë: lint, build me TypeScript dhe 9 teste të lejeve kaluan; navigimi dhe paneli publik kaluan në të dy gjerësitë. Testi i mëparshëm PWA pati një dështim offline në 375px dhe kaloi në 390px; kjo nuk llogaritet si provë e Javës 7.

## Ndryshimi i ri

Verifikimi në Vercel: deployment `dpl_7gmbYELXWSiUPXFuFNB7AKNX2JYa`, commit `4efa08e1bf897a21483b6e3f47fd5049a8ae554c`, arriti READY në Production. Të njëjtat gjashtë prova kaluan edhe në https://rideshare-mobile-five.vercel.app. Pas pastrimit, API publike konfirmoi vetëm ID-të 1, 2 dhe 3.

Rikontrolli i PWA-së: katër ekzekutime shtesë (dy për secilën gjerësi) kaluan. Dështimi i parë mbetet i regjistruar si rezultat i ndërprerë; shkaku nuk është izoluar dhe ky korrigjim nuk pretendon ta zgjidhë.

U ndryshua vetëm numri i vendeve nga 3 në 0 te i njëjti rresht prove. Rezultati përputhet me parashikimin personal “Nuk ka vende te lira”. Shpjegimi 60–90 sekonda para një kolegu nuk është kryer këtu dhe mbetet për studentin. Nuk është krijuar Issue dorëzimi ose koment te repository i profesorit.

Udhëzimi: https://arbenl.github.io/lendet/2026-2027/mobile/java-07/ushtrimet.html

## Ndihma nga AI

AI më ndihmoi me debugging gjatë zhvillimit.
