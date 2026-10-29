# rideshare-mobile

## Repository i përbashkët i dorëzimeve

Ky është repository kryesor për dorëzimet e lëndës dhe aplikacionin në Vercel. Dokumentet e Javës 1, skica RideShare dhe shënimet e Javës 2 janë bartur nga `art-cse/Intermed-mobile`. Ai repository ruan historikun e mëparshëm. Dokumentet `exit-ticket.md` dhe `prd.md` përshkruajnë projektin individual Intermed; kodi i laboratorit vazhdon të jetë RideShare.


**Produksioni:** https://rideshare-mobile-five.vercel.app

**Gjendja e rifreskuar më 29.10.2026:** Vercel Production është READY për kodin e Javës 6. DATABASE_URL, NEXTAUTH_SECRET dhe NEXTAUTH_URL ekzistojnë në Vercel; mungojnë GITHUB_ID dhe GITHUB_SECRET. Neon `rideshare-java4` u kontrollua me SELECT dhe përmban tri udhëtimet fiktive në orët 08:00, 08:15 dhe 07:45. Kërkesa HTTP reale `/api/udhetimet` ktheu HTTP 200 me tri udhëtimet; manifesti, service worker, lexuesi offline dhe të dy ikonat gjithashtu kthyen HTTP 200. Kjo nuk provon ende funksionimin PWA pa internet. Lidhja lokale DATABASE_URL mbetet e paverifikuar. Nuk u ndryshuan të dhëna në databazë.

Aplikacioni i përbashkët RideShare për laboratorët AAB, Javët 3–5. Nuk është projekti individual i biznesit. Ndërfaqja është në shqip; kërkesat për vend mbeten simulim, pa rezervime reale.

Repository: https://github.com/art-cse/rideshare-mobile

## Nisja lokale (e detyrueshme)

Përdor Node.js 24 LTS (mjedisi i kontrolluar: 24.15.0) dhe npm. Next.js kërkon të paktën 20.9; mjetet aktuale të provave kërkojnë Node 22.12 ose më të ri. Aplikacioni është vetëm te `aplikacioni/`, me App Router, TypeScript, ESLint, CSS dhe aliasin `@/*`.

```powershell
cd aplikacioni
npm.cmd ci
npm.cmd run dev -- --port 3000
```

Hap http://localhost:3000. Në Windows `npm.cmd` shmang kufizimin e PowerShell për `npm.ps1`; në sisteme të tjera përdor `npm`. Nëse porta është e zënë, ndalo procesin përkatës; mos ndrysho portën pa përditësuar edhe OAuth/NEXTAUTH_URL.

## Konfigurimi privat

Krijo/redakto `aplikacioni/.env.local`, pranë `package.json`, vetëm lokalisht. Mos i dërgo kredencialet në chat. Skedari lokal aktual ka një `NEXTAUTH_SECRET` të gjeneruar në mënyrë të sigurt dhe `NEXTAUTH_URL`; ruaji ato. Shto lidhjen reale Neon dhe kredencialet OAuth nga llogaritë e tua. Këto janë vetëm emra dhe vlera ilustruese, jo kredenciale funksionale:

```text
DATABASE_URL="LIDHJA_POSTGRESQL_NGA_NEON"
GITHUB_ID="CLIENT_ID_I_OAUTH_APP"
GITHUB_SECRET="CLIENT_SECRET_I_OAUTH_APP"
NEXTAUTH_SECRET="SEKRET_RASTESOR_LOKAL"
NEXTAUTH_URL="http://localhost:3000"
```

Për një klon të ri, kjo komandë nga `aplikacioni/` shton sekretin pa e shfaqur dhe pa zëvendësuar një sekret ekzistues:

```powershell
node -e "const fs=require('fs'),c=require('crypto'),p='.env.local';const s=fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';if(!/^NEXTAUTH_SECRET=.+/m.test(s))fs.appendFileSync(p,'\nNEXTAUTH_SECRET='+c.randomBytes(32).toString('base64')+'\n');"
```

Mos përdor `NEXT_PUBLIC_` për sekrete. Mos i fut në kod, raporte, fotografi ose commit. `.env*`, `node_modules` dhe `.next` janë të përjashtuara. Kontrollo me `git check-ignore .env.local` nga aplikacioni. Rinis serverin pas ndryshimit të konfigurimit. Mungesa e Neon shfaq gabim lidhjeje; nuk ka të dhëna rezervë të hardkoduara.

