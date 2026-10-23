# EXPERIMENT 01 — Vue Page Reader

23 oktober 2026. Issue #29; basis `feat/issue-27-sprint-12` exact
`b22e6d151b8b220cc0dfc08fa89af9ffc5b5e230`; branch `feat/issue-29-vue-read-spike`.
Eén nieuwe functie: **Lees deze Vue-pagina** in de bestaande popup, uitsluitend
in een afzonderlijke ontwikkelbuild. Geen nieuwe administratie of boekingsflow.

**Echte Vue-herkenning: INCONCLUSIVE. HUMAN_LIVE_NOT_RUN. PRODUCT_VALUE_NOT_PROVEN.
G0 LEGAL INCONCLUSIVE; productie NO-GO.** Hypothetische toestemming van de eigenaar
is geen aangetoonde Vue-toestemming. Er is hier geen echte Vue-pagina automatisch
opgevraagd of geobserveerd. Geen account, checkout of eigenaarsscreenshot gebruikt.

## Wat precies wordt gebouwd

| Manifest                                        | Normaal                                 | Experiment                                           |
| ----------------------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| version                                         | `0.11.0`                                | `0.11.1`                                             |
| version_name                                    | `0.11.0-test (Sprint 12)`               | `0.11.1-experimental`                                |
| name                                            | SeatBuddies — samen naar de film (test) | SeatBuddies — Vue Page Reader (experiment)           |
| permissions                                     | `sidePanel`, `storage`                  | `sidePanel`, `storage`, **`activeTab`, `scripting`** |
| hosts / optional hosts / content scripts / tabs | afwezig                                 | afwezig                                              |
| CSP, worker, Side Panel, iconen, overige velden | bestaand                                | identiek                                             |

`npm run package` blijft de normale build maken; `npm run package:experiment`
schrijft uitsluitend naar `build/experiment/`. Beide ZIPs krijgen CRC-/byte-,
runtime-/CSP-/licentie- en SHA256-controles. De gewone build bevat geen leesknop
of geïnjecteerde lezer. Alleen twee lege slots en een optioneel versielabel zijn
aan de gedeelde shell toegevoegd; daarom verandert zijn bundelhash, niet zijn
gedrag of rechten. De bestaande native hashassertie volgt die gecontroleerde ZIP.

Gewijzigde productieonderdelen: `ProductShell.vue`, `experiment/PopupApp.vue`,
`experiment/vue-page-reader.ts` en de variantkeuze in `vite.config.ts`.
Ondersteuning: twee packagescripts, npm/Playwright/CI-configuratie, bestaande
ZIP-testhelper, vier unit-tests, één native test en één fictieve HTML-bron.
Geen dependency toegevoegd; geen worker-, opslag- of boekingscontract gewijzigd.

## Eén bewuste Chrome-route

De echte action-popup legt alleen zijn actieve tab vast. Een gewone geopende
`popup.html`-tab mag niet lezen. De knop controleert opnieuw actieve tab,
normaal venster, voltooid laden, URL en exact HTTPS-origin
`https://www.vuecinemas.nl` of `https://vuecinemas.nl`. Ontbrekende tijdelijke
toegang, navigatie of tabwissel stopt de proef. Alleen gedurende de open popup
bestaan twee Chrome-metadata-eventhandlers voor het ongeldig maken van dit
doel; geen achtergrondwatcher, DOM-observer of polling.

Maximaal één `chrome.scripting.executeScript` per popup, `world: ISOLATED`,
`frameIds: [0]`. De zelfdragende functie controleert nogmaals origin/topframe.
Daarna worden tab/URL, frame/documentmetadata, tijd en het strikte kleine schema
gecontroleerd. Chrome-fouten worden niet doorgestuurd. Vier seconden timeout,
geen retry. Sluiten, navigeren of wisselen wist het resultaat. Geen workerbericht,
opslag, clipboard, request of websitehandeling; Vue toont uitsluitend escaped tekst.

## Ondersteunde semantiek en STOP-grens

Alleen één zichtbaar `main`. Film uit `h1[itemprop=name]` binnen expliciete
schema.org/Movie-microdata, of uit een zichtbare `dl > dt` met label **Film**.
Overige exacte labels: **Bioscoop, Datum, Tijd/Aanvang, Zaal**, met bijbehorende
`dd`. Geen ongetypeerde heading als film raden. Alleen zichtbare, begrensde
metadata; geen titel-/URL-inferentie, JSON-LD, formulierwaarden of paginadump.
Datum moet een geldige expliciete `YYYY-MM-DD` of Nederlandse numerieke datum
zijn; relatieve/uitgeschreven/onbekende datums blijven UNKNOWN. Tijd `HH:mm`
(eventueel `uur`). Meerdere tijden/metadataregio's worden niet tot één voorstelling
samengevoegd. Ontbrekende/ongeldige velden blijven UNKNOWN; conflicten AMBIGUOUS.
`observedAt` en `VISIBLE_MAIN_METADATA` gelden voor alle vijf velden in de snapshot.
Zichtbare dialogs, login-/betaalinvoervelden en beschermde routes blokkeren lezen.
Dit is een conservatieve patroonherkenner, geen universele account-/PII-detector.

**Dit zijn geen geverifieerde Vue-selectors.** Canvas, iframe, gesloten shadow DOM,
andere labels, niet-semantische cards of een gekozen voorstelling die niet eenduidig
zichtbaar is: UNKNOWN/AMBIGUOUS en STOP. Geen aanvullend reverse-engineeringwerk,
verborgen endpoints of MAIN-world hooks. Een losse filmtitel is geen voorstelling.

