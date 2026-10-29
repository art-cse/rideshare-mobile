# RideShare — Java 5 · Hyrja dhe lejet

Statusi (29.10.2026): implementimi është në GitHub dhe Vercel. Neon dhe tabelat janë kontrolluar me SELECT, dhe Java 5 u dorëzua te Issue #753 me 5/5 kontrolle teknike; hyrja reale GitHub dhe provat e shkrimit me leje ende nuk janë përfunduar.

## Çfarë ndërtova

NextAuth 4.24.15 përdor GitHub dhe sesione JWT dyorëshe. Identiteti vjen nga sub i token-it të verifikuar; profili pranon vetëm ID numerike. Roli lexohet nga Neon, kurse pronësia kontrollohet me shofer_id në UPDATE. Profili i ri është udhetar; roli nuk merret nga formulari. Paneli shfaq identitetin dhe formularin vetëm për shoferin. Server Action verifikon çdo shkrim dhe riavlerëson listën/detajet pas suksesit. Raporti dallon testet me sesione mock nga prova reale OAuth.

## Provat që bëra

### Prova 1: Hyrja, rifreskimi dhe dalja

Pritej: jashtë shfaqet “Hyr me GitHub”; pas hyrjes/rifreskimit mbeten emri dhe roli; pas daljes kërkohet hyrja përsëri. U vërejt: testi real i shfletuesit pa sesion shfaqi butonin e hyrjes dhe asnjë formular ndryshimi. **Nuk është provuar ende** hyrja, ruajtja e sesionit dhe dalja reale: GITHUB_ID dhe GITHUB_SECRET tani janë vendosur në Vercel Production dhe u bë një redeploy i suksesshëm. Faqja publike e hyrjes ktheu HTTP 200, por hyrja/ruajtja/dalja me llogari të vërtetë ende duhet provuar.

### Prova 2: Shoferi ndryshon udhëtimin e vet

Pritej: pronari i 2 ruan 08:25; paneli, lista, detajet dhe Neon pajtohen; pastaj rikthehet 08:15. **Nuk është provuar ende me GitHub/Neon** sepse ende nuk është kryer një hyrje reale GitHub dhe nuk ka sesion real shoferi. Testi i izoluar PGlite me sesion mock numerik lejoi ndryshimin dhe rikthimin e 2. Pas hyrjes së parë, cakto manualisht rolin shofer/pronarin 2 nga ID e panelit dhe kryej provën reale.

### Prova 3: Veprimi pa leje refuzohet

Pritej: ndryshimi i hidden id nga 2 në 1 refuzohet dhe 1 mbetet 08:00 në Neon. **Nuk është provuar ende në DevTools me OAuth/Neon**. Në testin PGlite helper-i real refuzoi ID 1 dhe SQL konfirmoi 08:00. Testet me mock refuzuan edhe profilin fiktiv, udhëtarin, input-in e pavlefshëm, rolin e hequr midis leximit dhe UPDATE dhe sesionin e munguar pas daljes. Këto nuk janë prova të integrimit real. Të kryhet prova në DevTools pas konfigurimit; rifresko formularin te 2 dhe lëre 08:15.

## Ku gjendet puna

https://github.com/art-cse/rideshare-mobile

Skedarët: aplikacioni/schema-java05.sql, src/lib/auth.ts, src/lib/lejet.ts, src/types/next-auth.d.ts, src/components/Hyrja.tsx, src/app/api/auth/[...nextauth]/route.ts dhe src/app/panel/{actions.ts,page.tsx}. Lista ruan hyrjen publike. Produksioni: https://rideshare-mobile-five.vercel.app (deploy READY dhe DATABASE_URL është i pranishëm; GitHub OAuth është konfiguruar me variabla private në Production, por hyrja reale nuk është provuar).

Kontrollet lokale: ESLint, TypeScript dhe build kaluan. Nëntë teste Vitest me PGlite/sesione mock kaluan. Prova e shfletuesit për panelin pa hyrje dhe gabimin e lidhjes kaloi në Edge në 375px. Sekreti i sesionit u gjenerua lokalisht pa shfaqje; .env.local është i përjashtuar nga Git.

## Çfarë mbetet për përmirësim

