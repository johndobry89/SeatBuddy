# Operation Reboot — 0.11.0-test

**22 oktober 2026.** Branch `feat/issue-27-sprint-12` vanaf ongewijzigde Sprint11 **764234ca94fbaafbeaa96281add7182ea704c728**. Alleen gestapelde draft naar `feat/issue-25-sprint-11`; main/PR-keten niet gewijzigd. Geen merge, publicatie, release, deploy of email.

De normale start is één compact scherm met één **Open Vue Quick Ticket**-link, geen administratie. De oude functies staan achter **Ontwikkelaarstests** en blijven optioneel bruikbaar. De rode knop is gerepareerd bij de oorzaak, niet verborgen als oplossing. [Review](security-review-sprint12.md) · [benchmark](ux-reset-benchmark.md) · [onderzoek](vue-integration-decision-2026-10.md) · [korte Mac-kaart](macos-test-guide.md).

**PRODUCT_VALUE NO-GO.** Een rustiger startscherm is nog geen two-tab killer. Geen nieuwe geverifieerde broninformatie of echte tijdwinst; stop verdere functie-uitbreiding pending officieel toegestane read-only integratie. G0 live NO-GO/toestemming INCONCLUSIVE. De oude menselijke proef was geïnstalleerd/renderend maar UX FAIL; nieuwe menselijke0.11-acceptatie NOT_RUN.

## Exacte testbuild

Artifact **seatbuddies-chrome-test** bevat alleen **seatbuddies-0.11.0-chrome-test.zip** en diens **.zip.sha256**. De binnenste runtime-ZIP: **31 bestanden, 127404 bytes**. SHA256:

```text
355a4260140495f990c7b4b282b62a160068bc4af1eeb89a431aecd509a2cb37
```

Rootmanifest MV3 /0.11.0, popup, Side Panel, fictieve fixture, lokale assets/iconen16/32/48/128, LICENSE en vijf volledige MIT-notices. Uitsluitend sidePanel/storage, spanning, strikte CSP; geen host-/optional-permissies, content scripts, backend/netwerkcode of privédata. Actions-wrapperdigest is een ander object. Native CI downloadt de werkelijke wrapper en controleert beide lagen plus bovenstaande vaste inner hash vóór installatie. Geen renderer-double als native bewijs gepresenteerd.

## Uitvoeringsledger