## Uitgevoerd bewijs

| Controle                                                        | Resultaat en bronklasse                                                                                                                                                                                          |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                                 | PASS: format/lint/types/iconen, 335 unit-tests, normale build                                                                                                                                                    |
| Vier gerichte nieuwe unit-tests                                 | PASS, uitsluitend FIXTURE + Chrome-API-doubles; exacte velden, meerdere tijden/ontbrekende data, oorsprong/grant/incognito/navigatie/payload, ongeldig DOM en privé-overlays                                     |
| `npm run test:ui`                                               | PASS, alle 31 bestaande lokale rendererregressies; geen live Vue-bewijs                                                                                                                                          |
| Beide packages + onafhankelijke ZIP/manifest/checksum-inspectie | PASS; normale rechten blijven twee; experiment heeft uitsluitend de beschreven delta                                                                                                                             |
| Lokale native experimentele proef                               | BLOCKED vóór functionaliteit: beheerde `ExtensionInstallBlocklist=[*]`; 10s wachten op worker. Niet omzeild. Runner registreert één mislukte voorwaarde, geen native PASS                                        |
| Linux / macOS Intel                                             | Workflow behoudt volledige bestaande controles/11 respectievelijk 7 native regressies en voert de ene nieuwe proef op beide uit; actuele conclusies op de exacte commit in Actions, bij oplevering gecontroleerd |
| OWNER_MANUAL_LIVE / echte veldmapping                           | NOT_RUN; geen echte film/bioscoop/datum/tijd/zaal geobserveerd                                                                                                                                                   |

De native proef installeert de geverifieerde experimentele ZIP in een leeg profiel.
Browser-CDP `Extensions.triggerAction` simuleert de icoonklik en tijdelijke grant;
vervolgens klikt Playwright de echte popupknop. Alleen lokaal verzonnen HTML wordt
op het toegestane origin door de **testrunner** aangeleverd; ieder ander HTTP-verzoek
wordt afgebroken. Geen contact met Vue. Verwachte FIXTURE-uitkomst: De maan van
papier / Fictief Filmhuis / 2030-04-12 / 19:30 / Zaal 2. Controle op ongewijzigde
Chrome-opslag, nul workerberichten en een lege nieuw geopende popup. Dit bewijst
pas engineering-GO als deze native proef daadwerkelijk slaagt; unit-groen alleen
is onvoldoende. De testdebuggingvlag is geen extensiepermissie en wordt niet verpakt.

Eerste [CI-run 39924898895](https://github.com/johndobry89/SeatBuddy/actions/runs/39924898895):
Linux 335 unit / 31 UI / 11 bestaande native PASS; Mac Intel 335 / 31 / 7 PASS.
De nieuwe proef faalde vóór lezen: CDP vereist een **tab**-target, geen page-target.
Dit is apart op een leeg lokaal profiel gereproduceerd, de testaansturing is
gecorrigeerd en beide popup-awaits zijn gekoppeld zodat een API-fout zichtbaar blijft.
De volgende exacte head krijgt dezelfde volledige CI; geen eerste-run engineering-GO.

## Installeren en precies drie menselijke stappen

Download in de geslaagde [Actions-run van deze branch](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-29-vue-read-spike)
het artifact **seatbuddies-vue-page-reader-experiment**, niet de normale testbuild.
Pak de Actions-wrapper uit. Controleer de binnenste ZIP met
`shasum -a 256 -c seatbuddies-0.11.1-experimental-chrome-test.zip.sha256`.
Pak daarna die ZIP uit. Gebruik een schoon normaal Chrome-testprofiel, geen
incognito of persoonlijke logins. Dit is unpacked testdistributie, geen release.

Experimentele inner ZIP: SHA256
`727e39c9b7992b3789abe2854aba25dcb2080b54b21e8724338b4df6d8ed5bd9`
(32 runtimebestanden, 131173 bytes). Normale ZIP:
`372d6ef1682ae3a9c339f1bd9f4a3d044c3eebf3a693453e0dcc6fdb675625fc`.

1. Open `chrome://extensions`, zet Ontwikkelaarsmodus aan en laad de uitgepakte
   map met `manifest.json` op root. Controleer **0.11.1-experimental** en de vier
   bovengenoemde rechten. Schakel een oude SeatBuddies-testkopie uit tegen verwarring.
2. Open zelf een **openbare specifieke Vue-voorstellingspagina**, zonder login,
   ticket-/stoelkeuze, winkelmand of checkout. Open het extensie-icoon en klik één
   keer **Lees deze Vue-pagina**. Typ geen voorstelling opnieuw in.
3. Vergelijk film, bioscoop, datum en tijd letterlijk met de pagina; zaal alleen
   indien zichtbaar. Bij ONBEKEND, meerdere mogelijkheden, modal, ontbrekende
   toegang of mismatch: noteer alleen veld/status en **STOP/NO-GO**; geen privédata
   delen. Sluit de popup: er mag geen vorige uitkomst terugkomen na heropenen.

Echte waarde is uitsluitend GO na die correcte menselijke vier-veldenproef zonder
herinvoer. Tot dan **INCONCLUSIVE / PRODUCT_VALUE_NOT_PROVEN**, geen volgende
bouwstap. Eén leesactie bewijst nog geen voordeel tegenover twee tabs of twee
onafhankelijke Movie Pass-boekingen. ZERO EXTRA/Ultra Lux-beleid blijft; deze
lezer bewijst geen stoelen, kosten, login, hold of boeking. Niets mergen/publiceren.
