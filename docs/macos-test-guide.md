# Van ZIP tot eerste filmavond — Mac, 0.8.0-test

Korte eerste proef: **5–8 minuten**, uitsluitend fictief, in een eigen toegestaan Chrome-testprofiel. Geen echte accounts of tickets. Deze menselijke proef is **NOT_RUN** totdat iemand hem werkelijk uitvoert; de bouw en automatische tests wachten er niet op. [Actuele SHA/CI-scope](feasibility.md) · [privacyveilig QA-formulier](qa-evidence-template.md).

## 0–2 minuten — downloaden en installeren

1. Open [Sprint 08 Actions](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-19-sprint-08). Kies de run voor de juiste branch/volledige commit en lees Linux én macOS Intel; een groene build is geen menselijke Mac-acceptatie. Download artifact **seatbuddies-chrome-test**.
2. Pak eerst de **buitenste Actions-artifact-ZIP** uit. Daarin staan **seatbuddies-0.8.0-chrome-test.zip** en **.zip.sha256**. Vergelijk desgewenst `shasum -a 256 seatbuddies-0.8.0-chrome-test.zip` met het checksum-bestand. Pak daarna de **binnenste runtime-ZIP** uit naar een vaste map.
3. Selecteer straks de map waarin **manifest.json direct aan de root** staat, naast popup.html, sidepanel.html, fixture.html, background.js, icons/ en assets/. Chrome 116+ → chrome://extensions → Ontwikkelaarsmodus → **Uitgepakte extensie laden**. Controleer SeatBuddies **0.8.0**, twee rode stoelen, alleen **sidePanel + storage**, geen websiterechten. Pin het icoon. Bij beheerblokkade: BLOCKED noteren, beleid niet wijzigen.

## 2–5 minuten — popup, solo en samen

1. Klik het echte toolbaricoon, daarna **Open boekingsassistent**. Het Side Panel hoort te openen; een gewone tab is een aparte fallback. Bij onduidelijke native herkomst met incognitotoegang aan: **Open assistent in normaal venster**. Noteer welke route je test. **Wat doet SeatBuddies?** → **Start met een fictieve proef ↗** opent alleen de eigen lokale fixture, niet Vue.
2. Begin met **Ik ga alleen**: B niet actief, geen bijnaam nodig. Vul **De maan van papier**, **Fictief Filmhuis**, **12 april 2030**, **19:30**, **Zaal 2**, gewenste rij **F**/stoel **10** in. Eén keer **Bewaar filmplan**. Klik **Ik heb de gegevens gecontroleerd — naar de eigen stappen**. Doorloop A’s vijf eigen stappen. Alles blijft zelf gemeld, niet op Vue geverifieerd; er is niets geboekt.
3. Kies **Ook met buddy plannen**. Open zo nodig B’s **Voorstelling en stoel voor B controleren**, vul dezelfde voorstelling met **F11**, bewaar B en review opnieuw. A’s reeds gemelde controles blijven; B heeft eigen stappen. Doorloop desgewenst B’s stappen: ook twee eigen meldingen zijn geen echte bevestigingen.
4. Wijzig B’s opgeslagen stoel naar F12: review moet vervallen, A’s eigen controles blijven. Kies daarna **Ik ga alleen** → **Wis lokaal B en plan solo**. B verdwijnt; A blijft. Dit wist alleen assistentdata en annuleert niets. Een buddybijnaam blijft optioneel; de uitgebreide bijlage bevat CRUD/onthouden/vergeten.

## 5–8 minuten — lokale proef en veilig rapport

