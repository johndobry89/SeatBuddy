# SeatBuddies — The Reality Gate 0.9.0-test

Een onafhankelijke Chrome Manifest V3-assistent met Vue 3/strict TypeScript voor één filmavond en **solo of twee zelfstandige boekingstrajecten**. Geen backend, accountsysteem of automatische boeking. **G0 live Vue is niet gehaald.** Alleen eigen invoer en fictieve testpagina’s; zelfmeldingen zijn geen websitebevestiging.

## The Reality Gate

Sprint 09 voegt een **alleen-lezend fictief adapterlab** op de eigen testpagina toe: zichtbare voorstelling, gewijzigd DOM, canvas, dubbelzinnige labels/zaal, mismatch, ontbrekende gegevens en gesimuleerde serverfout. Begrensde typed output heeft uitsluitend status UNKNOWN; labels bewijzen geen selectie, beschikbaarheid of boeking. Nieuwe tijdelijke A/B-ontvangstbewijzen kunnen geen werkende filmavond verhogen of gelezen velden opslaan. [Ontwerp en grenzen](docs/decisions/ADR-008-fiction-only-read-port.md).

Het [gedateerde openbare Vue-onderzoek](docs/g0-public-research-2026-10.md) is **BLOCKED** door proxy-403 op de voorwaardenindex. De actuele Movie Pass-voorwaarden, FAQ-antwoorden en read-only toestemming zijn niet geverifieerd. Geen voorwaarden-PASS of werkende Vue-integratie geclaimd. [G0-beslismatrix](docs/g0-decision-matrix.md) · [onverzonden verduidelijkingsconcept](docs/vue-clarification-draft.md) · [latere publieke observatiekaart](docs/g0-owner-observation-card.md).

Sprint 08's reset-/TTL-/diagnosefixes, licentienotices en native tests uit de SHA256-gecontroleerde ZIP blijven behouden. [Historisch integratiebewijs](docs/integration-readiness.md) · [beveiligingsreview](docs/security-review-sprint08.md) · [mergeplan](docs/merge-plan.md). Geen merge, deployment of release. Menselijke Mac-acceptatie blijft NOT_RUN.

## Wat werkt

- **Kortere eerste filmavond:** filmgegevens en gewenste A/B-stoelen in één formulier bewaren, daarna dezelfde lokale review en vijf eigen stappen. Gemeten pointerklikken vanaf open paneel: solo 15 → 14, samen 24 → 22; geen live Vue- of tijdsbesparingsclaim. [Meetmethode](docs/ux-friction-audit.md).
- **Controleer SeatBuddies** onder bestaande diagnostiek voert twaalf afgebakende lokale controles uit: geïsoleerde fictieve logica/adapter/protocol plus Chrome-API-aanwezigheid. Tijdelijk FICTIONAL_TEST-rapport, annuleren/herhalen en privacyveilige kopie. Geen werkend plan/opslag/tabbladen lezen of wijzigen; PASS bewijst geen echte boeking of native browserwerking.
- **Wat doet SeatBuddies?** en **Start met een fictieve proef ↗** in popup/lege start: alleen de eigen verpakte testpagina. Onopgeslagen film-/A-concepten blijven bij gewone viewwissel/polling en passieve workervervanging in het open document; nooit herstel van review/voortgang. B wisselt veilig mee met zijn context.

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

Download **seatbuddies-chrome-test** uit [Sprint 09 Actions](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-21-sprint-09). Pak het Actions-archief én **seatbuddies-0.9.0-chrome-test.zip** uit. Open Chrome 116+ → chrome://extensions → Ontwikkelaarsmodus → Uitgepakte extensie laden → kies de map met manifest.json aan de root. Pin SeatBuddies, open de popup en klik **Open boekingsassistent**. Checksum staat naast de binnenste ZIP.

[Van ZIP tot eerste filmavond (Mac, 5–8 min)](docs/macos-test-guide.md) · [Windows](docs/windows-test-guide.md) · [QA-formulier](docs/qa-evidence-template.md). Menselijke Mac-QA is niet vooraf vereist en wordt niet als uitgevoerd geclaimd.

Zelf bouwen met Node 24 LTS (.nvmrc) en npm, geen secrets:

```sh
npm ci
npm run check
npm run test:ui
npm run test:e2e
npm run test:adversarial
npm run package
```

