# RideShare · Java 7

## Rasti im

GitHub: art-cse

Kodi: P7-107

Skenari i zgjedhur: Rasti 3 — Klikim apo rezervim.

ID i udhëtimit në projektin tim: java7-p7-107 (rresht i përkohshëm vetëm për prova).

Të dhënat fiktive të rastit: Mitrovicë → AAB, ora 10:25, 3 vende. Kodi dhe vlerat llogariten nga gjeneratori i kursit për `art-cse`. Vendtakimi i provës: Te stacioni.

## Parashikimi

Parashikimi personal për rastin me zero vende, dhënë para korrigjimit: “Nuk ka vende te lira”.

Pritshmëria teknike për rastin me vende: pas klikimit shfaqet “Simulim: Në pritje”, identifikohet i njëjti udhëtim dhe asnjë vend nuk rezervohet. Kjo pritshmëri teknike nuk zëvendëson shpjegimin personal të studentit.

## Dy probleme

1. Ekrani i simulimit nuk tregon orën e nisjes. Në kontrollin lokal para ndryshimit, `/udhetimi/2/kerkesa` nuk përmbante 08:15, megjithëse API e kthente këtë orë. Udhëtimet me të njëjtën linjë dallohen më vështirë.
2. Ekrani i simulimit nuk tregon vendtakimin. I njëjti kontroll nuk gjente “Te stacioni kryesor”; përdoruesi duhet të kthehet te detajet. Ky përmirësim mbetet jashtë korrigjimit të vogël të zgjedhur.

## Korrigjimi

Skedari: `aplikacioni/src/app/udhetimi/[id]/kerkesa/page.tsx`.

Planifikohet shfaqja e ID-së, linjës dhe orës nga udhëtimi i lexuar në databazë, për të dy gjendjet e vendeve. Nuk shtohet rezervim real.

## Versionet

Para: ky commit regjistron parashikimin dhe problemet para ndryshimit të kodit; lidhja e plotë do të regjistrohet pas commit-it.

Pas: korrigjimi ende nuk është kryer në këtë version.

## Provat që bëra

Kontrolli fillestar më 05.11.2026: API lokale HTTP 200 me tri udhëtimet; te simulimi i udhëtimit 2 mungojnë ora dhe vendtakimi. Tri provat përfundimtare do të regjistrohen pas ekzekutimit.

## Ndryshimi i ri

Planifikohet ndryshimi vetëm i vendeve nga 3 në 0 te i njëjti rresht prove. Pritshmëria: “Nuk ka vende të lira”, pa kërkesë dhe pa rezervim. Shpjegimi 60–90 sekonda para një kolegu nuk është kryer këtu dhe mbetet për studentin.