1. Open **Diagnostiek zonder privégegevens** → **Controleer SeatBuddies**. Wacht op **Lokale proef geslaagd** of **Lokale proef niet volledig uitgevoerd**. Lees FICTIONAL_TEST en de afzonderlijke PASS/FAIL/NOT_TESTED-regels. Deze proef test eigen geïsoleerde modellen/adapter en API-aanwezigheid; **geen boeking, huidige planning, opgeslagen bijnamen, echte opslagwerking of incognitotabs**. De filmavond mag niet veranderen.
2. Bekijk de exacte tijdelijke preview. Optioneel **Kopieer lokale testsamenvatting**; succes pas na echte klembordrespons. Bij weigering **Selecteer diagnose voor handmatig kopiëren** en ⌘C. **Wis diagnostische momentopname** ruimt de preview op, geen upload.
3. Voor andere technische vragen bestaat daarnaast **Voer zelfcontrole uit** → **Kopieer technische diagnose**. Dat is een afzonderlijke capability-/bewijsmomentopname. **Meld een probleem** opent een leeg GitHub-issue zonder bijlage; plak alleen het geschoonde checklistresultaat/allowlistrapport. Geen volledige logs, namen, filmwaarden, tab-URL’s, tickets of screenshots van ingelogd Chrome meesturen.

## Acceptatiekaart — zeven acties, maximaal circa acht minuten

Iedere status begint **NOT_RUN**. Kies na uitvoering PASS/FAIL/BLOCKED; noteer bij FAIL uitsluitend stap en geschoonde feitelijke afwijking. Een automatische zelftest vult deze menselijke kaart niet in.

| Actie                                                     | Verwacht                                                                                      | Menselijke status | FAIL / BLOCKED-notitie |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------- | ---------------------- |
| 1. Artifact/checksum, beide ZIP-lagen, rootmanifest laden | 0.8.0, twee rode stoelen, exact sidePanel/storage; LICENSE + THIRD_PARTY_NOTICES.txt aanwezig | NOT_RUN           | —                      |
| 2. Toolbarpopup → Open boekingsassistent                  | Echte Side Panel-opening; eventuele normale assistenttab als aparte route noteren             | NOT_RUN           | —                      |
| 3. Fictief SOLO-plan + F10, review en A-stappen           | B niet actief; uitsluitend eigen invoer/zelfmelding, niets op Vue geverifieerd                | NOT_RUN           | —                      |
| 4. Ook met buddy plannen, B F11 en opnieuw review         | Twee zelfstandige trajecten; A blijft, B begint zelf                                          | NOT_RUN           | —                      |
| 5. B-probleem, wijziging en bewust lokaal resetten        | Partiële/UNKNOWN-uitleg; review vervalt, A behouden, geen annulering                          | NOT_RUN           | —                      |
| 6. Optioneel fictieve bijnaam onthouden en vergeten       | Standaard uit; bewuste opslag, bevestigde verwijdering, geen accountgegevens                  | NOT_RUN           | —                      |
| 7. Controleer SeatBuddies, preview/kopie en wissen        | FICTIONAL_TEST; huidige filmavond blijft; weigering heeft handmatige kopieerroute             | NOT_RUN           | —                      |

Worker-/browserherstart, incognito en VoiceOver staan in de uitgebreide bijlage en blijven NOT_RUN totdat echt uitgevoerd. Veilig melden: **Meld een probleem** opent een leeg GitHub-issue; vermeld de exacte Actions-SHA, versienummers, actienummer, verwacht/feitelijk en status. Alleen allowlistdiagnose optioneel zelf plakken; geen persoonlijke browserlogs, echte film-/ticket-/accountdata of profielbeelden.

## Kopieerbare menselijke checklist — niets vooraf geslaagd

Neem de **exacte volledige commit-SHA uit de gedownloade Actions-run** over; het runtimeversienummer alleen identificeert de commit niet. Laat niet uitgevoerde regels NOT_RUN. BLOCKED krijgt één korte, geschoonde reden. De geautomatiseerde zelftest is geen vervanging voor deze menselijke regels.

```text
SeatBuddies 0.8.0-test / menselijke fictieve Mac-proef
Build SHA: <volledige SHA uit Actions-run>
Actions URL: <run-URL>
macOS / Chrome-versie: <alleen versienummers>
Profiel: eigen toegestaan testprofiel
Route: native popup+Side Panel / normale assistenttab / nog niet getest
ZIP/checksum/manifest-root/versie/iconen/rechten: NOT_RUN
Toolbarpopup → echte Side Panel-opening: NOT_RUN
SOLO plan → lokale review → vijf eigen A-stappen: NOT_RUN
TOGETHER → B afzonderlijk / geen websitebevestiging: NOT_RUN
B wijziging/reset behoudt A: NOT_RUN
Lokale FICTIONAL_TEST / huidige filmavond blijft gelijk: NOT_RUN
Privacyveilige kopie / weigering handmatig afgevangen: NOT_RUN
Optioneel onthouden/vergeten: NOT_RUN
VoiceOver / arm64 / browserherstart / live Vue: NOT_RUN
Afwijking: <stap, verwacht, feitelijk; uitsluitend fictief en geschoond>
```