## Neon dhe SQL

Rruga e preferuar e kursit: në Vercel Storage/Marketplace zgjidh Neon, planin Free dhe emrin `rideshare-java4`, pastaj Connect Project. Përdor të njëjtën degë gjatë laboratorit; shmang degët automatike për çdo deployment. Alternativë: krijoje drejtpërdrejt në Neon Console dhe kopjo Connection string në `.env.local`. Nëse databaza ekziston në llogarinë tënde, ripërdore; mungesa e konfigurimit këtu nuk provon se databaza nuk ekziston. Mos krijo dublikatë. Qasja në Neon dhe konfigurimi i kredencialeve mbeten të nevojshme.

Në SQL Editor të degës që përputhet me DATABASE_URL ekzekuto, sipas radhës:

1. `aplikacioni/schema.sql` — tabela dhe tri udhëtimet fiktive.
2. `aplikacioni/schema-java05.sql` — profilet dhe pronësia.

Riekzekutimi nuk dyfishon rreshtat dhe nuk rivendos ndryshimet ekzistuese. Udhëtimi 1 i caktohet `DEMO-SHOFER-2` vetëm kur pronari është NULL. Ky profil fiktiv nuk mund të hyjë; serveri pranon vetëm identitet numerik nga sesioni GitHub.

## GitHub OAuth dhe roli

Në GitHub → Settings → Developer settings → OAuth Apps krijo aplikacionin lokal:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
- NEXTAUTH_URL: `http://localhost:3000`

Mos përziej `localhost` me `127.0.0.1`. Vendos Client ID dhe Client Secret në GITHUB_ID/GITHUB_SECRET lokalisht. Përdoret saktësisht `next-auth@4.24.15`, me sesion JWT dyorësh.

Hyr te `/panel` një herë: krijohet profili me rolin `udhetar`. Kopjo numrin **ID ime GitHub** nga paneli. Ai nuk është Client ID i OAuth App. Në Neon zëvendëso `ID_NUMERI_NGA_PANELI` me atë numër të verifikuar:

```sql
UPDATE profilet SET roli = 'shofer' WHERE github_id = 'ID_NUMERI_NGA_PANELI';
UPDATE udhetimet SET shofer_id = 'ID_NUMERI_NGA_PANELI' WHERE id = '2';
SELECT id, ora, shofer_id FROM udhetimet ORDER BY id;
```

Rifresko panelin. Vetëm udhëtimi 2 caktohet te profili yt; 1 mbetet te shoferi fiktiv. Nuk ka buton publik për ngritjen e rolit. Serveri lexon rolin aktual për çdo shkrim, kontrollon formatin e orës/ID-së dhe kufizon UPDATE me pronarin plus EXISTS për rolin shofer. Suksesi kërkon saktësisht një rresht nga RETURNING.

## Demonstrimi dhe provat reale që mbeten

1. Lista: tri karta në 375px; kliko kartën 2, kontrollo 08:15, vendtakimin dhe një vend të lirë. Kalo te kërkesa dhe kthehu. Kontrollo udhëtimin 3 dhe `/udhetimi/3/kerkesa`; provo edhe ID 99 në detaje e kërkesë.
2. Në Neon: `UPDATE udhetimet SET ora = '08:25' WHERE id = '2';`. Rifresko listën dhe detajet. Rikthe `08:15` dhe kontrollo të dyja përsëri.
3. Vetëm te `lexoUdhetimet()` shto përkohësisht `WHERE false` përpara `ORDER BY id`. Prit “Nuk ka udhëtime për momentin.” Hiqe dhe verifiko tri kartat. Mos fshi rreshta.
4. Riemërto përkohësisht DATABASE_URL në DATABASE_URL_PA_TEST, rinis serverin dhe kontrollo “Nuk u lidhëm me databazën. Provo përsëri.” Rikthe emrin, rinis dhe kontrollo rikuperimin. Verifiko që `.env.local` është ende i përjashtuar nga Git.
5. Te `/panel`, pa hyrë pritet “Hyr me GitHub”. Hyr, rifresko (sesioni duhet të mbetet), dil (duhet të kërkohet hyrja përsëri).
6. Hyr si shofer/pronar i 2: ruaj 08:25. Kontrollo panelin, listën, detajet dhe Neon. Rikthe 08:15.
7. Në DevTools ndrysho input-in e fshehur `id` nga 2 në 1. Ruaj: pritet “Nuk ke leje…”. Në Neon verifiko se 1 mbeti 08:00. Rifresko formularin dhe lëre 2 në 08:15.

