# EXPERIMENT 02 — zichtbare Vue-stoelkaart

Issue [#33](https://github.com/johndobry89/SeatBuddy/issues/33), 23 oktober 2026.
Basis `feat/issue-31-vue-header-fix` op
`5c2d7d5a057475b9e21d57bb864214cddc2a7c65`. Experiment **0.11.3-experimental**,
branch `feat/issue-33-live-seatmap-spike`; geen productie-integratie.

**OWNER_PRIVATE_STATIC_HTML:** uitsluitend de gesaniteerde issue gelezen, geen
originele HTML, afbeeldingen of privé-URL's. Snapshot A: 34 stoelbuttons / vier
rijen, ARIA 26 available / acht unavailable; geen zichtbare checkout. Exacte
in-page iconkoppeling: drie Ultra Lux / zeven Lux / vier Saver Lux / elf Super
Saver Lux; één beschikbaar special-icoon onbekend. Data-row is geen zichtbaar
rijnummer, data-seat-status-prefix geen beschikbaarheid. Een span-gat en kolommen
5 → 3 scheiden opeenvolgende stoelnummers 4-5 / 4-6. Omgekeerde labels komen voor.
Snapshot B is een **andere voorstelling**, 43 buttons / vijf rijen, 31 available /
elf unavailable / één picked, geen legenda, wel checkout: **BLOCKED**, niet lezen.
Geen bewijs voor reservering, kosten, accountdekking of tijdslimieten.

**OWNER-REPORTED LIVE HEADER:** issue #33 meldt succesvolle persoonlijke proeven
van Quick Ticket en Booking Hero met 0.11.2. Dat actualiseert de toenmalige
NOT_RUN-status in de historische headernotitie; Codex heeft dit niet live getest.
**OWNER_LIVE_NOT_RUN voor stoelkaart en paren. G0 LEGAL INCONCLUSIVE.**

Dezelfde bewuste knop doet één ISOLATED topframelezing, zonder siteactie. Eerst
bestaande origin-/normaal-profiel-/incognito-/grant-/navigatie-/checkoutguards en
een complete unieke Booking Hero met geldige consistente datum, tijd en zaal.
Quick Ticket blijft ongewijzigd en leest geen stoelen. Dan één zichtbare scene/map
met zichtbare directe stoelrijen: maximaal 499 buttons, 50 rijen. Verborgen of
dubbele kaarten stoppen vóór stoelattributen. Geen inputs, prijzen, counters,
menu's, raw HTML, netwerk, workerbericht, opslag of DOM-observer.

Status komt alleen uit strikt `Seat R-S, available|unavailable|picked`, met
unieke labels/IDs/kolommen en disabled-controle. Tegenstrijdig is onbekend;
dubbele identiteit/rijstructuur blokkeert de telling én paren. Picked betekent
uitsluitend geselecteerd. Categorie komt alleen uit vier unieke zichtbare
legendatitels `.seats-category__title` en hun unieke data-image-iconen: exacte
src-gelijkheid met het zichtbare beschikbare stoelicoon, tijdelijk binnen de
pagina. Geen iconen downloaden/decoderen/hashen/exporteren, geen kleur-/prijs- of
ID-afleiding. Ontbrekende/afwijkende legenda blijft onbekend; geen overerving.
Niet-beschikbare en geselecteerde stoelen hebben categorie onbekend.

Paren: dezelfde fysieke DOM-rij en ARIA-rij, twee direct opvolgende buttons,
geen span/ander element/comment/non-whitespace ertussen, labels én numerieke
kolommen verschillen één, verschillende unieke IDs. Ultra Lux, onbekend en
speciale/toegankelijkheids-/paired/recliner-classmarkeringen uitgesloten.
Werkelijke rechthoeken moeten positief/eindig zijn: geen overlap, verschillende
lijnen, breedte/hoogteverschil >25% of horizontale tussenruimte >25% stoelbreedte.
Zonder layout alleen tellingen. Deze conservatieve drempels kunnen goede paren
weigeren; zij bewijzen geen fysieke toegankelijkheid of universele Vue-geometrie.
Maximaal drie, gelijke categorie eerst; geen kostenrangschikking. Alleen
**mogelijk naast elkaar — controleer op Vue**, nooit een hold of €0-belofte.

Alleen een strikt gevalideerde kleine samenvatting verlaat de pagina: tijd/bron,
tellingen, toelichtingscode en maximaal drie rij-/stoellabelparen met categorieën.
Geen volledige kaart, attribuut-IDs, iconen of privé-URL's. Popup sluit → weg;
iedere wijziging maakt de waarneming verouderd, handmatig opnieuw lezen.

**SYNTHETIC_FIXTURE:** zes gerichte regressies met één verzonnen vier-rijenkaart
(acht buttons), fictieve data-iconen en expliciete testlayout. Goed paar;
omgekeerde volgorde; span/kolom/gangpad/overlap/speciale plaats; Ultra/onbekend/
picked/disabled/malformed/duplicate; ontbrekende/afwijkende legenda; checkout,
betaalinput, dialoog, foutieve header/zaal/datum en dubbele/verborgen/te grote kaart;
maximaal drie en categorievoorkeur. Werkelijk zes FAIL op de basislezer, zes PASS
met de uitbreiding. Bestaande grant-/incognito-/navigatie-/vervallen-toegangtests
blijven verplicht en weigeren vóór injectie of bij Chrome-rejectie.

De bestaande native ZIP-proef gebruikt uitsluitend lokaal vervulde synthetische
pagina's, echte action-grant/serialisatie/visibility/layout, dezelfde knop, telling,
paar, verdwenen legenda bij herlezen en checkoutweigering. Hij controleert ook
nul netwerk naar Vue, nul workerberichten en ongewijzigde opslag. Geen live bewijs.
`npm run check`: PASS, 346 unit in 22 bestanden, format/lint/types/icons/build.
`npm run test:ui`: PASS, alle 31 bestaande UI-proeven (1,5 minuut).
Definitieve UI/native uitslagen en **exacte oplever-SHA** staan in de bijbehorende
[commitchecks/Actions](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-33-live-seatmap-spike)
en het opleverrapport; alleen terminale uitslagen van die head zijn geldig.
Lokale native proef: beheerde `ExtensionInstallBlocklist=[*]` blokkeert het laden;
geen policywijziging of bypass. Linux en macOS Intel blijven de bestaande CI-gates.

**Werkelijk geobserveerde implementatie-CI:** bron
`81e4892b44bbda035333fa80857194cc21f9db59`,
[run 39941794090](https://github.com/johndobry89/SeatBuddy/actions/runs/39941794090).
Package PASS (21s). macOS Intel **SUCCESS** (8m09): 31 UI, zeven native smoke en
één experimentele native proef PASS (13,9s), met echte gedownloade artifactbytes.
Linux **FAIL** (5m43): systeemdependency-installatie overschreed de stapgrens van
vijf minuten, vóór UI/native; die browserproeven dus **NOT_RUN**. Root cause achter
de timeout INCONCLUSIVE; ruwe logs niet toegankelijk. `gh run rerun --failed`
werd werkelijk geprobeerd en kreeg REST Forbidden. De documentatiecommit hierna
wijzigt geen runtime-/testbytes; zijn definitieve eigen CI-status wordt apart in
het opleverrapport vermeld, nooit gelijkgesteld aan deze bron-SHA.

Draft-PR-aanmaak naar de voorgeschreven basis is werkelijk geprobeerd:
GraphQL Forbidden. [Exact gestapeld compare](https://github.com/johndobry89/SeatBuddy/compare/feat/issue-31-vue-header-fix...feat/issue-33-live-seatmap-spike?expand=1).
Klaarstaande titel: **EXPERIMENT 02: zichtbare Vue-stoelkaart en conservatieve
buurparen**. Body: “Refs #33. Eén bestaande klik leest de eerste zichtbare kaart;
strikte ARIA en legenda, maximaal drie conservatieve paren. Geen siteacties,
opslag of extra rechten. Zie deze bewijsnotitie en definitieve commitchecks voor
proeven, checksum en blokkades. Stoelacceptatie OWNER_LIVE_NOT_RUN; G0 INCONCLUSIVE.
Draft naar feat/issue-31-vue-header-fix; niets mergen/publiceren.”

**Packaging:** normale 0.11.0 met alleen sidePanel/storage byte-identiek:
`372d6ef1682ae3a9c339f1bd9f4a3d044c3eebf3a693453e0dcc6fdb675625fc`.
Experiment 0.11.3 met daarnaast uitsluitend activeTab/scripting, geen hosts of
content scripts, 32 runtimebestanden / 134957 ZIP-bytes, onafhankelijk CRC/SHA en
alle bytes tegen dist gecontroleerd. Binnenste ZIP SHA256:
`ec416947c8f5f18e37efb8efcac2d4b7c3d9d0e65e74a73c42f7399db86d1eac`.
CI-artifact **seatbuddies-vue-page-reader-experiment** bevat ZIP + checksum;
Actions-wrapperdigest is een ander object. Geen merge/release/publicatie.

Eigenaarproef, **NOT_RUN**, pas na oplevering:

1. Download het experiment van de geslaagde opleverrun, pak de Actions-wrapper uit,
   verifieer `shasum -a 256 -c *.zip.sha256`, pak de binnenste ZIP uit. Laad de map
   met rootmanifest via Chrome Ontwikkelaarsmodus → Uitgepakte extensie in een
   schoon normaal testprofiel met incognitotoegang uit.
2. Open een toegestane eerste stoelpagina zonder account-/betaalgegevens en klik
   éénmaal **Lees deze Vue-pagina**. Vergelijk header en tellingen; inspecteer
   maximaal drie mogelijke niet-Ultra-paren visueel op gat/gangpad en categorie.
   Bij iedere mismatch **NO-GO / STOP**; geen automatische selectie of boeking.
3. Wijziging? Opnieuw bewust lezen, geen oude koppeling gebruiken. Een zichtbare
   checkout moet **NIET BESCHIKBAAR** geven zonder stoelen. Als veilige observatie
   niet mogelijk is, STOP. Geen login, checkoutactie of betaling voor deze proef.
