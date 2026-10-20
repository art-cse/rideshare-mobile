# RideShare — Java 5 · Hyrja dhe lejet

Statusi: implementimi është përgatitur; provat reale GitHub/Neon dhe dorëzimi nuk janë përfunduar.

## Çfarë ndërtova

NextAuth 4.24.15 përdor GitHub dhe sesione JWT dyorëshe. Identiteti vjen nga sub i token-it të verifikuar; profili pranon vetëm ID numerike. Roli lexohet nga Neon, kurse pronësia kontrollohet me shofer_id në UPDATE. Profili i ri është udhetar; roli nuk merret nga formulari. Paneli shfaq identitetin dhe formularin vetëm për shoferin. Server Action verifikon çdo shkrim dhe riavlerëson listën/detajet pas suksesit. Raporti dallon testet me sesione mock nga prova reale OAuth.

## Provat që bëra

### Prova 1: Hyrja, rifreskimi dhe dalja

Pritej: jashtë shfaqet “Hyr me GitHub”; pas hyrjes/rifreskimit mbeten emri dhe roli; pas daljes kërkohet hyrja përsëri. U vërejt: testi real i shfletuesit pa sesion shfaqi butonin e hyrjes dhe asnjë formular ndryshimi. **Nuk është provuar ende** hyrja, ruajtja e sesionit dhe dalja reale: mungojnë GITHUB_ID, GITHUB_SECRET dhe DATABASE_URL. Të konfigurohet OAuth sipas README dhe të kryhen të gjithë hapat.

### Prova 2: Shoferi ndryshon udhëtimin e vet

Pritej: pronari i 2 ruan 08:25; paneli, lista, detajet dhe Neon pajtohen; pastaj rikthehet 08:15. **Nuk është provuar ende me GitHub/Neon** për shkak të kredencialeve që mungojnë. Testi i izoluar PGlite me sesion mock numerik lejoi ndryshimin dhe rikthimin e 2. Pas hyrjes së parë, cakto manualisht rolin shofer/pronarin 2 nga ID e panelit dhe kryej provën reale.

### Prova 3: Veprimi pa leje refuzohet

Pritej: ndryshimi i hidden id nga 2 në 1 refuzohet dhe 1 mbetet 08:00 në Neon. **Nuk është provuar ende në DevTools me OAuth/Neon**. Në testin PGlite helper-i real refuzoi ID 1 dhe SQL konfirmoi 08:00. Testet me mock refuzuan edhe profilin fiktiv, udhëtarin, input-in e pavlefshëm, rolin e hequr midis leximit dhe UPDATE dhe sesionin e munguar pas daljes. Këto nuk janë prova të integrimit real. Të kryhet prova në DevTools pas konfigurimit; rifresko formularin te 2 dhe lëre 08:15.

## Ku gjendet puna

https://github.com/art-cse/rideshare-mobile

Skedarët: aplikacioni/schema-java05.sql, src/lib/auth.ts, src/lib/lejet.ts, src/types/next-auth.d.ts, src/components/Hyrja.tsx, src/app/api/auth/[...nextauth]/route.ts dhe src/app/panel/{actions.ts,page.tsx}. Lista ruan hyrjen publike. Nuk ka publikim në Vercel.

Kontrollet lokale: ESLint, TypeScript dhe build kaluan. Nëntë teste Vitest me PGlite/sesione mock kaluan. Prova e shfletuesit për panelin pa hyrje dhe gabimin e lidhjes kaloi në Edge në 375px. Sekreti i sesionit u gjenerua lokalisht pa shfaqje; .env.local është i përjashtuar nga Git.

## Çfarë mbetet për përmirësim

Të futen kredencialet vetëm në .env.local, të ekzekutohen të dy SQL-të në Neon dhe të kryhen tri provat reale. Kërkesa për vend mbetet simulim. Hapi i ardhshëm është verifikimi dhe dokumentimi i integrimit; nuk janë shtuar rezervime, pagesa ose funksione të javëve të mëvonshme. Nuk është kryer push, publikim ose dorëzim.
