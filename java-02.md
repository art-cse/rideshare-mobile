# RideShare — Java 2

**Shkurtesat:** MVP (Minimum Viable Product – produkti minimal i përdorshëm); AI (Artificial Intelligence – inteligjencë artificiale).

## 1. Problemi
Studentët që udhëtojnë për në AAB mund të kenë shpenzime të larta transporti dhe orare të autobusëve që nuk përputhen me ligjëratat. Ata e kanë të vështirë të gjejnë studentë të tjerë që udhëtojnë në të njëjtin drejtim dhe në të njëjtën kohë. RideShare synon t’i ndihmojë të ndajnë udhëtimin dhe shpenzimet.

## 2. Përdoruesit
- Shoferi dëshiron të ndajë shpenzimet e udhëtimit dhe të gjejë udhëtarë për vendet e lira në veturë.
- Udhëtari dëshiron të gjejë një udhëtim të përshtatshëm për në AAB, të shohë orën, pikën e takimit dhe çmimin, si dhe të kërkojë një vend lehtësisht.

## 3. Tri ekranet
1. Lista e udhëtimeve: Shfaq udhëtimet për në AAB me vendnisjen, datën, orën, çmimin për person dhe numrin e vendeve të lira. Udhëtari zgjedh një udhëtim për të parë detajet.
2. Detajet e udhëtimit: Shfaq emrin e shoferit, pikën e takimit, destinacionin, datën, orën, çmimin dhe vendet e lira. Butoni “Kërko një vend” mundëson dërgimin e kërkesës.
3. Kërkesa në pritje: Shfaq përmbledhjen e udhëtimit dhe mesazhin “Kërkesa u dërgua dhe është në pritje të konfirmimit nga shoferi”. Ky status nuk nënkupton se vendi është konfirmuar.

## 4. MVP — vetëm tri veçori
1. Shikimi i listës së udhëtimeve të disponueshme.
2. Hapja e detajeve të një udhëtimi të zgjedhur.
3. Dërgimi i kërkesës për një vend dhe shfaqja e statusit “Në pritje”.

Për këtë version provues, udhëtimet mund të jenë të parapërgatitura.

## 5. Çfarë e lëmë për më vonë?
1. Pagesat online brenda aplikacionit.
2. Biseda në kohë reale mes shoferit dhe udhëtarit.

## 6. Si e provoj?
- Kur zgjedh një udhëtim me vende të lira dhe shtyp “Kërko një vend”, duhet të regjistrohet vetëm një kërkesë dhe të hapet ekrani “Kërkesa në pritje” me udhëtimin e saktë. Shtypja e përsëritur nuk duhet të krijojë kërkesa të dyfishta.
- Nëse nuk ka vende të lira, duhet të shfaqet mesazhi “Nuk ka vende të lira” dhe butoni i kërkesës duhet të jetë i çaktivizuar. Nëse vendi i fundit është zënë ndërkohë, aplikacioni duhet ta kontrollojë sërish disponueshmërinë gjatë dërgimit dhe të mos e regjistrojë kërkesën.

## 7. Prova me kolegun


## 8. Ndihma nga AI