Bijwerken: nieuwe runtime naar een eigen vaste map uitpakken, op chrome://extensions herladen en **0.8.0** controleren. Herladen wist sessieconcept/voortgang, niet de expliciet bewaarde nickname-lijst. Verwijderen: extensie verwijderen, daarna eigen uitgepakte map wissen. **G0 live Vue NOT PASSED.**

---

# Bijlage — uitgebreide Mac-proef in 10–15 minuten

Deze menselijke proef volgt **na de bouw**. Alleen fictieve namen/film/stoelen, neutrale tabs en een toegestaan eigen testprofiel. Geen echte accounts, tickets of checkout. De eerdere gemelde Mac-opening is alleen USER_REPORTED_PARTIAL_SMOKE; geen volledige A/B- of opslagproef. CI-scope en actuele resultaten staan in [feasibility](feasibility.md).

## 0–3 minuten: installeren en openen

1. Download **seatbuddies-chrome-test** uit [Sprint 08 Actions](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-19-sprint-08); controleer SHA en beide jobs. Pak de Actions-wrapper en daarna **seatbuddies-0.8.0-chrome-test.zip** uit. Vergelijk desgewenst `shasum -a 256 seatbuddies-0.8.0-chrome-test.zip` met de bijbehorende `.sha256`.
2. Bewaar de binnenste map bijvoorbeeld in Documenten/SeatBuddies-test/0.8.0. Daar staan direct manifest.json, popup.html, sidepanel.html, fixture.html, background.js, icons/ en assets/. Chrome 116+ → chrome://extensions → Ontwikkelaarsmodus → Uitgepakte extensie laden → kies die map. Verplaats hem daarna niet.
3. Controleer versie 0.8.0, twee rode stoelen en rechten **sidePanel + storage**. Storage is nodig voor expliciet onthouden/conceptopslag. Geen websitehostrechten. Pin SeatBuddies en klik het icoon: de echte popup opent. Klik **Open boekingsassistent** voor het paneel. Bij blokkade normale Chrome-zijpaneelroute proberen; geen organisatiebeleid wijzigen.

## 3–6 minuten: buddy’s en toestemming

1. Begin in een normaal venster. De lijst is leeg en **Onthoud mijn buddy-bijnamen op dit apparaat** staat uit. Voeg fictieve **Filmmaatje** toe, hernoem naar **Avondbuddy**. Geen echte naam, e-mail, pasnummer of wachtwoord invoeren.
2. Kies Avondbuddy, annuleer de B-waarschuwing één keer, bevestig daarna bewust. Popup en paneel moeten dezelfde keuze tonen. Een gekozen nickname activeert B niet: nieuwe plannen beginnen solo. Zonder nickname blijft bewust samen plannen wel mogelijk.
3. Schakel onthouden bewust in. Lees: alleen nickname/ID, lokale Chrome-opslag **niet standaard versleuteld**. Sluit/heropen de popup: toestemming/lijst blijven. Een bijnaam is geen account of abonnement.
4. **Vergeet opgeslagen buddies** of uitschakelen verwijdert opgeslagen lijst én concept; huidige namen mogen tijdelijk in geheugen blijven. Individueel verwijderen en **Wis alle buddy’s** moeten ook de opgeslagen lijst bijwerken/wissen. Een foutmelding is geen geslaagde verwijdering; bij ontoegankelijke opslag verwijdert uninstall de Chrome-extensieopslag.

## 6–10 minuten: Filmavond-overzicht en onafhankelijkheid

