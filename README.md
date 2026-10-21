# SeatBuddy / SeatMates — Sprint 03 testbuild

Een Nederlandstalige Chrome Side Panel-assistent om **zelf één filmavond met twee aparte accounts te plannen en te controleren**. De hoofdworkflow werkt zonder Vue-toegang: filmplan, onafhankelijke A/B-stappen, gewenste stoelen, expliciete zelfmeldingen en herstel bij problemen. **De extensie leest Vue niet en boekt niets.**

## Meteen proberen op Mac of Windows

Download de **seatmates-chrome-test** Actions-artifact bij de gewenste Sprint 03-commit. Pak het Actions-archief uit en daarna ook `seatmates-0.3.0-chrome-test.zip`. Open `chrome://extensions`, zet Ontwikkelaarsmodus aan, kies **Uitgepakte extensie laden** en selecteer de map met `manifest.json`. Pin SeatMates en klik het icoon.

Volg de **[Mac-testgids (10–15 minuten)](docs/macos-test-guide.md)** of de [Windows-testgids](docs/windows-test-guide.md) voor uitpakken, incognito-opt-in, verwijderen en fictieve QA. Dezelfde ZIP werkt als browsercode op beide systemen; oudere Sprint 02-artefacten houden hun historische Windows-naam. Vereist: desktop Chrome 116+ en toestemming om lokale extensies te installeren. Dit is geen Store-release. Menselijke A/B-QA op Mac en Windows blijft apart van automatische CI; de gemelde Mac-opening op 20 oktober is alleen USER_REPORTED_PARTIAL_SMOKE.

## Wat je kunt doen

1. Vul film, Vue-bioscoop, datum, tijd en eventueel zaal in. Zonder volledige zaalgegevens blijft de voorstellingvergelijking UNKNOWN.
2. Controleer de overgenomen voorstelling en vul per persoon gewenste rij/stoel in. Bewaar de invoer en volg daarna afzonderlijk A en B. Een gewijzigde invoer wist de eerdere eigen controles.
3. Meld per persoon wat je **zelf** op Vue hebt gecontroleerd. Alleen A afronden geeft een partiële eigen melding; B verandert niet. Er is geen automatische definitieve actie of terugdraaiing.
4. Vergelijk eigen showtime-invoer en stoelnummers. Opeenvolgende nummers blijven **niet geverifieerd naast elkaar**: gangpad, stoelcategorie, beschikbaarheid en echte aangrenzendheid zijn onbekend.
5. Haal alleen desgewenst via **Vensterlijst ophalen / vernieuwen** de actieve vensters op. Koppel expliciet een normale actieve Chrome-context voor A en een toegestane incognitocontext voor B. Alleen tab-/vensternummers en incognitostatus worden gebruikt. Dit bewijst geen accountidentiteit of live websitegegevens. Zonder koppeling blijft de handmatige begeleiding bruikbaar.
6. Gebruik **Simulatie / technische proef** voor fictieve scenario's; die is gescheiden van de dagelijkse assistent. `SIMULATED_COMPLETE`, een eigen melding en werkelijke websitebevestiging zijn verschillende dingen. Deze build kan geen echte `CONFIRMED`-status produceren.

Eigen controles verlopen na 15 minuten. Navigatie, sluiten/verplaatsen/vervangen van een gekoppelde tab en ingetrokken incognitotoegang maken de betreffende controles ongeldig. Worker-/browserherstart wist tijdelijke gegevens. Er wordt niets automatisch herhaald. Bij ontbrekende browser-API's blijft een lokale handmatige assistent beschikbaar; herladen wist die invoer. **Verbind opnieuw en wis tijdelijke gegevens** start bewust opnieuw, ook voor andere panelen van dezelfde coördinator. Bij mislukte herverbinding blijft de lokale invoer behouden; een opdracht wordt nooit automatisch herhaald. Een nieuwe worker wordt herkend en krijgt hersteladvies.

**Bronlabels:** `MANUAL_SELF_REPORT` = eigen invoer, `BROWSER_CONTEXT_ONLY` = alleen Chrome-context, `SIMULATION` = fictief, `UNKNOWN` = onbekend. Echte Vue-bevestiging is **NOT_IMPLEMENTED**. Onder **Diagnostiek zonder privégegevens** kun je bewust een tijdelijke zelfcontrole uitvoeren (versie, capabilities, scope, toestemming, modus), zonder filmgegevens, titels, URL’s of tabnummers. Er wordt niets geüpload.

## Ontwikkelen en bouwen

Node.js 24 LTS (zie `.nvmrc`), npm en een desktopbrowser die unpacked extensions toelaat. Geen backend, credentials of runtime-omgevingsvariabelen nodig.

```sh
npm ci
npm run check
npm run package
```

`dist/` bevat de unpacked runtime. `build/seatmates-0.3.0-chrome-test.zip` bevat alleen runtimebestanden en krijgt een aparte SHA-256-checksum. `npm run dev` bouwt bij wijzigingen opnieuw; herlaad de extensie daarna zelf. Gebruik de bestaande cloudcheckout; iedere taak is al geïsoleerd, dus maak geen extra Git worktree zonder expliciete opdracht. Bij een onschrijfbare npm-cache: `npm ci --cache /tmp/seatbuddy-npm`.

