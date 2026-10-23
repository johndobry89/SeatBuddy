# FIX 01 — Quick Ticket en Booking Hero

Issue #31 inclusief addendum 23 oktober 2026. Basis `feat/issue-29-vue-read-spike`
op `ef94a0eac0fd1c6c6fc62a814a53f0dae920bd48`; reparatiebranch
`feat/issue-31-vue-header-fix`, build **0.11.2-experimental**.

**Bewijs:** de issue beschrijft REAL HTML SNAPSHOT INSPECTION door de eerdere
assistent: twee afzonderlijke bookingweergaven en twee Quick Ticket-snapshots.
Codex heeft uitsluitend die gesaniteerde selectortabel gelezen, geen originele
HTML, privé-URL's, assets of persoonsgegevens. Onze vier mini-fixtures zijn
volledig synthetisch. SYNTHETIC TEST PASS is geen live DOM- of hydratatiebewijs.
**OWNER_LIVE_NOT_RUN voor beide schermtypen; G0 LEGAL INCONCLUSIVE.**

| Bron                          | Gerichte selector                                                                                                              | Interpretatie                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Quick Ticket                  | één `div.quick-book[role="complementary"]`                                                                                     | eigen bron, nooit banner/cards                                   |
| Locatie / film / datum / tijd | `li[data-test="quick-book-{venue,film,date,time}-selector"] button[data-test="dropdown-opener"] .dropdown-opener__title-value` | alleen vier zichtbare geselecteerde teksten                      |
| Booking Hero                  | één `[data-test="booking-hero"]`                                                                                               | eigen bron, nooit combineren met Quick Ticket                    |
| Film                          | `h1[data-test="booking-film-title"]` / `h1.booking-heading__title` binnen hero                                                 | zichtbare filmkop                                                |
| Bioscoop                      | `.booking-hero__cinema` binnen hero                                                                                            | weergegeven naam, geen automatisch Vue-prefix                    |
| Zaal                          | `[data-test="booking-hero-cinema-screen-name"]` / `.booking-hero__cinema-screen` binnen hero                                   | optioneel; alleen expliciete `Zaal N`                            |
| Zaalcontrole                  | expliciete `[data-test="screen-title"]`-kop                                                                                    | uitsluitend vergelijken met herozaal; geen stoelgegevens         |
| Datum                         | `time[data-test="booking-date-date"]` / `time.booking-date__date`                                                              | geldige lokale `datetime`, zichtbare dag/datum ermee vergeleken  |
| Aanvang                       | `time[data-test="booking-date-start-time"]` / `time.booking-date__time__start`                                                 | strikt HH:mm, vergelijken met datum- en eigen datetime-attribuut |

Nieuwe routes lezen `textContent` uitsluitend van unieke zichtbare bladnodes.
Placeholders, ontbrekende/verborgen of ongeldige waarden zijn UNKNOWN; dubbele
waarden of conflicten AMBIGUOUS. Twee zichtbare broncontexten worden volledig
afgewezen, ook als zij toevallig dezelfde tekst tonen. Geen first-matchkeuze of
fallback naar de promotiefilm. De oude generieke public-showing-route blijft
behouden, maar wordt nooit gebruikt als een specifieke bron aanwezig is.

Quick Ticket bewaart de korte datum letterlijk, bijvoorbeeld `za 13 apr`:
**geen jaar afleiden**, geen zaal uit verborgen opties halen. Ook gedeeltelijke
keuzes worden getoond, zonder claim van een complete voorstelling. Provenance:
`VISIBLE_QUICK_TICKET`. Booking Hero gebruikt `VISIBLE_BOOKING_HERO`; de
datum bevat alleen een jaar als het gevalideerde lokale datetime dat levert.
Ondersteuning is beperkt tot lokale ISO-datum/tijd zonder timezoneconversie en
de aangetroffen korte Nederlandse datumweergave. Onbekende varianten stoppen.

**Checkoutbeleid:** een zichtbare `.checkout`, login-/betaaldialoog of de bestaande
beschermde routes blokkeert vóór veldextractie. Alleen aanwezigheid/zichtbaarheid
wordt gecontroleerd; nooit tekst, inputs, prijzen of accountinhoud. Een header op
de eerste stoelkeuzepagina kan worden gelezen; een post-CTA-pagina blijft BLOCKED.
De tweede herovorm is offline bewezen met uitsluitend de synthetische header,
en de volledige synthetische checkoutfixture wordt expliciet geweigerd. Er is geen
productieoverride om de guard over te slaan. “Controleren & betalen” bewijst geen
betaling of afgeronde boeking.

