# FIX 05 — één-stoel veiligheidsbuffer

Issue [#42](https://github.com/johndobry89/SeatBuddy/issues/42), basis
`26f6a2b8ee616cf6e40882bf1b3037698e904939`, branch
`feat/issue-42-adjacent-special-seat-guard`, **0.11.8-experimental**.

Eigenaar meldt twee tegengestelde live observaties over een plaats naast een
rolstoelplek en kiest expliciet voor conservatieve overuitsluiting. Dit is
**SeatBuddies-productbeleid**, geen bewijs dat Vue zulke stoelen overal blokkeert
of dat iedere onbekende categorie een rolstoel-/begeleidersplaats is.

Alleen de bestaande gedeelde `assessPair` wijst nu ook een paar af bij een direct
buitenliggende speciale of ongeclassificeerde stoel. De oude speciale
classmarkeringen en categorie-uitkomst blijven de bron; geen nieuwe iconen-,
kleur-, bioscoop- of stoelnummerheuristiek. Dezelfde fysieke rij, directe DOM-
buren, opeenvolgende nummers/kolommen en ongewijzigde rechthoek-/afstandstoetsen
bepalen de buurrelatie. Een span/comment, grote gang, kolombreuk of andere rij
wordt niet overbrugd. Geen hele rijban of buffer van meerdere stoelen.

De reader stelt voor picked/unavailable geen categorie vast. Ook die direct
buitenliggende ongeclassificeerde posities vallen daarom conservatief onder de
buffer: een gewone plaats kan onterecht uit de aanbevelingen verdwijnen. Geen
websiteknop wordt aangepast. A krijgt geen suggestie; B krijgt via precies
dezelfde check `UNKNOWN_STOP`, ook voor een geïmporteerd paar buiten de top drie.
Duo Handoff-UI, tekstcontract, privacy, TTL en alle bestaande guards blijven gelijk.

**SYNTHETIC_FIXTURE:** drie regressies werkelijk **3 FAIL vóór → 3 PASS na**:
beide kanten/speciale kenmerken/UNKNOWN/beschikbaarheid; fysieke grenzen en
gewone paren elders; B-target buiten top drie. Alle bestaande tests behouden,
**363 unit PASS**, format/lint/types/icons/build PASS; **31 UI PASS**.
Lokale native uitvoering: twee serviceworker-prerequisites BLOCKED door de
beheerde ExtensionInstallBlocklist=[*], geen policywijziging of bypass. De oude geldige duo-fixture
heeft nu een expliciete DOM-afscheiding tussen ongeclassificeerde stoel 4 en doel
5+6; geen veilige handoff testen met een inmiddels verboden directe buur.
De bestaande native proef krijgt één extra synthetische kaartwijziging:
UNKNOWN naast B's doelpaar → STOP. Geen nieuwe testschermen of siteacties.
Definitieve UI/native CI en exacte oplever-SHA staan in de gestapelde draft-PR en
[branchchecks](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-42-adjacent-special-seat-guard).

Beide ZIPs onafhankelijk op CRC/SHA en alle bytes tegen dist gecontroleerd.
Normale 0.11.0 ZIP byte-identiek met de basis, SHA256
`372d6ef1682ae3a9c339f1bd9f4a3d044c3eebf3a693453e0dcc6fdb675625fc`.
Experimentele ZIP: `build/experiment/seatbuddies-0.11.8-experimental-chrome-test.zip`,
SHA256 `cb8ab60cd84ee118b6fa860a4a5327bc8a6bb626ac0c321221cdf99ed2e32e78`.
Geen nieuwe rechten, opslag, netwerk, DOM-wijzigingen, automatische stoelkeuze,
account- of betaalacties. Geen nieuwe Vue-pagina's onderzocht.

**OWNER_LIVE_BUFFER NOT_RUN; OWNER_LIVE_A→B NOT_RUN; G0 INCONCLUSIVE.**
Eigenaar: checksum controleren, ZIP uitpakken en de manifestmap laden in een
normaal eigen Chrome-profiel (incognitotoegang uit). Lees bewust de eerste veilige
stoelpagina, vergelijk visueel en gebruik **Kopieer rapport**. Overuitsluiting kan;
geen verplicht Console-onderzoek of echte ticket-/betaaltest. Movie Pass-kosten en
boekbaarheid blijven per account ongecontroleerd. Niets mergen of publiceren.