| Commando           | Controle                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run check`    | Formatter, lint zonder waarschuwingen, strict TypeScript, unit/contracttests, build                                                        |
| `npm run test:ui`  | Gebouwde Vue-interface met nagebootst transport naar echte coördinator                                                                     |
| `npm run test:e2e` | Echte unpacked extensie, Side Panel, fixturezenders, contextkoppeling, incognito-opt-in/-revocation en workerstop waar beleid dit toestaat |
| `npm run package`  | Gecontroleerde versiegebonden runtime-ZIP, geen broncode/cache/node_modules                                                                |

Installeer voor browsertests op Linux `npm exec playwright install -- --with-deps chromium`, op Mac `npm exec playwright install -- chromium`, of zet `CHROMIUM_PATH` op een bestaande compatibele Chromium. In deze cloud: `CHROMIUM_PATH=/usr/bin/chromium XDG_CONFIG_HOME=/tmp/seatbuddy-chromium-config XDG_CACHE_HOME=/tmp/seatbuddy-chromium-cache npm run test:ui` (of `test:e2e`). Beheerd Chrome-beleid wordt nooit aangepast om tests groen te maken.

Optionele officiële Chrome-skills en DevTools MCP: [veilige ontwikkelgids](docs/agent-browser-debugging.md). Altijd een geïsoleerd wegwerpprofiel met fictieve gegevens; geen persoonlijke Chrome-koppeling of globale agentconfigwijziging. De lokale MCP-installatieproef is werkelijk uitgevoerd en door administratorbeleid geblokkeerd.

## Chrome-, CI- en G0-bewijs

Sprint 01 [Actions-run 39389132288](https://github.com/johndobry89/SeatBuddy/actions/runs/39389132288) heeft **Success** voor head `b2be53ee40d756da1a68b5455d5ab3f81fe36074`, inclusief de toenmalige unpacked-fixture-smoke. Dat is Linux-runnerbewijs, geen Windows- of Vue-bewijs. Sprint 02 [Actions-run 39395179800](https://github.com/johndobry89/SeatBuddy/actions/runs/39395179800) is eveneens **Success**, met 81 unit/contracttests, vier UI-tests en twee echte-extensietests, inclusief Side Panel-opening, neutrale normale/incognitocontexten, expliciete toestemming en workerherstart. Dit is Linux-bewijs met fictieve data. De beheerde cloudbrowser blokkeert unpacked installatie en incognito; die lokale blokkade blijft apart geregistreerd.

Sprint 03 [run 39569239160](https://github.com/johndobry89/SeatBuddy/actions/runs/39569239160) heeft een **geslaagde Linux-job** op implementatiehead `f1ba8ba6f342ef173bed48d7e6a8c287699fb2ec`: 105 unit/contracttests, vijf UI-tests en twee echte extensieproeven met diagnostiek en zichtbaar workerherstel. Artefact: **seatmates-chrome-test**. De nieuwe macOS build/unit/UI-job staat bij de laatste controle nog **QUEUED**, dus nieuw Mac-CI-bewijs is er nog niet. Menselijke Mac-/Windows-QA blijft apart.

Een verpakte extensiepagina kan bij `incognito: "spanning"` niet als hoofdpagina van een incognitotab laden. Het oude Sprint 01-advies om `fixture.html` in incognito te openen is daarom vervangen. De handmatige contextkoppeling heeft geen verpakte B-pagina nodig. Zie [ADR-003](docs/decisions/ADR-003-manual-first-context-pairing.md).

**G0 voor echte Vue-integratie is niet gehaald.** De actuele Vue-voorwaarden en live checkoutvelden konden hier niet worden onderzocht door ontbrekende netwerk-/account-/toestemmingscontext. Publieke documentatie geeft op zichzelf geen toestemming voor een live adapter. Er zijn geen productiehostrechten, live selectors of content scripts geactiveerd. Alleen een zuivere interface met fictieve DOM/SVG-fixtures is toegevoegd. Exacte bevindingen, commando-uitkomsten en grenzen: [haalbaarheidsregister](docs/feasibility.md).

## Privacy en scope

Alleen `sidePanel`-permissie. Geen cookies, host-/tabs-/scripting-/storage-/debugger-permissies, backend, tracking, clipboardlezing of automatische externe requests. De gewone Vue-hyperlink werkt uitsluitend na een menselijke klik en geeft geen accounttoegang. Browsermetadata wordt bewust gereduceerd tot nummers en incognitostatus; geen paginatitels, URL's, namen, e-mails, pasnummers, tokens, tickets of betaalgegevens worden opgehaald. Plan, contexten en eigen voortgang blijven in geheugen. Externe data krijgt geen privilege via DOM of berichten.

Lees [AGENTS.md](AGENTS.md), [masterplan](SEATMATES_MASTERPLAN.md), [Sprint 01-brief](CODEX_BUILD_BRIEF.md), [ADR-001](docs/decisions/ADR-001-extension-first.md), [ADR-002](docs/decisions/ADR-002-dual-session.md), [ADR-003](docs/decisions/ADR-003-manual-first-context-pairing.md) en het [testplan](docs/manual-test-plan.md). Sprint 03 volgt [issue #7](https://github.com/johndobry89/SeatBuddy/issues/7) en is gestapeld op Sprint 02 / [PR #6](https://github.com/johndobry89/SeatBuddy/pull/6). Zie ook [release notes](CHANGELOG.md), [QA-bewijsformulier](docs/qa-evidence-template.md), [G0-observatiegids](docs/g0-human-observation-guide.md), [ADR-004](docs/decisions/ADR-004-explicit-reconnection.md) en [Store-/privacyvoorbereiding](CHROMEWEBSTORE.md). Geen Storepublicatie.

Independent third-party tool. Not affiliated with or endorsed by Vue Cinemas. Reservations remain separate and are only final when independently confirmed by Vue.