Eén bestaande popup en knop. Iedere bewuste klik voert maximaal één ISOLATED
topframe-injectie uit. Een volgende handmatige klik mag dezelfde tab opnieuw lezen;
oude velden verdwijnen vóór het antwoord. Dit vervangt de eenmalige-per-popupgrens
van 0.11.1. Geen polling, DOM-observer, timerfunctie, siteklikken, CTA-hreflezing,
netwerk, workerpayload of opslag. Bestaande origin-/incognito-/navigatie-/timeout-
en payloadcontroles blijven; incognitotoegang moet uit staan.

**Tests:** vijf gerichte nieuwe regressies zijn werkelijk FAIL uitgevoerd vóór de
fix en PASS erna. Zij omvatten vier mini-fixtures, placeholders/partieel, verborgen
en dubbele nodes, ongeldige datums/tijden, conflicterende zaal/tijd en bronconflicten.
Getters op inputwaarden, menu-/checkouttekst en CTA-hrefs laten onbedoelde toegang
falen. De bestaande vier readerregressies blijven behouden. De native ZIP-proef
behoudt de oude public-showing- en leeg-na-heropenencontroles en test nu ook beide
nieuwe routes, een bewuste tweede klik en checkoutweigering, nul workerberichten en
ongewijzigde opslag. De runner levert uitsluitend synthetische HTML en blokkeert
ieder ander HTTP-verzoek. Definitieve platformconclusies staan bij de exacte
oplevercommit in [Actions](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-31-vue-header-fix).

**Build:** `npm run package` blijft 0.11.0 met uitsluitend `sidePanel`, `storage`;
`npm run package:experiment` maakt apart 0.11.2-experimental met daarnaast uitsluitend
`activeTab`, `scripting`. Geen hosts, content scripts of overige manifestwijzigingen
behalve experimentele naam/versie. Geen dependency of normale UI gewijzigd.

Lokaal uitgevoerd: `npm run check` PASS (340 unit), `npm run test:ui` PASS (31),
beide packages PASS met onafhankelijke CRC-, SHA256- en bytevergelijking met dist.
De lokale native proef is vóór functionaliteit BLOCKED door de bestaande beheerde
`ExtensionInstallBlocklist=[*]`; geen beleidswijziging of bypass. De volledige
bestaande native CI plus de uitgebreide experimentele proef blijven verplicht.
Normale ZIP blijft byte-identiek aan de basis:
`372d6ef1682ae3a9c339f1bd9f4a3d044c3eebf3a693453e0dcc6fdb675625fc`.
Experimentele ZIP (32 runtimebestanden, 132544 bytes):
`7a3c9cd9f043a40d1ba3ce94021e65d1e90a64e1fd749300cdfa65a3e818438c`.

Het CI-artifact heet **seatbuddies-vue-page-reader-experiment**: pak de wrapper uit,
controleer de binnenste ZIP met `shasum -a 256 -c *.zip.sha256`, pak die ZIP uit en
laad de map met rootmanifest via Chrome Ontwikkelaarsmodus → Uitgepakte extensie.
Gebruik uitsluitend de artifactversie van deze fixbranch, niet de oude 0.11.1.

**Eigenaarproef, nog NOT_RUN:** gebruik een schoon normaal Chrome-testprofiel met
incognitotoegang uit. (1) Lees Quick Ticket eerst leeg, daarna na vier eigen keuzes;
vergelijk de vier openerteksten, zonder jaar/zaal erbij te verzinnen. Bij wijziging
opnieuw bewust klikken. (2) Lees onafhankelijk een toegestane eerste Booking Hero-
weergave zonder account-/betaaloverlay en vergelijk alle zichtbare hoofdvelden.
Geen checkoutactie of login nodig voor onze test; als deze toestand niet veilig
bereikbaar is, STOP. Een zichtbare checkout moet worden geweigerd. Fout/mismatch
betekent NO-GO, geen uitbreiding naar stoelzoeker of boekingsautomatisering.
