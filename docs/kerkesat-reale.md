# Kërkesat reale dhe paneli i shoferit

## Rrjedha

- Hyrja ekzistuese GitHub vazhdon te `/panel`, që ridrejton udhëtarin te `/kerkesat` dhe shoferin te `/shofer` sipas rolit nga Neon.
- Nga detajet, “Dërgo kërkesë reale” hap `/udhetimi/[id]/kerko`. Kërkohen 1–8 vende, deri te numri aktual i vendeve të lira.
- Dërgimi krijon `pending`. Nuk ul vendet. Vetëm shoferi pronar mund të pranojë/refuzojë.
- Pranimi ul vendet dhe kalon në `accepted` në të njëjtin transaksion. Refuzimi kalon në `rejected`; udhëtari mund të anulojë vetëm `pending`, që kalon në `cancelled`.
- Një indeks unik pengon dy kërkesa aktive (`pending` ose `accepted`) për të njëjtin udhëtar/udhëtim. Pas refuzimit ose anulimit mund të kërkohet përsëri.
- “Kërko vend” te rrjedha e Javës 7 mbetet simulim. Vendtakimi dhe koordinatat e Javës 8 mbeten vetëm në faqen e telefonit dhe nuk dërgohen me kërkesën reale.

## Migrimi — aplikuar në Production me miratim

Më 05.11.2026 përdoruesi miratoi aplikimin e migrimit. Ai u ekzekutua me lidhjen direkte Neon; krahasimi para/pas konfirmoi që tri udhëtimet dhe dy profilet ekzistuese mbetën identike. Funksioni i miratimit ekziston dhe tabela e kërkesave ishte bosh. Përdoruesi zgjodhi veçmas të mos ndryshohen rolet ose pronësia e udhëtimeve. Nuk u caktua shofer i ri.

Migrimi është `aplikacioni/migrations/001-seat-requests.sql`. Ai krijon vetëm tabelën `kerkesat`, indekset dhe funksionin e veprimeve. Nuk fshin ose përditëson udhëtime/profile ekzistuese. Prerekuizitat janë tabelat ekzistuese nga `schema.sql` dhe `schema-java05.sql`; mos i riekzekuto pa nevojë në Production.

Pas miratimit, përdor Neon SQL Editor te databaza e lidhur me Vercel, ose `psql` me lidhje direkte private dhe `ON_ERROR_STOP`:

```powershell
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f aplikacioni/migrations/001-seat-requests.sql
```

Mos publiko lidhjen. Në SQL Editor ekzekuto të gjithë migrimin, përfshirë BEGIN/COMMIT. Migrimi është provuar dy herë radhazi në databazë testimi pa humbur kërkesën ekzistuese. Nëse përdoret një rol tjetër serveri nga pronari i migrimit, ai kërkon privilegjet e tabelave/sekuencës dhe EXECUTE për funksionin; mos ia jep PUBLIC ose shfletuesit. Funksioni është SECURITY INVOKER, jo SECURITY DEFINER.

Në instalime pa migrimin, faqet e kërkesave shfaqin “Kërkesat reale ende nuk janë aktivizuar.” Funksionet e mëparshme vazhdojnë të punojnë. Në Production migrimi është kryer, por caktimi i shoferit kërkon miratim të veçantë dhe është lënë i pandryshuar sipas zgjedhjes së përdoruesit.

## Caktimi i llogarisë reale si shofer

1. Hyr një herë me GitHub që profili të krijohet si `udhetar`. `/kerkesat` shfaq ID-në numerike nga sesioni GitHub.
2. Verifiko që ID-ja përputhet me fushën `id` të llogarisë së synuar në `https://api.github.com/users/EMRI_PUBLIK_GITHUB`. Mos përdor emrin e ekranit si identitet dhe mos vendos ID në kodin e aplikacionit.
3. Në Neon kontrollo `SELECT github_id, emri, roli FROM profilet` dhe `SELECT id, shofer_id FROM udhetimet`. Zgjidh vetëm një udhëtim të pacaktuar, ose një që tashmë i përket kësaj llogarie. Roli dhe pronësia janë dy caktime të veçanta.
4. Vetëm pas miratimit, administratori i databazës zëvendëson dy shenjat ilustruese më poshtë dhe ekzekuton transaksionin. Kodi refuzon profilin që nuk ekziston dhe nuk merr udhëtimin e një shoferi tjetër.