1. Volg eventueel **Probeer SeatBuddies in 90 seconden**. Bewaar fictief: **De maan van papier**, **Fictief Filmhuis**, **12 april 2030**, **19:30**, **Zaal 2**. Het overzicht toont dit als eigen invoer, met **Wat moet ik nu doen?**. Zonder zaal moet UNKNOWN blijven.
2. Controleer eerst **Ik ga alleen** en B niet actief. Kies bewust **Ook met buddy plannen**, vul A F10 en B F11 in via de bestaande eigen invoerkaarten, bewaar beide en klik **Ik heb de gegevens gecontroleerd — naar de eigen stappen**. Dit is uitsluitend lokale review. Doorloop zelf A’s vijf geordende stappen; B blijft onafhankelijk. Eén afgeronde eigen melding is partieel, twee zijn **NOT SITE VERIFIED**. De extensie boekt niets. Controleleeftijd en herkomst moeten zichtbaar blijven; na 15 minuten vervallen eigen controles.
3. Wijzig B’s tijd naar 21:00: mismatch moet veilige stop/vergelijking aangeven. Herstel de invoer zelf. F10/F11: **CONSECUTIVE_UNVERIFIED**, geen officiële plattegrond, aangrenzendheid, gangpad-, categorie-, beschikbaarheids- of holdbewijs. Andere rij: geen bewezen aangrenzendheid.
4. Typ onopgeslagen A/B-velden, open de popup en laat enkele statuspolls verlopen: gewone polling mag die invoer niet wissen. Kies een nieuwe fictieve buddy, annuleer eerst, bevestig daarna: alleen B’s oude invoer/context/controles verdwijnen; A blijft behouden. Actief hernoemen/verwijderen volgt dezelfde regel.

## Sprint 06: review, herstel en toegankelijk kopiëren

- Wijzig B’s opgeslagen stoel of tijd: review vervalt, A’s al gemelde controles blijven. Onopgeslagen wijzigingen blokkeren de lokale volgende stappen totdat je ze bewaart en opnieuw reviewt. Ontbrekende/afwijkende zaal blijft UNKNOWN; er is geen gereedmelding.
- Laat A fictief afronden, meld bij B **Uitkomst onzeker / mislukt** of een mismatch: twee aparte kaarten tonen bron/leeftijd, A alleen zelf gemeld, B probleem/UNKNOWN. Open **Eerste reservering controleren** en **Tweede account opnieuw nalopen**: alleen eigen menselijke instructies, geen verzonnen beheerlink/annulering/refund.
- Kies **Ik ga alleen** terwijl B invoer heeft. Controleer focus op de bevestiging, annuleer één keer (**Behoud buddytraject**) en bevestig daarna **Wis lokaal B en plan solo**. Alleen B verdwijnt/wordt lokaal gewist; A blijft. Een ander film/cinema/datum/tijd-plan start weer solo. Zaalbewerking in dezelfde voorstelling behoudt de keuze, maar plan opslaan wist beide checks zoals aangegeven.
- Open **Diagnostiek zonder privégegevens** → **Voer zelfcontrole uit**. De preview is exact de kopieertekst; controleer dat geen nickname/film/stoel/URL/ID aanwezig is. **Kopieer technische diagnose** moet pas na klembordtoestemming succes melden; bij weigering selecteren en zelf ⌘C. **Meld een probleem** opent een leeg GitHub-issue zonder meegestuurde diagnose.
- Alleen toetsenbord: popupknop → assistent → solo/samen → eigen invoer bewaren → review → vijf eigen stappen → diagnose. Focus moet naar keuze/bevestiging/eerste nog open eigen stap/diagnose gaan. Wacht twee statuspolls: geen herhaalde live-aankondiging. Controleer VoiceOver, reduced-motion en 320px apart; automatische Mac-rendererchecks zijn geen menselijke toegankelijkheidsproef.

**Review en terugzetten zijn uitsluitend lokaal.** De extensie maakt geen reservering, draait geen boeking terug en annuleert geen ticket of Movie Pass-abonnement. Beide zelf gemeld blijft **echte bevestiging op Vue niet geverifieerd**. Bewaar geen screenshots met privégegevens.

## 10–13 minuten: concept, worker en echte browserherstart onderscheiden

