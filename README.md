# SeatBuddy / SeatMates — Sprint 02 testbuild

Een Nederlandstalige Chrome Side Panel-assistent om **zelf één filmavond met twee aparte accounts te plannen en te controleren**. De hoofdworkflow werkt zonder Vue-toegang: filmplan, onafhankelijke A/B-stappen, gewenste stoelen, expliciete zelfmeldingen en herstel bij problemen. **De extensie leest Vue niet en boekt niets.**

## Meteen proberen op Windows

Download de **seatmates-windows-test** Actions-artifact bij de gewenste Sprint 02-commit. Pak het Actions-archief uit en daarna ook `seatmates-0.2.0-windows-test.zip`. Open `chrome://extensions`, zet Ontwikkelaarsmodus aan, kies **Uitgepakte extensie laden** en selecteer de map met `manifest.json`. Pin SeatMates en klik het icoon.

Volledige stappen, incognito-opt-in, verwijderen en een fictieve proef staan in de [Nederlandse Windows-testgids](docs/windows-test-guide.md). Vereist: desktop Chrome 116+ en toestemming om lokale extensies te installeren. Dit is geen Store-release; Windows moet nog door een menselijke tester worden gevalideerd.

## Wat je kunt doen

1. Vul film, Vue-bioscoop, datum, tijd en eventueel zaal in. Zonder volledige zaalgegevens blijft de voorstellingvergelijking UNKNOWN.
2. Controleer de overgenomen voorstelling en vul per persoon gewenste rij/stoel in. Bewaar de invoer en volg daarna afzonderlijk A en B. Een gewijzigde invoer wist de eerdere eigen controles.
3. Meld per persoon wat je **zelf** op Vue hebt gecontroleerd. Alleen A afronden geeft een partiële eigen melding; B verandert niet. Er is geen automatische definitieve actie of terugdraaiing.
4. Vergelijk eigen showtime-invoer en stoelnummers. Opeenvolgende nummers blijven **niet geverifieerd naast elkaar**: gangpad, stoelcategorie, beschikbaarheid en echte aangrenzendheid zijn onbekend.
5. Haal alleen desgewenst via **Vensterlijst ophalen / vernieuwen** de actieve vensters op. Koppel expliciet een normale actieve Chrome-context voor A en een toegestane incognitocontext voor B. Alleen tab-/vensternummers en incognitostatus worden gebruikt. Dit bewijst geen accountidentiteit of live websitegegevens. Zonder koppeling blijft de handmatige begeleiding bruikbaar.
6. Gebruik **Simulatie / technische proef** voor fictieve scenario's; die is gescheiden van de dagelijkse assistent. `SIMULATED_COMPLETE`, een eigen melding en werkelijke websitebevestiging zijn verschillende dingen. Deze build kan geen echte `CONFIRMED`-status produceren.

Eigen controles verlopen na 15 minuten. Navigatie, sluiten/verplaatsen/vervangen van een gekoppelde tab en ingetrokken incognitotoegang maken de betreffende controles ongeldig. Worker-/browserherstart wist tijdelijke gegevens. Er wordt niets automatisch herhaald. Bij ontbrekende browser-API's blijft een lokale handmatige assistent beschikbaar; herladen wist die invoer.

## Ontwikkelen en bouwen

Node.js 24 LTS (zie `.nvmrc`), npm en een desktopbrowser die unpacked extensions toelaat. Geen backend, credentials of runtime-omgevingsvariabelen nodig.

```sh
npm ci
npm run check
npm run package
```

`dist/` bevat de unpacked runtime. `build/seatmates-0.2.0-windows-test.zip` bevat alleen runtimebestanden en krijgt een aparte SHA-256-checksum. `npm run dev` bouwt bij wijzigingen opnieuw; herlaad de extensie daarna zelf. Gebruik de bestaande cloudcheckout; iedere taak is al geïsoleerd, dus maak geen extra Git worktree zonder expliciete opdracht. Bij een onschrijfbare npm-cache: `npm ci --cache /tmp/seatbuddy-npm`.