Kredencialet GitHub OAuth tani janë në Vercel Production; mbetet konfigurimi lokal nëse kërkohen prova me localhost, hyrja reale, tri provat e lejeve dhe regjistrimi i rezultateve. Tabelat profilet dhe udhetimet ekzistojnë në Neon; mos ekzekuto rishtazi SQL pa kontrolluar të dhënat ekzistuese. Kërkesa për vend mbetet simulim. Hapi i ardhshëm është verifikimi dhe dokumentimi i integrimit; nuk janë shtuar rezervime, pagesa ose funksione të javëve të mëvonshme. Kodi është dërguar në GitHub dhe publikuar në Vercel; dorëzimi Java 5 është kryer te https://github.com/arbenl/arbenl-mobile-assignments-2026-2027/issues/753 (5/5 kontrolle teknike, jo notë).

## Verifikimi i prodhimit · 22.10.2026

https://rideshare-mobile-five.vercel.app u hap pa llogari Vercel (HTTP 200). Vercel ka NEXTAUTH_SECRET dhe NEXTAUTH_URL të prodhimit; mungojnë GITHUB_ID/GITHUB_SECRET dhe DATABASE_URL. Paneli publik pa hyrje dhe mungesa e formularit u verifikuan në 375px/390px. Hyrja GitHub, rifreskimi i sesionit, dalja dhe shkrimet e autorizuara/pa leje në Neon nuk janë provuar ende. Nuk ka ID GitHub të verifikuar nga një hyrje reale në këtë aplikacion. Nëntë teste të izoluara kaluan sërish; ato nuk provojnë integrimin real.

## Verifikimi i rifreskuar · 29.10.2026

- Deployment-i Vercel i commit-it `ab3af5b95346785ab5d3b4385b49d66fd4f572be` është `READY` në Production. Kjo verifikon publikimin, jo suksesin e autentikimit apo të testeve interaktive.
- Në Production janë të pranishme `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`; `GITHUB_ID` dhe `GITHUB_SECRET` mungojnë.
- Neon projekti `rideshare-java4`: tabelat `udhetimet` dhe `profilet` ekzistojnë. Leximi SQL konfirmoi ID 1 = 08:00 (pronari `DEMO-SHOFER-2`), ID 2 = 08:15 (pa pronar), ID 3 = 07:45 (pa pronar). Ekziston vetëm një profil `shofer`, ai demonstrues. Nuk ka ende profil të krijuar nga hyrja reale në këtë aplikacion.
- Vercel nuk ktheu grupe gabimesh runtime gjatë shtatë ditëve të fundit. Mungesa e gabimeve të regjistruara nuk është provë funksionale.
- Veprimet në Neon ishin **vetëm SELECT**; asnjë orar, profil, rol ose pronësi nuk u ndryshua.
- Mbetet të krijohet/konfigurohet OAuth App për adresën HTTPS të prodhimit, të kryhet hyrja reale dhe më pas, me ID-në numerike të përdoruesit të verifikuar, të caktohet pronari i udhëtimit 2. Provat interaktive nuk shënohen si të kaluara.

## Ndihma nga AI

AI ndihmoi me zbatimin dhe verifikimin e kodit, provat e izoluara të mëparshme dhe kontrollin read-only të GitHub, Neon dhe Vercel; provat reale të hyrjes dhe të lejeve mbeten të pakryera.

## Verifikimi pas konfigurimit OAuth · 29.10.2026

- `GITHUB_ID` dhe `GITHUB_SECRET` janë ruajtur si variabla private në Vercel **Production**. Vlerat nuk u lexuan ose publikuan.
- U nis redeploy i të njëjtit commit `fe64ebb00f977f498173312250ebe370f642319e`: deployment `dpl_59stmw5e2GHLoZKCLBwJM11Uua91` përfundoi **READY** dhe u lidh me domenin kryesor.
- Rrugët `/api/auth/signin/github`, `/api/auth/providers`, `/api/auth/session` dhe `/panel` kthyen HTTP 200. Për një klient pa hyrje, `/api/auth/session` ktheu `{}`, që është sjellje e pritshme.
- Përdoruesi duhet të klikojë `Hyr me GitHub` në `/panel` dhe të miratojë hyrjen në GitHub. Vetëm kjo provon callback-un dhe krijon profilin real në Neon. Më pas caktohet roli/udhëtimi 2 dhe bëhen provat 08:25/08:15 dhe refuzimi i ID 1.
- Kontrolli automatik i dorëzimit të Javës 5 në [Issue #753](https://github.com/arbenl/arbenl-mobile-assignments-2026-2027/issues/753) raportoi **5/5**, por nuk kryen teste funksionale.
