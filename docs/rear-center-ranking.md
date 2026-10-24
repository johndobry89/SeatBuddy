# FIX 06 — achterin en midden

Issue [#43](https://github.com/johndobry89/SeatBuddy/issues/43), basis
`851e550f0c2e126218623d0267cbd490751ad226`, branch
`feat/issue-43-rear-center-ranking`, **0.11.9-experimental**.

Alleen de shortlist na de bestaande veiligheidsfilters verandert. Eén zichtbare,
met de voorstelling overeenkomende `[data-test="screen-title"]` is het toegestane
scherm-/zaalbaken. Zijn meetbare, horizontale rechthoek moet het kaartmidden bevatten
en volledig boven alle meetbare stoelen liggen. Ontbrekende, verborgen,
zijdelingse, overlappende of onmeetbare schermgeometrie bewijst geen richting.
DOM-ouderschap of volgorde bewijst die positie niet: ook buiten de geschaalde
scene beslist de gemeten geometrie. Dubbele zaal-/schermkoppen blijven onder de oude
contextguard vallen. Geen nieuwe selectorheuristiek of live onderzoek.

Bij dit bewijs: fysieke rijdiepte van ver naar nabij het scherm, daarna afstand
van het paarmidden tot het horizontale midden van alle stoelen, daarna gelijke
categorieën. De gemeten rijcentra voorkomen dat kleine verticale afwijkingen
binnen één rij de middenvoorkeur overstemmen. Ook bezette, speciale en Ultra Lux
posities tellen alleen voor de zaalafmetingen mee; ze worden geen kandidaten.
Exacte gelijke scores behouden de stabiele bestaande volgorde. Rijnummers zijn
labels, geen afstandsbewijs.

Greedige selectie uit deze rangschikking toont maximaal drie paren zonder gedeelde
stoelen. Dat kan minder dan drie opties opleveren; er worden geen paren verzonnen
of veiligheidscriteria versoepeld om de lijst te vullen. Bij onbewezen richting
blijft de oude stabiele categorie-/DOM-volgorde inclusief de bestaande top-drie-
afkap behouden. De compacte popup en het resultaat-/rapport-/duoschema veranderen
niet; geen ongefundeerd label “achterin”, comfortscore of kostenbelofte.

De gedeelde beschikbaarheid-, categorie-, Ultra Lux-, speciale stoel-, fysieke
rij/DOM/kolom/nummer-/geometrie- en één-stoelbuffertoetsen zijn ongewijzigd.
B verifieert nog steeds het exacte ontvangen paar vóór de shortlistlogica, ook
buiten de top drie. Geen coördinaten/DOM/afbeeldingen exporteren of bewaren,
geen extra rechten, opslag, netwerk, stoelklik, account- of betaalhandeling.

**SYNTHETIC_FIXTURE:** vier gerichte regressies; werkelijk **3 FAIL + 1 PASS vóór
→ 4 PASS na**. Omgekeerde labels 6→1/8→1 en gewijzigde DOM-volgorde; echt midden,
categorietie en niet-overlappende opties; veilige fallback; behouden buffer/Ultra
en B-target buiten de shortlist. Samen met bestaande aangrenzing/duo-tests
**19 PASS**. `npm run check`: **367 unit/contract PASS**, format/lint/types/icons/
build PASS; **31 UI PASS**. Lokale native poging: twee serviceworker-prerequisites
BLOCKED door beheerd Chrome-beleid `ExtensionInstallBlocklist=["*"]`, ongewijzigd.
De bestaande native pakketproef toetst dezelfde kleine synthetische
kaart met echte browserrechthoeken en daarna de fallback na bewuste herlezing.
Definitieve UI/native platformuitslagen, oplever-SHA en CI staan bij de gestapelde
draft-PR en [branchchecks](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-43-rear-center-ranking).

Eerste native CI op `da9f9cc`: de nieuwe rangschikkings-/fallbackproef PASS,
maar de oudere duoproef FAIL omdat deze blind de eerste optie selecteerde en
stoel 5+6 verwachtte. Die aanname is door de gevraagde rangschikking veranderd.
De test kiest nu expliciet het gelabelde doelpaar, zonder assertions af te zwakken.
B's kleine fictieve kaart bevat drie veilige achterste alternatieven; een echte
popupread bewijst dat het doel buiten zijn shortlist ligt vóór de exacte controle.
De eerste macOS-pushjob stopte bovendien bij de bestaande bufferregressie op de
5s-unitlimiet; de afzonderlijke macOS-PR-unitrun slaagde. Oude CI is geen totale
PASS; definitieve head-CI wordt apart gerapporteerd. Runtime-ZIP bleef gelijk.

Experimentele ZIP: `build/experiment/seatbuddies-0.11.9-experimental-chrome-test.zip`.
SHA256 `6a63ff26996688ec39c6cb76dcafc2f995ce517cdef90724f729aa4db987fe6e`.
Beide ZIPs onafhankelijk op checksum, CRC, exacte bestandslijst, alle bytes tegen
dist en manifestrechten gecontroleerd. Normale 0.11.0 ZIP byte-identiek met de basis, SHA256
`372d6ef1682ae3a9c339f1bd9f4a3d044c3eebf3a693453e0dcc6fdb675625fc`.

**OWNER_LIVE_RANKING NOT_RUN; OWNER_LIVE_BUFFER NOT_RUN;
OWNER_LIVE_A→B NOT_RUN; G0 INCONCLUSIVE.** Eigenaar: checksum controleren, ZIP
uitpakken en manifestmap laden in een normaal eigen Chrome-profiel,
incognitotoegang uit. Lees bewust één eerste stoelkaart in Enschede of Nijmegen.
Vergelijk schermrichting, achterste/middenpositie, beschikbaarheid, categorie,
gangpaden en de speciale/UNKNOWN-buurbuffer visueel. Bij onduidelijke richting
geen achterinclaim; onveilig paar betekent STOP. B kan een gedeeld exact paar
apart controleren, onafhankelijk van de shortlist. Geen boeking vereist;
Movie Pass-bijbetaling blijft per account ongecontroleerd. Synthetisch/native
groen is geen menselijke live acceptatie, prijsbewijs of gegarandeerd beste stoel.
Geen afwijking van bestaande ADR's; niets mergen of publiceren.
