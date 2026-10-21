# SeatBuddies — Projector Ready 0.6.0-test

Een onafhankelijke Chrome Manifest V3-assistent met Vue 3/strict TypeScript voor één filmavond en **solo of twee zelfstandige boekingstrajecten**. Geen backend, accountsysteem of automatische boeking. **G0 live Vue is niet gehaald.** Alleen eigen invoer en fictieve testpagina’s; zelfmeldingen zijn geen websitebevestiging.

## Wat werkt

- Echte toolbarpopup met buddy’s toevoegen, hernoemen, verwijderen en één buddy kiezen. Start leeg; DEMO-voorbeelden verschijnen alleen na een bewuste actie. Zonder buddy blijft de assistent bruikbaar.
- Popup → **Open boekingsassistent** opent het echte Side Panel vanuit een klik. Eén getypeerde workercoördinator deelt de selectie. Een buddywissel vraagt bevestiging en wist alleen B’s gegevens/controles/onopgeslagen velden; A blijft zelfstandig.
- **Bewust solo of samen:** een nieuw filmplan begint met alleen A. **Ook met buddy plannen** activeert B, onafhankelijk van de bijnaamkeuze. Uitschakelen vraagt bevestiging bij B-invoer/geschiedenis (ook onopgeslagen), wist uitsluitend B en behoudt A. Een ander film/cinema/datum/tijd-plan begint weer solo.
- **Plan → Review → Eigen stappen:** **Controleer jullie filmavond** toont eigen bronlabels, volledige voorstelling, gewenste stoelen en afwijkingen/UNKNOWN. Bestaande invoerformulieren worden hergebruikt. Eerst lokaal controleren, dan de vijf geordende eigen stappen; wijzigingen maken de review ongeldig. Premium/toeslagen/pasgeldigheid/uitverkocht controleer je zelf.
- **Filmavond-overzicht:** eigen voorstelling, optionele buddy, alleen actieve kaarten met herkomst en leeftijd van de eigen controles, één berekende vervolgstap en conservatieve stoelvergelijking. Partiële eigen meldingen krijgen aparte hulp om de eerste reservering en het tweede account zelf te controleren. Beide eigen meldingen blijven ongeverifieerd. De vijf geordende stappen per persoon blijven behouden, met mismatch/logout/contextverlies/15-minuten-expiry en partiële uitkomsten.
- **Technische diagnose kopiëren:** eerst expliciete zelfcontrole met exacte preview. Alleen technische allowlistvelden; klembordsucces pas na bevestiging, bij weigering handmatig selecteren. De aparte GitHub-link stuurt niets mee. Geen uploads. Een stabiele schermlezerregio kondigt alleen betekenisvolle veranderingen aan, zonder pollruis.
- Originele tweestoelenbranding, lokale SVG/PNG-iconen en donker/crimson/goud ontwerp op 320px. De widget en 90-secondenproef werken uitsluitend op de verpakte fictieve fixturepagina. Geen productie-injectie.

## Privacy: zelf kiezen wat blijft

**Standaard tijdelijk.** De instelling **Onthoud mijn buddy-bijnamen op dit apparaat** staat uit. Alleen na inschakelen bewaart Chrome lokaal maximaal twaalf gevalideerde bijnaam/ID-paren, zonder selectie, accountidentiteit of boekingsgegevens. Chrome-opslag is **niet standaard versleuteld**. **Vergeet opgeslagen buddies**, uitschakelen of de lijst leegmaken verwijdert de opgeslagen lijst en het tijdelijke concept. Individuele verwijdering werkt ook in de opgeslagen lijst.

**Afzonderlijk concept, nooit automatisch.** **Bewaar tijdelijk filmplan-concept** bewaart alleen film, bioscoop, datum, tijd en optionele zaal maximaal vier uur in Chrome-sessiegeheugen. **Herstel concept** vult alleen ongecommitteerde invoervelden, zichtbaar als **Concept, opnieuw controleren**. Pas na eigen controle en **Bewaar filmplan** wordt het een nieuw actief plan, met lege controles. Nooit buddy’s, stoelen, status, vinkjes, bindings of bevestigingen in een concept.

| Gebeurtenis                              | Wat kan blijven                                                        | Wat wordt nooit hersteld                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Workerstop                               | Bewust onthouden bijnaamlijst; nog geldig expliciet opgeslagen concept | Gekozen buddy, samenmodus, review, actief plan, A/B-stappen, stoelen, observaties en contexten |
| Browserherstart                          | Alleen opt-in bijnaamlijst in storage.local                            | Sessieconcept en alle voortgang                                                                |
| Extensiereload/update/uitschakelen       | Alleen opt-in bijnaamlijst                                             | Sessieconcept en voortgang                                                                     |
| Volledig wissen / expliciet herverbinden | Geen opgeslagen lijst of concept na geslaagde verwijdering             | Alles begint opnieuw; geen echte boeking geannuleerd                                           |

**Rechten: sidePanel + storage.** Beide opslaggebieden worden vóór gebruik beperkt tot TRUSTED_CONTEXTS. De worker bewijst een normale popup/paneelcontext met Chrome-document-/venstermetadata; incognito of onbekende herkomst krijgt geen gedeelde/onthouden gegevens. Daar blijft lokaal handmatig plannen mogelijk. Chrome levert voor native popup/paneel soms geen document-/venstermetadata: die route werkt alleen zolang extensietoegang in incognito uitstaat. Staat die aan, gebruik dan **Open assistent in normaal venster**; de gewone extensietab heeft wel aantoonbare herkomst en volledige functionaliteit. Het normale paneel kan na eigen actie neutrale incognitometadata aan B koppelen; die metadata wordt nooit opgeslagen. Geen host-, cookies-, tabs-, scripting-, activeTab- of debuggerrechten, storage.sync, externe fonts, tracking of netwerkbackend. De popup ontvangt geen filmplan of A/B-/incognitodata; de fixture ontvangt geen onthouden bijnaam. [ADR-006](docs/decisions/ADR-006-explicit-local-retention.md) en [privacy-/Storeconcept](CHROMEWEBSTORE.md) beschrijven de precieze grenzen en wisfouten.