| Commando           | Controle                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run check`    | Formatter, lint zonder waarschuwingen, strict TypeScript, unit/contracttests, build                                                        |
| `npm run test:ui`  | Gebouwde Vue-interface met nagebootst transport naar echte coördinator                                                                     |
| `npm run test:e2e` | Echte unpacked extensie, Side Panel, fixturezenders, contextkoppeling, incognito-opt-in/-revocation en workerstop waar beleid dit toestaat |
| `npm run package`  | Gecontroleerde versiegebonden runtime-ZIP, geen broncode/cache/node_modules                                                                |

Installeer voor browsertests `npm exec playwright install -- --with-deps chromium`, of zet `CHROMIUM_PATH` op een bestaande compatibele Chromium. In deze cloud: `CHROMIUM_PATH=/usr/bin/chromium XDG_CONFIG_HOME=/tmp/seatbuddy-chromium-config XDG_CACHE_HOME=/tmp/seatbuddy-chromium-cache npm run test:ui` (of `test:e2e`). Beheerd Chrome-beleid wordt nooit aangepast om tests groen te maken.

## Chrome-, CI- en G0-bewijs

Sprint 01 [Actions-run 39389132288](https://github.com/johndobry89/SeatBuddy/actions/runs/39389132288) heeft **Success** voor head `b2be53ee40d756da1a68b5455d5ab3f81fe36074`, inclusief de toenmalige unpacked-fixture-smoke. Dat is Linux-runnerbewijs, geen Windows- of Vue-bewijs. De beheerde cloudbrowser blokkeert unpacked installatie en incognito; die lokale blokkade blijft apart geregistreerd.

Een verpakte extensiepagina kan bij `incognito: "spanning"` niet als hoofdpagina van een incognitotab laden. Het oude Sprint 01-advies om `fixture.html` in incognito te openen is daarom vervangen. De handmatige contextkoppeling heeft geen verpakte B-pagina nodig. Zie [ADR-003](docs/decisions/ADR-003-manual-first-context-pairing.md).

**G0 voor echte Vue-integratie is niet gehaald.** De actuele Vue-voorwaarden en live checkoutvelden konden hier niet worden onderzocht door ontbrekende netwerk-/account-/toestemmingscontext. Publieke documentatie geeft op zichzelf geen toestemming voor een live adapter. Er zijn geen productiehostrechten, live selectors of content scripts geactiveerd. Alleen een zuivere interface met fictieve DOM/SVG-fixtures is toegevoegd. Exacte bevindingen, commando-uitkomsten en grenzen: [haalbaarheidsregister](docs/feasibility.md).

## Privacy en scope

Alleen `sidePanel`-permissie. Geen cookies, host-/tabs-/scripting-/storage-/debugger-permissies, backend, tracking, clipboardlezing of automatische externe requests. De gewone Vue-hyperlink werkt uitsluitend na een menselijke klik en geeft geen accounttoegang. Browsermetadata wordt bewust gereduceerd tot nummers en incognitostatus; geen paginatitels, URL's, namen, e-mails, pasnummers, tokens, tickets of betaalgegevens worden opgehaald. Plan, contexten en eigen voortgang blijven in geheugen. Externe data krijgt geen privilege via DOM of berichten.

Lees [AGENTS.md](AGENTS.md), [masterplan](SEATMATES_MASTERPLAN.md), [Sprint 01-brief](CODEX_BUILD_BRIEF.md), [ADR-001](docs/decisions/ADR-001-extension-first.md), [ADR-002](docs/decisions/ADR-002-dual-session.md), [ADR-003](docs/decisions/ADR-003-manual-first-context-pairing.md) en het [testplan](docs/manual-test-plan.md). Sprint 02 volgt [issue #5](https://github.com/johndobry89/SeatBuddy/issues/5) en blijft afhankelijk van [PR #4](https://github.com/johndobry89/SeatBuddy/pull/4) zolang die openstaat.

Independent third-party tool. Not affiliated with or endorsed by Vue Cinemas. Reservations remain separate and are only final when independently confirmed by Vue.