Shtesë opsionale: hiq rolin në Neon duke mbajtur formularin hapur, pastaj provo ruajtjen; rikthe rolin. Dil në një skedë dhe dërgo formularin e vjetër nga tjetra; pritet hyrja. Mund të provosh edhe vendet e 1 nga 2 në 0, pastaj rikthe 2.

## Kontrollet automatike

Nga `aplikacioni/`:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

`npm test` ekzekuton PostgreSQL të izoluar me PGlite dhe sesione të simuluara (mock). Teston SQL-në reale të helper-ëve, kufizimet, pronësinë, rolin, input-et dhe gabimet. **Nuk provon OAuth ose Neon real.**

Me serverin lokal aktiv dhe Microsoft Edge të instaluar:

```powershell
# Vetëm kur DATABASE_URL mungon:
npm.cmd run test:browser -- tests/unconfigured.spec.ts
# Pas konfigurimit të Neon me tri udhëtimet dhe oraret fillestare:
npm.cmd run test:browser -- tests/navigation.spec.ts
```

Për verifikimin e URL-së reale, nga aplikacioni/ në PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL='https://rideshare-mobile-five.vercel.app'
npm.cmd run test:browser -- tests/navigation.spec.ts
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

Konfigurimi ekzekuton secilin skenar në viewport 375×844 dhe 390×844. Këto janë prova në shfletues, jo në telefon fizik. Në kontrollin e 22.10.2026, dy provat e navigimit në prodhim dështuan te kërkesa për tri karta (u gjetën zero). Dy provat e gjendjes pa databazë/panelit pa hyrje kaluan. ESLint, TypeScript, nëntë teste të izoluara dhe build kaluan. Asnjë kusht i përkohshëm nuk u aktivizua në prodhim.

Këto dy skenarë kërkojnë konfigurime të ndryshme; mos i ekzekuto bashkë. Për një shfletues tjetër përshtat `channel` në `playwright.config.ts`. Prova e navigimit kaloi para zëvendësimit të të dhënave fikse; ende duhet përsëritur kundër Neon.

## Shpjegime të shkurtra për klasë

- **Komponent i ripërdorshëm:** `KartaUdhetimi` merr një udhëtim dhe vizaton të njëjtën strukturë; key është ID-ja e qëndrueshme.
- **Rrugë dinamike:** `[id]` merr ID-në nga adresa. `params` pritet me await dhe udhëtimi kërkohet nga burimi i përbashkët.
- **Burim i përbashkët:** `udhetimet.ts` lexon Neon për listën, detajet dhe kërkesën. `force-dynamic` lexon në hapje/rifreskim, jo sinkronizim në kohë reale.
- **Server-only:** lidhja dhe SQL qëndrojnë në server. Tagged templates parametrizojnë vlerat dhe shmangin bashkimin e input-it në SQL.
- **Bosh kundrejt gabimit:** zero rreshta është përgjigje e vlefshme; lidhja e dështuar jep mesazh tjetër. ID që mungon thërret notFound jashtë try/catch.
- **Autentikim:** GitHub vërteton kush je. **Autorizim:** serveri vendos nëse lejohet ndryshimi.
- **Sesion:** identitet i verifikuar në JWT, me afat dy orë. **Rol:** leja aktuale nga Neon. **Pronësi:** shofer_id duhet të jetë ID e sesionit. Fshehja e formularit nuk e zëvendëson kontrollin në server.

## Publikimi në Vercel

Projekti ekzistues është `arti-fbfc/rideshare-mobile`, i lidhur me GitHub `art-cse/rideshare-mobile`, dega e prodhimit `main`. Framework është Next.js, Root Directory është `aplikacioni`, Node është 24.x dhe komandat e build/install përdorin zbulimin standard për npm/Next.js. Vendos DATABASE_URL në mjediset përkatëse (Development/Production, Preview vetëm nëse nevojitet) dhe bëj Redeploy pas konfigurimit.

