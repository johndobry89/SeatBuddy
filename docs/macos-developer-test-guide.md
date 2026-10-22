> Historische Sprint11-ontwikkelaarkaart. Voor 0.11.0 eerst bewust **Ontwikkelaarstests** openen; geen standaardroute of menselijke acceptatie-eis. Oude versie-/hashverwijzingen niet als actuele download gebruiken. Actueel: [korte Mac-kaart](macos-test-guide.md) en [oplevering](reboot-delivery.md).

# Mac-kaart — eerste 5–8 minuten, 0.10.1-test

**Alle menselijke resultaten nu NOT_RUN.** Alleen eigen toegestaan Chrome-testprofiel en verzonnen gegevens. Geen Vue-login nodig; geen echte pagina, stoelactie of ticket. Deze sprint wacht niet op je proef. De losse [optionele publieke G0-kaart](g0-owner-observation-card.md) komt pas daarna.

1. **0–2 min:** open [Sprint 11 Actions](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-25-sprint-11), kies de exacte oplever-SHA en controleer Linux én macOS Intel. Download **seatbuddies-chrome-test**; pak de buitenste artifact-ZIP uit. Vergelijk `shasum -a 256 seatbuddies-0.10.1-chrome-test.zip` met `.zip.sha256`; pak daarna deze **binnenste ZIP** uit naar een vaste map. Chrome 116+ → chrome://extensions → ontwikkelaarsmodus → Uitgepakte extensie laden → map met **manifest.json direct aan root**. Controleer 0.10.1, twee rode stoelen, alleen sidePanel/storage en geen websiterechten. Beleidblokkade = BLOCKED, geen omzeiling.
2. **2–3 min:** pin het toolbaricoon → popup → **Open boekingsassistent**. Noteer echte Side Panel-opening apart van de normale-tabfallback. Houd incognitotoegang voor deze eerste proef uit; bij herkomstfout is **Open assistent in normaal venster** de expliciete fallback.
3. **3–5 min:** SOLO, fictief **De maan van papier / Fictief Filmhuis / 12-04-2030 / 19:30 / Zaal 2 / F10**. Bewaar filmplan → **Ik heb de gegevens gecontroleerd — naar de eigen stappen** → A's vijf eigen stappen. Kies **Ook met buddy plannen**, vul B dezelfde voorstelling en F11 in, bewaar B en review opnieuw. A blijft zelfstandig; beide zijn uitsluitend zelf gemeld. Geen aangrenzendheid/boekingsgarantie.
4. **5–6 min:** open **Voorstelling en stoel voor B controleren**, wijzig B naar F12 en **Bewaar eigen invoer B** → review vervalt, A blijft. Via **Buddy kiezen of beheren** kun je ook een fictieve buddy toevoegen/kiezen en de B-wiswaarschuwing bevestigen: B wordt leeg, A blijft. **Ik ga alleen**: bevestig zo nodig **Wis lokaal B en plan solo**. Is B door de buddywissel al leeg, dan volgt solo direct. B weg, A behouden. Dit wist alleen lokale data en annuleert niets. Bijnaam is optioneel; onthouden/vergeten staat in de bijlage.
5. **6–8 min:** **Diagnostiek zonder privégegevens** → **Controleer SeatBuddies**. Lees FICTIONAL_TEST en per item PASS/FAIL/NOT_TESTED. De huidige filmavond blijft gelijk. Klik voor technische diagnose op **Voer zelfcontrole uit**, lees de preview en kies **Kopieer technische diagnose**; pas na succes staat er “Technische diagnose gekopieerd”. Kopieer desgewenst die exacte tijdelijke preview; bij klembordweigering zelf selecteren/⌘C. Geen upload. Proef-PASS bewijst geen Vue-, account-, opslag- of volledige Mac-werking.

Gebruik één terugmelding voor deze kaart én de optionele ZERO EXTRA-proef; kopieer geen tweede formulier. Vul alleen uitgevoerde regels in:

```text
Build: 0.10.1-test | volledige commit-SHA: … | Actions-run: …
Binnenste ZIP SHA256: …
macOS / Chrome-versie: … / …
M1 ZIP/checksum/rootmanifest/rechten: NOT_RUN — …
M2 popup → echt Side Panel OF normale assistenttab: NOT_RUN — …
M3 SOLO/review/A-stappen: NOT_RUN — …
M4 samen/B zelfstandig/A behouden: NOT_RUN — …
M5 B wijzigen/buddywissel/solo behoudt A: NOT_RUN — …
M6 FICTIONAL_TEST/filmavond gelijk/diagnosekopie: NOT_RUN — …
M7 ZERO EXTRA (optioneel): NOT_RUN — …
```

Vervang NOT_RUN uitsluitend door feitelijk PASS, FAIL of BLOCKED. Bij FAIL: één korte geschoonde afwijking (stap, verwacht → feitelijk). Geen echte naam, pasnummer, account, persoonlijke URL, ingelogde screenshot of ruwe browserlog. VoiceOver, arm64 en browserherstart blijven NOT_RUN als je die niet apart uitvoert. [Betekenis van statussen](qa-evidence-template.md). Herladen/update wist voortgang en sessieconcept; alleen bewust bewaarde nickname-lijst mag blijven. Verwijderen via Chrome wist extensieopslag. **G0 live Vue NOT PASSED.**

## ZERO EXTRA — optioneel daarna, circa drie minuten

Alle onderstaande menselijke regels blijven **NOT_RUN**. Alleen verzonnen gegevens, geen echte accounts/stoelen of betaling. Open in het paneel **Diagnostiek zonder privégegevens** → **Simulatie / technische proef** → **Open fictieve testpagina**. Ga op die lokale pagina naar **ZERO EXTRA · twee fictieve buurstoelen**; kies bij **Fictieve stoelkaart** het scenario en klik **Zoek 2 stoelen zonder extra betaling (DEMO)**. Je hoeft geen tab te koppelen of waarneming te versturen.

| Proef                                                                                             | Verwacht                                                                                                                                         | Menselijke status |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| Open bestaande fictieve testpagina → ZERO EXTRA-lab → gemengde Saver/Super Saver → Zoek 2 stoelen | Alleen DEMO/FICTIONAL_GEOMETRY, twee fysieke fixtureburen, geen echte beschikbaarheid/boeking                                                    | NOT_RUN           |
| Kies uitsluitend Ultra Lux met fictief €0, daarna gangpad en onbekende fees                       | Nooit Ultra Lux-paar; geen paar over gangpad; onbekend is geen nul                                                                               | NOT_RUN           |
| Toegankelijke DEMO-route                                                                          | Standaard geen kandidaat; alleen bewuste route plus bekende fictieve voorwaarden; onbekende voorwaarden blijven UNKNOWN                          | NOT_RUN           |
| Bewaar in bestaande eigen-invoerkaart B optioneel Ultra Lux                                       | Review geblokkeerd; A blijft. Saver Lux daarna slechts categorie-CANDIDATE, bijbetaling UNKNOWN; zelf op Vue na pas en vóór afronden controleren | NOT_RUN           |

Geen gezondheidsgegevens, pasnummers, account-/prijsbeelden delen. [Productregels en tegenvoorbeelden](seatbuddies-business-rules.md). De hoofdroute heeft geen nieuwe verplichte categorie/kostencheckbox.

---

# Bijlage — uitgebreide Mac-proef in 10–15 minuten

Deze menselijke proef volgt **na de bouw**. Alleen fictieve namen/film/stoelen, neutrale tabs en een toegestaan eigen testprofiel. Geen echte accounts, tickets of checkout. De eerdere gemelde Mac-opening is alleen USER_REPORTED_PARTIAL_SMOKE; geen volledige A/B- of opslagproef. CI-scope en actuele resultaten staan in [feasibility](feasibility.md).

## 0–3 minuten: installeren en openen