```sql
BEGIN;
DO $$
DECLARE
  verified_id text := 'YOUR_VERIFIED_NUMERIC_GITHUB_ID';
  chosen_trip text := 'YOUR_TRIP_ID';
BEGIN
  IF verified_id !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Verifiko ID numerike GitHub'; END IF;
  PERFORM 1 FROM profilet WHERE github_id = verified_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Llogaria duhet të hyjë fillimisht me GitHub'; END IF;
  PERFORM 1 FROM udhetimet WHERE id = chosen_trip
    AND (shofer_id IS NULL OR shofer_id = verified_id) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Udhëtimi mungon ose ka pronar tjetër'; END IF;
  UPDATE profilet SET roli = 'shofer' WHERE github_id = verified_id;
  UPDATE udhetimet SET shofer_id = verified_id WHERE id = chosen_trip;
END $$;
COMMIT;
```

Rifresko `/panel`: tani hapet `/shofer`. Nuk ka zgjedhës roli në ndërfaqe dhe nuk ka rol/panel administratori. Profilet demonstruese nuk mund të identifikohen si sesione GitHub reale.

## Siguria dhe konkurrenca

Çdo Server Action thërret `profiliIm()`, merr identitetin vetëm nga sesioni i verifikuar dhe kontrollon rolin. SQL e rikontrollon rolin dhe pronësinë. Leximet filtrohen sipas identitetit dhe rolit aktual në databazë, jo sipas një ID-je nga formulari.

Funksioni `rideshare_request_action` merr kyçet në rendin profil → udhëtim → kërkesë. Miratimet konkurruese për të njëjtin udhëtim presin kyçin e rreshtit dhe lexojnë numrin e fundit të vendeve. Nëse vendet nuk mjaftojnë, kthen `pa_vende` dhe kërkesa mbetet `pending`; ndërfaqja shfaq “Nuk ka vende të lira.” Nëse kërkesa është përfunduar, klikimi tjetër nuk ul vendet përsëri. Gabimi gjatë përditësimit të statusit anulon edhe zbritjen e vendeve.

Server Actions përdorin mbrojtjet e Next.js për origin/POST. Sekretet e databazës dhe NextAuth qëndrojnë në server. Preload-i i testeve nuk importohet në aplikacion dhe refuzon përdorimin në Vercel. Asnjë anashkalim autentikimi nuk është shtuar në kodin e aplikacionit.