| Controle                                                                                                          | Werkelijk resultaat tot deze commit                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --cache /tmp/seatbuddy-npm`                                                                               | PASS,218 packages; geen dependency toegevoegd/geüpgraded                                                                                                                                                                                                                         |
| Flicker vóór reparatie                                                                                            | **FAIL**,10 vertraagde polls: disabled=true, opacity0.6, focusfalse                                                                                                                                                                                                              |
| Flicker na reparatie                                                                                              | **PASS**,10×2seconden virtueel: disabledfalse, opacity1, focustrue;0 live-regionruis; echte actie wel disabled, oud antwoord genegeerd                                                                                                                                           |
| Eerste volledige gebouwde renderercontrole                                                                        | **31 UI PASS**,1.4m; alle27 bestaande regressies behouden via bewuste ontwikkelaarstoegang                                                                                                                                                                                       |
| Eerste packagingpoging                                                                                            | **FAIL**: audit herkende Vite's statische backtickimport niet; gericht gerepareerd met dezelfde exact-lokale targetcontrole en7 regressies                                                                                                                                       |
| `npm run package` na auditreparatie                                                                               | PASS, bovenstaande31 runtimebestanden/hash; geen audit uitgezet                                                                                                                                                                                                                  |
| Volledige lokale check / renderer / audit                                                                         | PASS: format,lint,strict TS,iconen,331unit in19bestanden,build;31UI opnieuw PASS(1.5m); nieuwe hulp/fallbackregressie afzonderlijk PASS; npm audit0 gerapporteerde kwetsbaarheden.                                                                                               |
| Lokale native suite                                                                                               | **BLOCKED**: alle11 pogingen timeout vóór serviceworker; beheerd ExtensionInstallBlocklist=*, niet gewijzigd. Geen lokale native PASS.                                                                                                                                           |
| Onafhankelijke ZIP-controle                                                                                       | PASS: CRC, SHA256,31 byte-identieke dist-bestanden,rootmanifest/notices; twee volledige builds leveren dezelfde inner hash.                                                                                                                                                      |
| Eerste implementatie-CI,5269c77, [39860781659](https://github.com/johndobry89/SeatBuddy/actions/runs/39860781659) | Linux31UI/9native PASS,2native FAIL(3m41s): echte popup scrollt door intrinsieke breedte; oudere incognitohersteltest opent ontwikkelaartools niet. Min-breedte320 en expliciete ontwikkelaarstoegang gerepareerd; geen norm versoepeld. Mac-status afzonderlijk te controleren. |
| Menselijke Mac/Windows/arm64/VoiceOver/Chrome116/Finder                                                           | **NOT_RUN**                                                                                                                                                                                                                                                                      |
| Vue/account/checkout/boeking/betaling/annulering                                                                  | **NOT_RUN**, niet geactiveerd                                                                                                                                                                                                                                                    |

## Gemeten fictief ontwerp, geen echte tijdwinst

Eerste daadwerkelijke benchmarkoutput, uitsluitend oorspronkelijke lokale fixtures, Chromium154: baseline twee eigen contexten **3+3klikken**,0keys/velden/modals/scrollEvents,193+157ms automatisering. Compact prototype **3klikken**,0keys/modals/scrollEvents,178ms automatisering; de gehele oudere fixturepagina bevat7optionele velden, prototype zelf **0 vereiste velden**. Milliseconden zijn machineafhankelijk, exclusief opstart/login en **geen menselijke tijdmeting**. De gecontroleerde data maken de kandidaat opzettelijk makkelijk; geen claim tegenover echte Vue. Werkelijke gelijkwaardige taak voor beide **HUMAN_NOT_RUN**. [Volledige methode/killcriteria](ux-reset-benchmark.md).

## Installeren

1. Kies de geslaagde exacte Sprint12-run via [Actions](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-27-sprint-12), controleer beide platformconclusies en download het artifact.
2. Pak de wrapper uit. Vergelijk `shasum -a 256 seatbuddies-0.11.0-chrome-test.zip` met alle64 tekens hierboven en de `.zip.sha256`. Bij afwijking stoppen. Pak de binnenste ZIP uit.
3. Chrome116+ → chrome://extensions → ontwikkelaarsmodus → Uitgepakte extensie laden → vaste map met manifest.json direct aan de root. Controleer0.11.0 en alleen sidePanel/storage; pinicoon. Geen extra websiterechten of incognito nodig. Beleidblokkade niet omzeilen.
4. Popup → **Open Vue Quick Ticket**. Side Panel optioneel onder **Hulp en privacy → Open boekingsassistent**; bij API-fout normale-vensterfallback. Ieder eigen account/sessie; deze knop opent geen apart B-account. Geen live boeking vereist voor de korte proef.

## PR-overdracht

De draft is **daadwerkelijk geprobeerd** via `gh pr create --draft`, base `feat/issue-25-sprint-11`, head `feat/issue-27-sprint-12`, concrete titel en volledige body. **POST https://api.github.com/graphql: Forbidden.** Geen PR aangemaakt door Codex en geen authomweg. Issue#27 staat deze fallback toe: [exacte gestapelde compare](https://github.com/johndobry89/SeatBuddy/compare/feat/issue-25-sprint-11...feat/issue-27-sprint-12?expand=1) en [volledige titel/body](sprint12-pr.md). Kies uitsluitend Create draft pull request; niets mergen. Branch is gepusht; geen verzonnen PR-nummer.