1. Open **Filmplan-concept veilig bewaren of herstellen**, klik zelf **Bewaar tijdelijk filmplan-concept**. Dit kan ook zonder nickname-onthouden. Alleen vijf filmvelden, maximaal vier uur; geen selectie, stoelen, stappen of contexten.
2. Voor een natuurlijke workerstop: sluit popup/paneel/fixture/inspecties, laat Chrome de worker stoppen en heropen. DevTools/polling kan hem wakker houden. Een geforceerde workerstop heeft afzonderlijk native CI-bewijs; noteer precies wat je zelf uitvoerde. Na echte workervervanging mogen opt-in bijnamen terugkomen, **geen gekozen buddy, samenmodus, review, actief plan, stoelen, A/B-stappen of bindings**.
3. Klik zelf **Herstel concept**: alleen bewerkbare formuliervelden komen terug met **Concept, opnieuw controleren**; het overzicht blijft zonder actief plan. Pas na eigen controle en **Bewaar filmplan** begint een nieuw plan in SOLO met lege controles/review. **Verwijder concept** wist de opslag, niet je huidige formuliervelden.
4. **Opnieuw laden** van de extensie is geen workerstop: het wist Chrome-sessieopslag. Een volledige browserherstart doet dat ook; alleen opt-in nickname/ID mag blijven. Sla vóór een afzonderlijke browserherstartproef opnieuw een fictief concept op, sluit Chrome volledig af (⌘Q) en heropen: concept/voortgang weg, alleen opgeslagen bijnamen terug. Claim geen cold-restart-PASS als je alleen het paneel sloot.

## 13–15 minuten: context, demo, wissen en bediening

1. Desgewenst zelf **Toestaan in incognito** inschakelen via extensiedetails. Dit kan de extensie herladen en concept/voortgang wissen. Open normale/incognitovensters uitsluitend op about:blank. Chrome kan bij native popup/paneel onvoldoende herkomstmetadata leveren. Zodra incognitotoegang aanstaat weigert die onduidelijke route gedeelde gegevens. Klik dan **Open assistent in normaal venster**: een gewone extensietab met volledige functionaliteit, aantoonbaar normale herkomst en zonder websites/accounts te openen. Deze **normale assistenttab** kan na expliciet lijst ophalen neutrale A-/B-contextmetadata koppelen; geen accountbewijs. Popup heeft geen koppelrechten. Een popup/paneel uit incognito of onbekende context mag geen onthouden gegevens lezen/wijzigen; de lokale handmatige fallback blijft beschikbaar. Trek toestemming weer in: B-koppeling vervalt; geen metadata wordt opgeslagen.
2. Open de fictieve testpagina onder Simulatie / technische proef. Controleer dynamische fictieve schermstappen en widget verbergen/herplaatsen: één widget, **DEMO · NIET GEBOEKT · GEEN VUE INTEGRATIE**. Een onthouden bijnaam wordt hier niet gedeeld. Geen echte pagina-injectie. Verpakte hoofdpagina’s in incognito zijn geen geldige spanning-proefroute.
3. Toetsenbord: Tab/Shift+Tab/Enter/Spatie, zichtbare focus, buddybevestiging, privacycheckbox, conceptknoppen; richting 320px geen horizontale overflow. Controleer desgewenst VoiceOver apart. Automatische Mac-UI-tests bewijzen geen VoiceOver of native Mac-bediening.
4. **Diagnostiek zonder privégegevens** mag alleen versie/capabilities/rechtenscope/bewijsklassen/opslagmodus tonen; geen namen, film, URL’s of tab-ID’s. **Wis alle tijdelijke gegevens** en expliciet herverbinden wissen ook opgeslagen bijnamen/concept. Verwijderen: chrome://extensions → SeatBuddies → Verwijderen; daarna eigen uitgepakte map wissen.

Meld uitsluitend fictieve geschoonde feiten met [het QA-formulier](qa-evidence-template.md): OS/Chrome/0.8.0/commit/run/stap/verwacht/feitelijk en PASS/FAIL/NOT_RUN/BLOCKED/INCONCLUSIVE. Geen privébrowserbeelden, accountdata, tickets of echte nicknames. Bij beleidblokkade BLOCKED registreren en handmatig verder; geen beleid/profielbestanden omzeilen.