## Installeren en bouwen

Download **seatbuddies-chrome-test** uit [Sprint 06 Actions](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-15-sprint-06). Pak het Actions-archief én **seatbuddies-0.6.0-chrome-test.zip** uit. Open Chrome 116+ → chrome://extensions → Ontwikkelaarsmodus → Uitgepakte extensie laden → kies de map met manifest.json aan de root. Pin SeatBuddies, open de popup en klik **Open boekingsassistent**. Checksum staat naast de binnenste ZIP.

[Mac-proef na de bouw (10–15 min)](docs/macos-test-guide.md) · [Windows](docs/windows-test-guide.md) · [QA-formulier](docs/qa-evidence-template.md). Menselijke Mac-QA is niet vooraf vereist en wordt niet als uitgevoerd geclaimd.

Zelf bouwen met Node 24 LTS (.nvmrc) en npm, geen secrets:

```sh
npm ci
npm run check
npm run test:ui
npm run test:e2e
npm run package
```

`dist/` is direct unpacked laadbaar. `build/seatbuddies-0.6.0-chrome-test.zip` bevat alleen runtime, manifest, popup en iconen. Packaging controleert versies, exact verwachte rechten, runtime-allowlist, PNG-afmetingen, archiefbytes en checksum. Een audit van de gegenereerde bestanden weigert netwerkprimitieven/remote executable resources en afwijkende CSP; Zod gebruikt de interpreter zonder JIT. Statische audits zijn geen volledige securityaudit. `npm run icons` reproduceert de PNG’s; `npm run icons:check` vergelijkt exacte bytes met de vastgelegde dev-only resvg-rasterizer. `npm run dev` bouwt bij wijzigingen; herlaad daarna de extensie en heropen de UI.

Browsertests: `npm exec playwright install -- --with-deps chromium` op Linux, `npm exec playwright install -- chromium` op Mac. Native Linux: `HEADED=1 xvfb-run -a npm run test:e2e`; Mac: `HEADED=1 npm run test:e2e`. Deze beheerde cloud blokkeert unpacked extensies/incognito; dat beleid wordt niet gewijzigd. Renderercontrole kan met `CHROMIUM_PATH=/usr/bin/chromium XDG_CONFIG_HOME=/tmp/seatbuddy-chromium-config XDG_CACHE_HOME=/tmp/seatbuddy-chromium-cache npm run test:ui`. Gebruik zo nodig `npm ci --cache /tmp/seatbuddy-npm`.

## Uitvoering en grenzen

Linux en macOS Intel CI behouden installatie/check/unit/iconen/build/package en renderer-UI-tests; Linux draait daarnaast echte unpacked Chrome-proeven. Transportdoubles bewijzen geen native API-werking; Mac-renderertests bewijzen geen native Mac-popup/incognito/VoiceOver. [Feasibility](docs/feasibility.md) bevat de werkelijke head-SHA’s, runlinks, uitslagen en lokale blokkades. Oudere SeatMates/SeatBuddies-builds houden historische artifactnamen; gebruik die niet als 0.6.0.

**G0 live Vue NOT PASSED:** voorwaarden, echte accounts/DOM/seatmap/holds/checkout/bevestigingen zijn niet gevalideerd. Geen echte website-interacties, pas-autofill, accountomzeiling, betaling, annulering of definitieve reservering. Opeenvolgende stoelnummers bewijzen geen aangrenzende beschikbaarheid. Alleen de gebruiker handelt en controleert iedere echte boeking zelfstandig.

[Design en werkelijk gemaakte fictieve screenshots](docs/design-system.md) · [Changelog](CHANGELOG.md) · [Veilige Chrome-tooling](docs/agent-browser-debugging.md) · [G0-observatiegids](docs/g0-human-observation-guide.md). Sprint 06 volgt [issue #15](https://github.com/johndobry89/SeatBuddy/issues/15), gestapeld op `feat/issue-12-sprint-05` / [draft PR #14](https://github.com/johndobry89/SeatBuddy/pull/14). [ADR-007](docs/decisions/ADR-007-ephemeral-planning-review.md) beschrijft mode/review en het aangescherpte vluchtige protocol. Geen merge, release of Storepublicatie.

Independent third-party tool. Not affiliated with or endorsed by Vue Cinemas. Reservations remain separate and are only final when independently confirmed by Vue.

**Review en lokaal terugzetten:** review bevestigt alleen dat je zelf de ingevoerde planning hebt bekeken. Wissen, opnieuw beginnen of solo kiezen wijzigt uitsluitend assistentgegevens. Geen van deze acties boekt, annuleert of herstelt iets op Vue; er is geen Undo booking. Vue kan wijzigen; deze niet-officiële assistent kan dan ophouden te werken.

**Grotendeels ontwikkeld met ondersteuning van OpenAI Codex.** Broncode, tests en wijzigingen staan op GitHub. GitHub Actions bevat automatische controles; de concrete resultaten per commit staan in feasibility en de runs. Menselijke controles, native Mac/VoiceOver en live Vue-onderzoek worden apart vermeld. Geslaagde automatische tests bewijzen geen menselijke securityaudit of acceptatie door de eigenaar.
