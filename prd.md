# PRD — Intermed Mobile

**Kursi:** Programimi për Pajisje Mobile · AAB · 2026/2027  
**Versioni:** 1.0 · 08.10.2026 · specifikim fillestar  
**Projekti individual:** kërkesa për termine në klinikën Intermed

Ky është plan produkti. Kodi i laboratorit në `aplikacioni/` zbaton RideShare
sipas ushtrimeve të përbashkëta; nuk pretendohet se është sistem klinikash.

## 1. Përdoruesi dhe problemi

Pacienti kërkon një shërbim dhe një orar të përshtatshëm. Recepsioni duhet
të organizojë kërkesat dhe të shmangë dy konfirmime për të njëjtin termin.
Hipoteza: telefonatat dhe mesazhet e shpërndara e bëjnë të paqartë nëse një
termin është vetëm kërkuar apo tashmë konfirmuar. Procesi real i klinikës
ende nuk është dokumentuar me intervista.

## 2. Evidenca dhe tri bisedat

Kërkimi publik më 08.10.2026 gjeti **Poliklinika Intermed SH.P.K. në
Podujevë**, Rr. Zahir Pajaziti nr. 90, të listuar për shërbime specialistike.
Ky është kandidati i përdorur për kërkimin; qyteti i synuar nga studenti
duhet konfirmuar. Burimet publike vërtetojnë listimin e biznesit, jo problemet
e brendshme të recepsionit ose rezultatet e intervistave.

Burime: [GjejeMjekun](https://gjejemjekun.com/klinika/poliklinika-intermed-sh-p-k-aktivitetet-e-mjekesise-se-specializuar-podujeve-gm-4f3-84f5c0)
dhe [Kompass](https://xk.kompass.com/c/poliklinika-intermed-sh-p-k/xk030698/).

Nuk janë raportuar intervista të kryera; nuk përfshihen citime të sajuara.

| Biseda e planifikuar | Pyetja | Evidenca që duhet regjistruar |
| --- | --- | --- |
| Pacient | Si e caktove vizitën e fundit dhe kur more konfirmim? | Hapat realë, koha e pritjes dhe pengesa |
| Recepsion | Si e regjistroni kërkesën dhe kontrolloni konfliktet? | Procesi aktual dhe një rast konkret pa identifikues pacienti |
| Mjek ose menaxher | Si ndryshon orari dhe kush e miraton terminin? | Përgjegjësitë dhe rregullat e anulimit |

Pas bisedave, hipotezat duhen rishikuar. Nuk publikohen emra pacientësh,
numra telefoni, diagnoza ose histori mjekësore.

## 3. Hipoteza e vlerës

Nëse pacienti sheh shërbimet, oraret dhe statusin e kërkesës në një vend,
atëherë do të ketë më pak paqartësi për konfirmimin dhe më pak kontakte të
përsëritura me recepsionin. Në test, të paktën 4 nga 5 pjesëmarrës duhet të
gjejnë një orar dhe të shpjegojnë saktë statusin pa ndihmë. Ky është objektiv,
jo rezultat i matur.

## 4. Rrjedha kryesore — pesë hapa

1. Pacienti zgjedh shërbimin nga lista.
2. Hap detajet dhe zgjedh një termin të lirë.
3. Dërgon kërkesën me të dhënat minimale të kontaktit.
4. Recepsioni pranon ose refuzon kërkesën pas kontrollit të orarit.
5. Pacienti sheh statusin: në pritje, konfirmuar ose refuzuar.

## 5. Kufijtë e MVP-së

**Brenda — tri funksione:**

1. Lista e shërbimeve dhe termineve me detaje.
2. Kërkesa për termin me status të qartë.
3. Shqyrtimi nga recepsioni dhe përditësimi i statusit.

**Jashtë:** pagesa, diagnoza ose këshilla mjekësore, dosje elektronike
pacientësh, biseda, video-konsulta dhe integrime me sigurime.

## 6. Kriteret e pranimit

- AC-1: Zgjedhja e një shërbimi hap vetëm detajet dhe oraret e tij.
- AC-2: Kërkesa fillon me statusin “Në pritje”; nuk paraqitet si konfirmim.
- AC-3: Dy kërkesa nuk mund të konfirmohen për të njëjtin termin. Konfirmimi
  kontrollon disponueshmërinë në databazë brenda një transaksioni.
- AC-4: Vetëm recepsioni i autorizuar mund të ndryshojë statusin; pacienti
  mund të lexojë vetëm kërkesat e veta.
- AC-5: Në 375 px nuk ka lëvizje horizontale; butonat kanë zonë prekëse të
  paktën 44 px. Pa lidhje shfaqet gabim i qartë dhe jo konfirmim i rremë.

Këto janë kritere të produktit të planifikuar; nuk deklarohen si të zbatuara
në ushtrimin RideShare të Javës 4.

## 7. Modeli minimal i të dhënave — PostgreSQL

```text
services(id, name, duration_minutes)
slots(id, service_id, starts_at, status)
requests(id, slot_id, patient_id, status, created_at)
profiles(id, role, display_name)
```

Statuset e kërkesës: pending, confirmed, rejected, cancelled. Qasja kërkon
autentikim dhe autorizim; një kufizim unik për konfirmimet aktive parandalon
konfliktet për `slot_id`. Në prototip përdoren vetëm të dhëna sintetike.

## 8. Rreziku dhe testi i ardhshëm

Rreziku kryesor është që pacienti ta ngatërrojë kërkesën me terminin e
konfirmuar. Testi: jepi pjesëmarrësit skicën, kërkoji të zgjedhë një termin
dhe pyete “A është rezervuar tashmë?”. Regjistro përgjigjen dhe përmirëso
mesazhin nëse statusi keqkuptohet. Testi me njerëz është ende në pritje.

