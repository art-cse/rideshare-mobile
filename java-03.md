# RideShare — Java 3

## Çfarë ndërtova

U implementuan lista, komponenti KartaUdhetimi, detajet sipas ID-së, kërkesa e simuluar dhe faqja e udhëtimit që mungon. Fillimisht u përdorën tri udhëtimet fiktive nga një koleksion i përbashkët. Verifikimi më poshtë u krye para kalimit në Neon; aplikacioni final vazhdon me Javët 4–5.

## Provat që bëra

### Prova 1: Lista në telefon

Pritej: saktësisht tri karta, pa scroll horizontal në 375px dhe veprime të paktën 44px. U vërejt: testi automatik në Edge me viewport 375×812 gjeti tri karta, gjerësinë brenda viewport-it dhe lidhjen e kartës të paktën 44px. CSS përdor tekst bazë 16px dhe veprime me min-height 44px. Kaloi. Lexueshmëria në telefon fizik nuk është provuar ende.

### Prova 2: Detajet e udhëtimit të dytë

Pritej: karta 2 hap /udhetimi/2 me 08:15, “Te stacioni kryesor” dhe 1 vend. U vërejt: të gjitha u konfirmuan nga testi i shfletuesit. Te 3 butoni “Nuk ka vende të lira” ishte disabled; qasja direkte në kërkesën e 3 shfaqi mungesën e vendeve. /udhetimi/99 dhe /udhetimi/99/kerkesa shfaqën “Udhëtimi nuk u gjet” dhe kthimin te lista. Kaloi me të dhënat fillestare.

### Prova 3: Kërkesa në pritje

Pritej: “Simulim: Në pritje”, asnjë rezervim dhe kthim te i njëjti udhëtim. U vërejt: nga karta 2 testi klikoi “Kërko vend”, gjeti titullin dhe tekstin se asnjë vend nuk u rezervua, u kthye te /udhetimi/2 dhe pastaj te lista me tri karta. Kaloi. Faqja nuk kryen shkrim në databazë.

## Çfarë do të përmirësoj

Të përsëriten të njëjtat prova kundër Neon pas konfigurimit, si dhe në telefon fizik. Nuk është provuar ende navigimi final me Neon sepse mungon DATABASE_URL. Testi ruhet te aplikacioni/tests/navigation.spec.ts. Nuk pretendohet provë personale nga studenti ose provë me koleg.

## Ku gjendet puna

https://github.com/art-cse/rideshare-mobile — kodi te aplikacioni/src/app, aplikacioni/src/components/KartaUdhetimi.tsx dhe aplikacioni/src/lib/udhetimet.ts. Raporti qëndron në rrënjë; nuk është bërë push ose dorëzim nga kjo punë.