`dist/` is direct unpacked laadbaar; native tests installeren uitsluitend de checksum-gecontroleerde, eigen uitgepakte ZIP. LICENSE en THIRD_PARTY_NOTICES.txt horen bij de runtime. `build/seatbuddies-0.9.0-chrome-test.zip` bevat alleen runtime, manifest, popup en iconen. Packaging controleert versies, exact verwachte rechten, runtime-allowlist, PNG-afmetingen, archiefbytes en checksum. Een audit van de gegenereerde bestanden weigert netwerkprimitieven/remote executable resources en afwijkende CSP; Zod gebruikt de interpreter zonder JIT. Statische audits zijn geen volledige securityaudit. De aangescherpte audit weigert ook ontbrekende/ontsnappende lokale imports, remote afbeeldingen en ongeldige gegenereerde JS. [Nieuwe technische review](docs/security-review-sprint08.md). `npm run icons` reproduceert de PNG’s; `npm run icons:check` vergelijkt exacte bytes met de vastgelegde dev-only resvg-rasterizer. `npm run dev` bouwt bij wijzigingen; herlaad daarna de extensie en heropen de UI.

Browsertests: `npm exec playwright install -- --with-deps chromium` op Linux, `npm exec playwright install -- chromium` op Mac. Gerichte native smoke: `HEADED=1 npm run test:smoke:chrome` (Linux met xvfb). Native Linux: `HEADED=1 xvfb-run -a npm run test:e2e`; Mac: `HEADED=1 npm run test:e2e`. Deze beheerde cloud blokkeert unpacked extensies/incognito; dat beleid wordt niet gewijzigd. Renderercontrole kan met `CHROMIUM_PATH=/usr/bin/chromium XDG_CONFIG_HOME=/tmp/seatbuddy-chromium-config XDG_CACHE_HOME=/tmp/seatbuddy-chromium-cache npm run test:ui`. Gebruik zo nodig `npm ci --cache /tmp/seatbuddy-npm`.

## Uitvoering en grenzen

Linux en macOS Intel CI behouden installatie/check/unit/iconen/build/package en renderer-UI-tests; Linux draait daarnaast de volledige native suite; macOS Intel ook twee native smoketests. Transportdoubles bewijzen geen native API-werking; Mac-renderertests bewijzen geen native Mac-popup/incognito/VoiceOver; de nieuwe native smoke heeft een eigen beperkte scope en afzonderlijke uitslag. [Feasibility](docs/feasibility.md) bevat de werkelijke head-SHA’s, runlinks, uitslagen en lokale blokkades. Oudere SeatMates/SeatBuddies-builds houden historische artifactnamen; gebruik die niet als 0.9.0.

**G0 live Vue NOT PASSED:** voorwaarden, echte accounts/DOM/seatmap/holds/checkout/bevestigingen zijn niet gevalideerd. Geen echte website-interacties, pas-autofill, accountomzeiling, betaling, annulering of definitieve reservering. Opeenvolgende stoelnummers bewijzen geen aangrenzende beschikbaarheid. Alleen de gebruiker handelt en controleert iedere echte boeking zelfstandig.

[Design en werkelijk gemaakte fictieve screenshots](docs/design-system.md) · [Changelog](CHANGELOG.md) · [Veilige Chrome-tooling](docs/agent-browser-debugging.md) · [G0-observatiegids](docs/g0-human-observation-guide.md). Sprint 08 volgt [issue #19](https://github.com/johndobry89/SeatBuddy/issues/19), gestapeld op `feat/issue-17-sprint-07` / [draft PR #18](https://github.com/johndobry89/SeatBuddy/pull/18). [ADR-007](docs/decisions/ADR-007-ephemeral-planning-review.md) beschrijft mode/review en het aangescherpte vluchtige protocol. Geen merge, release of Storepublicatie.

Independent third-party tool. Not affiliated with or endorsed by Vue Cinemas. Reservations remain separate and are only final when independently confirmed by Vue.

**Review en lokaal terugzetten:** review bevestigt alleen dat je zelf de ingevoerde planning hebt bekeken. Wissen, opnieuw beginnen of solo kiezen wijzigt uitsluitend assistentgegevens. Geen van deze acties boekt, annuleert of herstelt iets op Vue; er is geen Undo booking. Vue kan wijzigen; deze niet-officiële assistent kan dan ophouden te werken.

**Grotendeels ontwikkeld met ondersteuning van OpenAI Codex.** Broncode, tests en wijzigingen staan op GitHub. GitHub Actions bevat automatische controles; de concrete resultaten per commit staan in feasibility en de runs. Menselijke controles, native Mac/VoiceOver en live Vue-onderzoek worden apart vermeld. Geslaagde automatische tests bewijzen geen menselijke securityaudit of acceptatie door de eigenaar.
