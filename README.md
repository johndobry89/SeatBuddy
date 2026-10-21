# SeatBuddies — 0.4.0-test

Samen naar de film, **ieder met een eigen account en eigen boeking**. Deze onafhankelijke Chrome-extensie heeft een werkende buddy-popup, een volledige Nederlandse Side Panel-assistent en een herkenbaar crimson/goud ontwerp. Buddy’s zijn optionele tijdelijke **bijnamen**, geen gekoppelde Movie Passes. **De extensie leest Vue niet en boekt niets.**

## Meteen installeren op Mac of Windows

Download **seatbuddies-chrome-test** uit [Actions voor Sprint 04](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-10-sprint-04). Kies de gewenste commit en controleer de afzonderlijke jobresultaten. Pak eerst het Actions-archief uit en daarna **seatbuddies-0.4.0-chrome-test.zip**. Open `chrome://extensions`, zet Ontwikkelaarsmodus aan, kies **Uitgepakte extensie laden** en selecteer de map met `manifest.json`. Chrome desktop 116+ en toestemming om lokale extensies te laden zijn vereist.

Pin **SeatBuddies** en klik het icoon: nu opent de **buddy-popup**. Klik daarin bewust **Open boekingsassistent** voor het volledige zijpaneel. Gebruik bij een geblokkeerde popup/paneelactie het gewone Chrome-zijpaneelmenu in een normaal venster. Geen beleid aanpassen. Dezelfde browsercode is bestemd voor Mac/Windows; de pakketnaam bewijst geen menselijke OS-test.

[Mac-proef van 10–15 minuten](docs/macos-test-guide.md) · [Windows-installatie](docs/windows-test-guide.md) · [QA-formulier](docs/qa-evidence-template.md). De menselijke Mac-test volgt **na deze bouw**; geen echte accounts of tickets nodig. Oudere builds heten SeatMates en houden hun historische `seatmates-*`-artifactnaam; gebruik die niet als 0.4.0.

## Wat daadwerkelijk werkt

- **Buddy Manager:** voeg een korte bijnaam toe, hernoem, verwijder, selecteer één buddy of ga zonder buddy verder. De lijst begint leeg. De expliciete demoactie voegt fictieve Sanne/Mark toe met DEMO-label. Maximaal twaalf bijnamen van 1–24 tekens; geen e-mail, pasnummer of accountgegevens.
- **Eén gedeelde keuze:** de popup en het paneel gebruiken de echte tijdelijke coördinator. Het paneel toont **Ik + gekozen buddy**, terwijl A/B technisch gescheiden blijven. De popup krijgt geen filmplan, rolcontroles, tabnummers of incognitodata en kan geen rol/tab koppelen.
- **Bewust wisselen:** wijzigen, hernoemen of verwijderen van de geselecteerde buddy vraagt bevestiging. Alleen B’s invoer, koppeling en controles vervallen; ook onopgeslagen B-velden worden vernieuwd. A blijft zelfstandig. Dit annuleert geen echte boeking. Verouderde opdrachten en oude workergeneraties worden geweigerd.
- **Volledige handmatige assistent:** plan film/locatie/datum/tijd/zaal, vergelijk eigen invoer, bewaar gewenste stoelen en volg A/B afzonderlijk. Onbekende zaal blijft UNKNOWN. Eigen meldingen bewijzen geen websitebevestiging. Opeenvolgende stoelnummers bewijzen geen aangrenzende beschikbaarheid of hold.
- **Neutrale Chrome-contexten:** alleen na een expliciete lijst-/koppelactie kun je A aan normale tabmetadata en B aan toegestane incognitometadata koppelen. Een bijnaam wijst geen account aan. De gebruikelijke incognito-opt-in, intrekking en veilige handmatige fallback blijven aanwezig.
- **Fictieve widget:** uitsluitend op de verpakte `fixture.html`, met **DEMO · NIET GEBOEKT · GEEN VUE INTEGRATIE**. Fictieve schermstappen, verdwijnen/herplaatsen en een knop naar het echte paneel werken zonder productie-injectie.

Nicknames, selectie, plan en voortgang staan alleen in geheugen. Een worker-/browserherstart vergeet ze; eigen controles verlopen na 15 minuten. **Wis alle tijdelijke gegevens** wist ook buddy’s. Bij verbindingsverlies blijft lokaal handmatig plannen beschikbaar zonder buddybeheer; expliciet opnieuw verbinden wist tijdelijke lokale/coördinatorgegevens en herhaalt geen eerdere opdracht. De beperkte zelfcontrole onder **Diagnostiek zonder privégegevens** exporteert geen bijnamen, filmgegevens, titels, URL’s of tabnummers.