Për prodhim krijo OAuth App tjetër me URL HTTPS të qëndrueshme dhe callback `/api/auth/callback/github`. Vendos GITHUB_ID dhe GITHUB_SECRET në Vercel Production, pa i shpërndarë. NEXTAUTH_SECRET dhe NEXTAUTH_URL të prodhimit janë të pranishëm; mos i ndrysho pa nevojë. Mos përdor URL Preview që ndryshon. Aplikacioni është publikuar; integrimi Neon për lexim është verifikuar me GET `/api/udhetimet` në prodhim; hyrja GitHub OAuth dhe shkrimet me leje nuk janë verifikuar.

## Raportet dhe dorëzimi

Raportet `java-03.md`, `java-04.md`, `java-05.md` dhe `java-06.md` qëndrojnë pranë këtij README. `java-02.md` dhe skica janë ruajtur pa ndryshim. `package.json` lejohet në rrënjë ose brenda `aplikacioni/`; këtu është brenda aplikacionit. Të dy SQL-të dhe `package-lock.json` janë pranë tij. Mos përfshi `.env*`, `node_modules` ose `.next` në commit.

Çdo javë kërkon dorëzim më vete me të njëjtin repository personal. Kontrolli automatik kërkon repository publik; për privat merret vesh dorëzimi me profesorin. Nga llogaria GitHub që zotëron repository-n, përdor [formularin](https://github.com/arbenl/arbenl-mobile-assignments-2026-2027/issues/new?template=mobile-submission.yml), zgjidh Javën përkatëse (Java 1–6) dhe vendos vetëm `https://github.com/art-cse/rideshare-mobile`, jo localhost, Vercel ose link skedari.

Lexo komentin “Kontrolli automatik i dorëzimit”. Pas korrigjimeve dhe push-it, komento vetëm `rikontrollo` në Issue-n ekzistuese të asaj jave. Mos krijo dublikatë. Pesë kontrolle teknike të kaluara nuk provojnë funksionimin dhe nuk janë nota. Dorëzimi gjatë laboratorit është synim; lejohet gjatë javës dhe afatin përfundimtar e përcakton profesori. Konfirmimi QR i pranisë është i veçantë.

Kodi është ruajtur në GitHub dhe është publikuar në Vercel. Issue-t e Java 1–4 janë krijuar dhe kontrolli automatik raportoi 2/2, 2/2, 5/5 dhe 5/5; këto janë kontrolle teknike, jo nota. Java 5 është dorëzuar te [Issue #753](https://github.com/arbenl/arbenl-mobile-assignments-2026-2027/issues/753) dhe Java 6 te [Issue #754](https://github.com/arbenl/arbenl-mobile-assignments-2026-2027/issues/754). Bot-i dha 5/5 kontrolle teknike për të dyja më 29.10.2026; kjo nuk është notë ose provë që OAuth/offline punojnë. Provat reale të Javëve 4–6 mbeten për t'u plotësuar.

Materiali i kursit: [Java 3](https://arbenl.github.io/lendet/2026-2027/mobile/java-03/ushtrimet.html), [Java 4](https://arbenl.github.io/lendet/2026-2027/mobile/java-04/ushtrimet.html), [Java 5](https://arbenl.github.io/lendet/2026-2027/mobile/java-05/ushtrimet.html), [nisja](https://arbenl.github.io/lendet/2026-2027/mobile/nis-projektin.html), [dorëzimet](https://arbenl.github.io/lendet/2026-2027/mobile/dorezimet.html).

## Hapat e mbetur për aktivizimin real

1. Neon `rideshare-java4` dhe tri udhëtimet e sakta ekzistojnë; mos krijo databazë tjetër. DATABASE_URL është tashmë i vendosur në Vercel Production/Development. Për prova lokale konfiguro lidhjen në `aplikacioni/.env.local` vetëm në pajisjen tënde; mos dërgo sekretet në chat.
2. Krijo ose përdor OAuth App të veçantë për prodhim te GitHub Settings → Developer settings → OAuth Apps. Homepage: `https://rideshare-mobile-five.vercel.app`; callback: `https://rideshare-mobile-five.vercel.app/api/auth/callback/github`. Vendos GITHUB_ID dhe GITHUB_SECRET të këtij aplikacioni vetëm në Vercel Production. Për localhost përdor OAuth App tjetër dhe vlerat lokale përkatëse.
3. Tabelat `udhetimet` dhe `profilet` ekzistojnë; mos riekzekuto migrimet pa një kontroll paraprak. Bëj redeploy pasi të shtosh OAuth. Hyr realisht për të krijuar profilin `udhetar`, pastaj përdor ID-në numerike nga paneli për caktimin manual të rolit/pronarit 2.
4. Kryej provat reale të dokumentuara më sipër dhe tri provat PWA të Javës 6. Vlerat e Neon tani janë: ID 1 = 08:00 te shoferi fiktiv, ID 2 = 08:15 pa pronar, ID 3 = 07:45 me zero vende. Rikthe gjendjen fillestare pas testimit.

## Kontrolli i shkurtër në telefon

Pas konfigurimit: hap URL-në publike në një sesion të ri; shiko tri kartat pa lëvizje anash; hap 2 → Kërko vend → kthehu; provo 3 dhe ID 99; hyr me GitHub dhe rifresko; si pronar i 2 ruaj 08:25 dhe rikthe 08:15; dil dhe kontrollo kërkesën për hyrje. Kjo listë duhet kryer personalisht në telefon; nuk është shënuar si e kryer.


## Java 6 · PWA (statusi i fundit)

Kodin e Javës 6 e përmban commit-i `ab3af5b`; manifesti, ikonat, API publike, service worker, lexuesi offline dhe regjistrimi në layout janë në repository. Deploy i këtij commit-i rezultoi READY në Vercel. Raporti `java-06.md` dallon kontrollin e kodit/deployment-it nga provat reale që mbeten: lista e ruajtur me internet, rifreskimi offline dhe përditësimi pas rikthimit të lidhjes. U verifikuan drejtpërdrejt me GET në Vercel manifesti, ikonat, service worker, lexuesi offline dhe API-ja e tri udhëtimeve (HTTP 200). `aplikacioni/tests/pwa.spec.ts` është një skenar automatik Playwright i ri për cache, rifreskimin offline dhe rikthimin e lidhjes. **Nuk është ekzekutuar ende** dhe nuk zëvendëson provën manuale 08:15 → 08:25 → 08:15. Asnjë test interaktiv i pambajtur nuk shënohet i kaluar.

Komanda në PowerShell nga `aplikacioni/`:

```powershell
$env:PLAYWRIGHT_BASE_URL='https://rideshare-mobile-five.vercel.app'
npm.cmd run test:browser -- tests/pwa.spec.ts
Remove-Item Env:PLAYWRIGHT_BASE_URL
```


## Hyrja GitHub OAuth: veprimi që kërkon llogarinë tënde

GitHub OAuth App për Production duhet krijuar nga pronari i llogarisë te https://github.com/settings/developers → OAuth Apps → New OAuth App. Nuk ka veprim të disponueshëm të GitHub API në këtë integrim për ta krijuar automatikisht.

- Application name: `RideShare AAB Production`
- Homepage URL: `https://rideshare-mobile-five.vercel.app`
- Authorization callback URL: `https://rideshare-mobile-five.vercel.app/api/auth/callback/github`

Pasi të krijohet, vendos Client ID si `GITHUB_ID` dhe Client Secret si `GITHUB_SECRET` në Vercel → rideshare-mobile → Settings → Environment Variables për **Production**, pa i publikuar në GitHub, chat ose raporte. Vercel kërkon redeploy të prodhimit që të marrë variablat e reja. `NEXTAUTH_URL` dhe `NEXTAUTH_SECRET` tashmë ekzistojnë dhe nuk duhen zëvendësuar.

Hyr te `/panel` për të krijuar profilin real `udhetar`, konfirmo ID-në numerike të GitHub në panel dhe vetëm pas kësaj cakto pronësinë e udhëtimit 2 nga Neon. Të mos improvizohet profil apo leje pa hyrjen e verifikuar.
