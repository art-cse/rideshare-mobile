# RideShare — Java 9

## Çfarë ndërtova
Udhëtimi mund të shtohet te preferimet personale nga faqja e detajeve. Pas klikimit ylli mbushet dhe numri rritet menjëherë, ndërsa shfaqet “Po presim konfirmimin e serverit.” Suksesi shfaqet vetëm pas përgjigjes së serverit. Në dështim rikthehen ylli bosh dhe numri i konfirmuar më parë, me mundësi riprovimi.

Identiteti merret nga sesioni në server. Neon ruan çiftin përdorues–udhëtim me çelës primar të përbërë; INSERT me ON CONFLICT DO NOTHING e bën ruajtjen të përsëritshme pa kopje. Preferimi nuk rezervon vende dhe nuk dërgon kërkesë te shoferi. Rifreskimi lexon preferimet personale nga serveri, pa cache private.

## Provat që bëra
Provat më poshtë u ekzekutuan automatikisht me ndihmën e AI më 12 nëntor 2026, në PostgreSQL lokal të izoluar, me llogari dhe koordinata fiktive. Nuk përfaqësojnë një provë manuale nga studenti apo kolegu.

### Prova 1: Ruajtja e suksesshme mbetet pas rifreskimit.
Testi hyri me përdoruesin udhëtar, hapi udhëtimin 1 dhe mbajti kërkesën POST në pritje. U verifikuan ylli i mbushur, numri 1 dhe butoni joaktiv para shkrimit. Pas lirimit të kërkesës u shfaq suksesi; rifreskimi ruajti yllin dhe numrin. SQL konfirmoi një rresht për çiftin. Hyrja me përdorues tjetër tregoi 0 preferime. Vendet dhe kërkesat e rezervimit nuk ndryshuan. Rezultati: kaloi në gjerësitë 375 dhe 390 px.

### Prova 2: Gabimi i serverit nuk lë një sukses të rremë në ekran.
Vetëm në databazën lokale të testit u krijua përkohësisht një trigger BEFORE INSERT që refuzon shkrimin. Testi nisi pa preferime dhe provoi ruajtjen. Serveri ktheu gabim; ylli u zbraz, numri u kthye në 0, u shfaq “Nuk u ruajt. Provo përsëri.” dhe SQL konfirmoi 0 rreshta. Trigger-i u hoq në bllokun finally; riprovimi pati sukses. Mekanizmi i refuzimit ndodhet vetëm në testet e izoluara, jo në aplikacionin e publikuar. Rezultati: kaloi në të dyja gjerësitë.

### Prova 3: Klikimet e përsëritura nuk krijojnë kopje.
Gjatë pritjes u provuan klikime të tjera: butoni i bllokuar nisi vetëm një POST. Pas suksesit u dërguan edhe tri POST për të njëjtin udhëtim. Të tria përfunduan pa kopje; SQL tregoi vetëm një rresht. Një identitet i falsifikuar në trupin e kërkesës nuk zëvendësoi identitetin e sesionit. Rezultati: kaloi në të dyja gjerësitë. Testi i shërbimit kontrollon gjithashtu ruajtje të përsëritura paralele.

## Ku gjendet puna
- `aplikacioni/src/components/Preferimi.tsx`: gjendja e konfirmuar, pamja optimiste, pritja, rikthimi dhe riprovimi.
- `aplikacioni/src/app/api/preferimet/route.ts`: GET/POST, kontrolli i origjinës dhe përgjigjet private pa cache.
- `aplikacioni/src/lib/preferimet.ts`: identiteti i sesionit, leximi personal dhe ruajtja idempotente.
- `aplikacioni/migrations/003-accounts-trips-favorites.sql`: skema e preferimeve, llogaritë lokale dhe menaxhimi i udhëtimeve.
- `aplikacioni/tests/week09.test.ts` dhe `aplikacioni/tests/week09.spec.ts`: prova të shërbimit/databazës dhe shfletuesit.
- Demonstrimi: https://rideshare-mobile-five.vercel.app/udhetimi/1
- Repository: https://github.com/art-cse/rideshare-mobile

## Çfarë mbetet për përmirësim
Heqja e preferimit është zgjerim opsional dhe nuk është zbatuar. Nëse lidhja ndërpritet pasi serveri e ruan preferimin, klienti mund të mos marrë konfirmimin; rifreskimi ose riprovimi e pajton gjendjen pa krijuar kopje. Prova manuale nga studenti dhe shpjegimi me kolegun mbeten për t'u bërë. Nuk është dërguar Issue apo koment te profesori.

## Ndihma nga AI (Artificial Intelligence – inteligjencë artificiale)
AI ndihmoi me debugimin, projektimin e arkitekturës, zbatimin e kodit dhe përgatitjen/ekzekutimin e testeve. Ndihma përfshiu ndarjen klient–server–databazë, rikthimin e gjendjes optimiste dhe mbrojtjen nga preferimet e dyfishta. Gjatë verifikimit u korrigjua një gabim në delimituesit SQL të migrimit dhe një provë shfletuesi ku hidratimi mund të rikthente vlerën e fushës së fshehur para dorëzimit. Rezultatet e raportuara janë prova automatike; nuk pretendohet verifikim personal manual që nuk është kryer.