## Bouwen en controleren

Node.js 24 LTS (`.nvmrc`) en npm, geen backend of secrets:

```sh
npm ci
npm run check
npm run test:ui
npm run test:e2e
npm run package
```

`dist/` is direct unpacked te laden. `build/seatbuddies-0.4.0-chrome-test.zip` en `.sha256` bevatten alleen runtimebestanden, popup en iconen; manifest aan root. `npm run dev` bouwt opnieuw bij wijzigingen; herlaad daarna de extensie en heropen popup/paneel. De originele SVG en PNG’s worden gereproduceerd met `npm run icons`; `npm run icons:check` controleert exacte bytes. resvg is een vastgelegde **dev-only** rasterizer, niet onderdeel van de extensieruntime.

| Commando           | Controle                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| `npm run check`    | Formatter, lint, strict Vue/TypeScript, icoonreproductie, unit/contracttests, build                      |
| `npm run test:ui`  | Gebouwde UI met transportdouble naar de echte router/coördinator; fictieve data                          |
| `npm run test:e2e` | Echte unpacked extensie, native popup/paneel, context-/toestemmings-/workerproeven in een wegwerpprofiel |
| `npm run package`  | Runtime-allowlist, versies, rechten, popup/iconen, PNG-afmetingen, ZIP-bytes en checksum                 |

Browsertests: Linux `npm exec playwright install -- --with-deps chromium`; Mac `npm exec playwright install -- chromium`. Echte Linux-extensietests: `HEADED=1 xvfb-run -a npm run test:e2e`; lokaal Mac: `HEADED=1 npm run test:e2e`. In deze beheerde cloud zijn extensies/incognito verboden: UI-tests kunnen met `CHROMIUM_PATH=/usr/bin/chromium XDG_CONFIG_HOME=/tmp/seatbuddy-chromium-config XDG_CACHE_HOME=/tmp/seatbuddy-chromium-cache npm run test:ui`. Beleid wordt niet omzeild. Een onschrijfbare npm-cache: `npm ci --cache /tmp/seatbuddy-npm`.

## Bewijs en grenzen

De bestaande Sprint 03-code heeft Linux-bewijs voor 105 unit/5 UI/2 echte extensieproeven. De volledige eerdere workflow werd later **FAILURE**: macOS-arm64 kon door GitHub-capaciteitsproblemen geen runner krijgen. Linux-succes was dus geen groen totaalresultaat. Sprint 04 behoudt Mac build/unit/UI met de officieel beschikbare **macos-15-intel**-runner; Intel-CI valideert geen arm64 of menselijke Mac-bediening. Werkelijke actuele runlinks en uitkomsten: **[feasibility](docs/feasibility.md)**.

**G0 live Vue is niet gehaald.** Voorwaarden/toestemming, echte DOM, accounts, seatmap, holds en bevestigingen zijn niet gevalideerd. Productiehostrechten/content scripts blijven afwezig en de productieadapter blijft structureel uit. Geen extra Movie Pass invullen, checkoutautomatisering, betaling, annulering of echte reservering. Een verpakte `spanning`-pagina kan niet als incognitohoofdpagina dienen; gebruik neutrale tabmetadata of de handmatige route.

Alleen de `sidePanel`-permissie; geen storage-, cookies-, tabs-, scripting-, activeTab- of debuggerrechten, backend, tracking of externe fonts/scripts. Alleen een vaste publieke Vue-link kan na een bewuste klik navigeren. Geen persoonlijke Chrome-profielen aan agenttools koppelen. [Veilige optionele Chrome-tooling](docs/agent-browser-debugging.md), [privacy/Storevoorbereiding](CHROMEWEBSTORE.md), [ADR-005](docs/decisions/ADR-005-buddy-manager-popup.md), [designsystem en fictieve screenshots](docs/design-system.md), [changelog](CHANGELOG.md) en [G0-observatiegids](docs/g0-human-observation-guide.md).

Sprint 04 volgt [issue #10](https://github.com/johndobry89/SeatBuddy/issues/10) en [ontwerpissue #8](https://github.com/johndobry89/SeatBuddy/issues/8), gestapeld op `feat/issue-7-sprint-03` / [PR #9](https://github.com/johndobry89/SeatBuddy/pull/9). Geen merge of Storepublicatie.

Independent third-party tool. Not affiliated with or endorsed by Vue Cinemas. Reservations remain separate and are only final when independently confirmed by Vue.