Referenca: [PostgreSQL row locks](https://www.postgresql.org/docs/current/explicit-locking.html) dhe [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver).

## Provat e kryera

- Lint, TypeScript dhe build prodhimi kaluan pas korrigjimit të problemeve fillestare të tipizimit/lint-it.
- `npm test`: 26 teste kaluan; testi i konkurrencës me dy lidhje u anashkalua vetëm në variantin PGlite.
- Me PostgreSQL 17 të izoluar: 18/18 teste të kërkesave kaluan. Përfshijnë mungesën e sesionit, rolet, pronësinë, dublikatat, ID/vendet e pavlefshme, zbritjen vetëm në pranim, klikimet e përsëritura, dy kërkesat për vendin e fundit, garën pranim/anulim dhe rollback pas një gabimi të qëllimshëm në databazën e testit.
- Testi me dy lidhje PostgreSQL verifikoi `wait_event_type = Lock` për miratimin e dytë ndërsa i pari mbante transaksionin hapur; pas commit-it i dyti mori `pa_vende`.
- `requests-browser.spec.ts`: 10/10 në 375px/390px. U përdor dekodimi real NextAuth i JWT-ve të nënshkruara me sekret lokal testimi, jo hyrje reale në GitHub. Përfshihen formulari me ID të falsifikuar, humbja e sesionit para submit-it, paneli sipas rolit dhe statusi pas rifreskimit.
- Navigimi, paneli publik, PWA dhe Java 8: 26/26 kontrolle browser kaluan në databazën lokale.
- Testet ekzistuese të Javës 7: 6/6 kaluan me shkrimet e fixture-ve vetëm në databazën lokale.
- Pa databazë/OAuth: 20/20 kontrolle kaluan, duke përfshirë gabimin e databazës dhe faqen e pavarur të Javës 8.
- Në Vercel Production: 22/22 kontrolle publike kaluan për navigimin, panelin publik dhe Javën 8, përfshirë shfaqjen e koordinatave fiktive pas klikimit. Nuk u dërguan kërkesa reale ose koordinata personale.

Pas provave të izoluara, migrimi Production u aplikua vetëm pas miratimit të shprehur. Nuk u caktua rol, nuk u ndryshuan udhëtimet/profilet dhe nuk u krijuan kërkesa prove atje. Kodi i implementimit `268f377fc74cdfcabb46a281b6e288f575bd1b5a` u publikua në Vercel Production me gjendjen READY. Rezultatet e botit të profesorit dhe hyrja OAuth me dy llogari nuk janë pretenduar.

## Riprodhimi i testeve të izoluara

Nga `aplikacioni/`, me Docker të nisur, krijo vetëm databazën lokale:

```powershell
docker run --detach --name rideshare-requests-test --publish 127.0.0.1:55432:5432 --env POSTGRES_USER=rideshare_test --env POSTGRES_PASSWORD=local-test-only --env POSTGRES_DB=rideshare_test postgres:17-alpine
$env:RIDESHARE_LOCAL_POSTGRES='1'
npx.cmd vitest run tests/kerkesat.test.ts
npm.cmd run build
node --require ./tests/support/local-postgres.cjs node_modules/next/dist/bin/next start --port 3002
```

Në terminalin e dytë:

```powershell
$env:RIDESHARE_LOCAL_POSTGRES='1'
$env:PLAYWRIGHT_BASE_URL='http://localhost:3002'
npx.cmd playwright test tests/requests-browser.spec.ts --workers=1
```

Këto teste pastrojnë vetëm tabelën e kërkesave në databazën fikse `127.0.0.1:55432/rideshare_test`; nuk lexojnë DATABASE_URL nga `.env.local`. Mos i ekzekuto paralelisht me njëri-tjetrin. Në fund ndalo serverin me Ctrl+C dhe kontejnerin me `docker stop rideshare-requests-test`. Kredencialet ilustruese të testit nuk përdoren në Production.

## Provë manuale me dy llogari GitHub — ende në pritje

Pas miratimit dhe migrimit, prefero një mjedis prove me të njëjtën skemë:

1. Llogaria A hyn në një profil shfletuesi si udhëtar. Llogaria B hyn në një profil tjetër; administratori e cakton shofer të udhëtimit fiktiv të zgjedhur.
2. A hap detajet → “Dërgo kërkesë reale” → një vend → dërgo. Kontrollon “Në pritje”; numri i vendeve nuk ndryshon.
3. B hap `/shofer`, sheh emrin e A-së dhe pranon. Kontrollon statusin dhe uljen e vendeve; A rifreskon `/kerkesat` dhe sheh “Pranuar”.
4. Me një kërkesë tjetër fiktive provo refuzimin; me një kërkesë ende në pritje provo anulimin nga A. Asnjëra nuk ul vendet.
5. Për garën e vendit të fundit duhen dy udhëtarë dhe një shofer (ose fixture-t e automatizuara). Dy kërkesa mund të mbeten në pritje, por vetëm një miratohet.

Nuk ka njoftime push/email, anulim pas pranimit ose kthim automatik vendesh. Paneli pasqyron ndryshimet pas veprimit/rifreskimit, jo me realtime. Vendtakimi lokal nuk është pjesë e kërkesës reale.