1. Download **seatbuddies-chrome-test** uit [Sprint 11 Actions](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-25-sprint-11); controleer SHA en beide jobs. Pak de Actions-wrapper en daarna **seatbuddies-0.10.1-chrome-test.zip** uit. Vergelijk vóór uitpakken `shasum -a 256 seatbuddies-0.10.1-chrome-test.zip` met de bijbehorende `.sha256`.
2. Bewaar de binnenste map bijvoorbeeld in Documenten/SeatBuddies-test/runtime. Daar staan direct manifest.json, popup.html, sidepanel.html, fixture.html, background.js, icons/ en assets/. Chrome 116+ → chrome://extensions → Ontwikkelaarsmodus → Uitgepakte extensie laden → kies die map. Verplaats hem daarna niet.
3. Controleer versie 0.10.1, twee rode stoelen en rechten **sidePanel + storage**. Storage is nodig voor expliciet onthouden/conceptopslag. Geen websitehostrechten. Pin SeatBuddies en klik het icoon: de echte popup opent. Klik **Open boekingsassistent** voor het paneel. Bij blokkade normale Chrome-zijpaneelroute proberen; geen organisatiebeleid wijzigen.

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

Meld uitsluitend fictieve geschoonde feiten met [het QA-formulier](qa-evidence-template.md): OS/Chrome/0.10.1/commit/run/stap/verwacht/feitelijk en PASS/FAIL/NOT_RUN/BLOCKED/INCONCLUSIVE. Geen privébrowserbeelden, accountdata, tickets of echte nicknames. Bij beleidblokkade BLOCKED registreren en handmatig verder; geen beleid/profielbestanden omzeilen.

## Als installeren niet lukt of je bijwerkt

- **Chrome vindt manifest.json niet:** je hebt meestal de buitenste map gekozen. Pak eerst de Actions-wrapper en daarna de versie-ZIP uit. Kies de map waarin manifest.json direct staat; geen ZIP-bestand en geen map die alleen een tweede ZIP bevat.
- **ZIP corrupt, checksum anders, verkeerde versie of extra bestanden zoals broncode/profielen:** stop. Download het artifact van de exact geslaagde opleverrun opnieuw. De checksum bewijst bytes ten opzichte van die bron, geen digitale ondertekening of boekingsveiligheid.
- **Side Panel geweigerd/onbeschikbaar:** de popup toont de fout én **Open assistent in normaal venster**. Dat opent uitsluitend een eigen normale extensietab. Noteer de fallback afzonderlijk; dit is geen Side Panel-PASS. Organisatiebeleid nooit wijzigen/omzeilen.
- **Update met behoud van toegestane bijnamen:** sluit de assistent. Controleer de nieuwe ZIP. Bewaar de geregistreerde runtime-map op exact dezelfde plek; vervang de **hele inhoud** door de nieuwe inner ZIP-inhoud (oude assets weg, geen geneste map). Klik daarna **Opnieuw laden** op dezelfde extensie in chrome://extensions en controleer 0.10.1. Een ZIP in een andere versiemap uitpakken en de oude extensie herladen werkt niet: Chrome leest de oude locatie. Een nieuwe locatie laden kan een tweede extensie-ID/lijst maken. Bij voorkeur voor de eerste proef schoon installeren in een apart testprofiel; uninstall wist ook bewust bewaarde bijnamen.
- Update/reload is een bewuste nieuwe start: geen actief plan, samenmodus, selectie, stoelen, review, bindings of controles herstellen. Het sessieconcept verdwijnt; uitsluitend de vrijwillig bewaarde nickname-lijst mag terugkomen.

## Ontwikkelaarsbijlage: reproduceerbare upgradeproef

De native CI bouwt de oude runtime uit commit `d042bdf4988e743f2d975cc231df9b248ba9b461` met dezelfde gepinde dependencies. De verwachte oude inner hash is `32cc58a640f1b4232f9be4130c424827111e222e3d70dc4f08b46762cc215575`. Stel voor een lokale native run `SEATBUDDIES_BASELINE_ZIP` in op die gecontroleerde 0.10.0-ZIP, of plaats die onder build/seatbuddies-0.10.0-chrome-test.zip. Geen gebruikersprofiel downloaden. Het nieuwe pakket komt in CI uit de werkelijk gedownloade huidige Actions-wrapper; `SEATBUDDIES_ARTIFACT_ZIP` en diens verwachte upload-digest worden door de workflow gezet. Alle testprofielen zijn afzonderlijk en worden verwijderd. Browserbeleid blijft leidend. Dit is geautomatiseerde Chrome reload/update-evidence, geen menselijke Finder-/toolbar-/Mac-acceptatie.
