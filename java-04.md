# RideShare — Java 4 · Neon dhe PostgreSQL

Statusi: implementimi lokal është përgatitur; raporti nuk është dorëzim i përfunduar. Provat reale Neon mbeten në pritje të konfigurimit.

## Çfarë ndërtova

Lista, detajet dhe simulimi lexojnë me await nga helper-ët server-only. getSql përdor DATABASE_URL dhe Neon driver. SQL është e parametrizuar; faqet përdorin force-dynamic. Mesazhet për zero rreshta, lidhje të dështuar dhe ID që mungon janë të dallueshme. schema.sql ka kufizimet për orën/vendet dhe tri rreshtat fiktivë; riekzekutimi nuk i rivendos ndryshimet. Nuk ka fallback të hardkoduar.

## Provat që bëra

### Prova 1: Ndryshimi në databazë shfaqet në aplikacion

Pritej: 2 ndryshon 08:15 → 08:25 në listë dhe detaje pas rifreskimit; pastaj rikthehet 08:15. **Nuk është provuar ende në Neon**: mungon DATABASE_URL. Hapat: ekzekuto schema.sql, pastaj UPDATE në SQL Editor, rifresko të dyja faqet, rikthe orën dhe kontrollo përsëri. Testi i izoluar PGlite konfirmoi leximin 08:25 nga helper-i dhe ruajtjen gjatë riekzekutimit të SQL-së; kjo nuk provon Neon ose shfletuesin e lidhur me Neon.

### Prova 2: Lista bosh dhe rikthimi

Pritej: me WHERE false vetëm te lexoUdhetimet shfaqet “Nuk ka udhëtime për momentin.”; pas heqjes kthehen tri karta. **Nuk është provuar ende**: pa lidhje Neon nuk mund të vërehet ky skenar real. Të shtohet përkohësisht WHERE false përpara ORDER BY id, të rifreskohet lista dhe të hiqet kushti pa fshirë rreshtat. Kodi final nuk përmban WHERE false.

### Prova 3: Lidhja mungon, rikthimi dhe siguria

Pritej: gabim i qartë kur mungon DATABASE_URL dhe rikuperim pas rikthimit. U vërejt: pa DATABASE_URL, testi i shfletuesit në 375px konfirmoi “Nuk u lidhëm me databazën. Provo përsëri.” në listë, detaje dhe kërkesë, pa karta rezervë. `git check-ignore .env.local` konfirmoi përjashtimin. **Nuk është provuar ende** riemërtimi/rikthimi i një lidhjeje funksionale dhe rinisja, sepse nuk ka kredenciale Neon. Pasi të konfigurohet, ndiq Provat 3–4 në README dhe verifiko rikuperimin.

## Ku gjendet puna

https://github.com/art-cse/rideshare-mobile

SQL: aplikacioni/schema.sql. Kodi: src/lib/db.ts, src/lib/udhetimet.ts dhe tri faqet te aplikacioni/src/app. Paketat dhe lockfile janë te aplikacioni/. Verifikimi i SQL-së gjendet te aplikacioni/tests/lejet.test.ts. Nuk ka URL publikimi.

## Çfarë mbetet për përmirësim

Të lidhet Neon, të kryhen tri provat reale dhe të rikontrollohen 3/99. Navigimi 3/99 kaloi në Javën 3 para migrimit; rreshti i panjohur u kontrollua edhe në PGlite. Kërkesa “Në pritje” mbetet simulim; nuk ka rezervim real. Pas provave të dokumentohen rezultatet e vërejtura dhe të përgatitet dorëzimi.
