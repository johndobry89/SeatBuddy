# Mac — SeatBuddies 0.5.0-test in 10–15 minuten

Deze menselijke proef volgt **na de bouw**. Alleen fictieve namen/film/stoelen, neutrale tabs en een toegestaan eigen testprofiel. Geen echte accounts, tickets of checkout. De eerdere gemelde Mac-opening is alleen USER_REPORTED_PARTIAL_SMOKE; geen volledige A/B- of opslagproef. CI-scope en actuele resultaten staan in [feasibility](feasibility.md).

## 0–3 minuten: installeren en openen

1. Download **seatbuddies-chrome-test** uit [Sprint 05 Actions](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-12-sprint-05); controleer SHA en beide jobs. Pak de Actions-wrapper en daarna **seatbuddies-0.5.0-chrome-test.zip** uit. Vergelijk desgewenst `shasum -a 256 seatbuddies-0.5.0-chrome-test.zip` met de bijbehorende `.sha256`.
2. Bewaar de binnenste map bijvoorbeeld in Documenten/SeatBuddies-test/0.5.0. Daar staan direct manifest.json, popup.html, sidepanel.html, fixture.html, background.js, icons/ en assets/. Chrome 116+ → chrome://extensions → Ontwikkelaarsmodus → Uitgepakte extensie laden → kies die map. Verplaats hem daarna niet.
3. Controleer versie 0.5.0, twee rode stoelen en rechten **sidePanel + storage**. Storage is nieuw en nodig voor expliciet onthouden/conceptopslag. Geen websitehostrechten. Pin SeatBuddies en klik het icoon: de echte popup opent. Klik **Open boekingsassistent** voor het paneel. Bij blokkade normale Chrome-zijpaneelroute proberen; geen organisatiebeleid wijzigen.

## 3–6 minuten: buddy’s en toestemming

1. Begin in een normaal venster. De lijst is leeg en **Onthoud mijn buddy-bijnamen op dit apparaat** staat uit. Voeg fictieve **Filmmaatje** toe, hernoem naar **Avondbuddy**. Geen echte naam, e-mail, pasnummer of wachtwoord invoeren.
2. Kies Avondbuddy, annuleer de B-waarschuwing één keer, bevestig daarna bewust. Popup en paneel moeten dezelfde keuze tonen. Zonder buddy blijven de vijf eigen stappen per persoon bruikbaar.
3. Schakel onthouden bewust in. Lees: alleen nickname/ID, lokale Chrome-opslag **niet standaard versleuteld**. Sluit/heropen de popup: toestemming/lijst blijven. Een bijnaam is geen account of abonnement.
4. **Vergeet opgeslagen buddies** of uitschakelen verwijdert opgeslagen lijst én concept; huidige namen mogen tijdelijk in geheugen blijven. Individueel verwijderen en **Wis alle buddy’s** moeten ook de opgeslagen lijst bijwerken/wissen. Een foutmelding is geen geslaagde verwijdering; bij ontoegankelijke opslag verwijdert uninstall de Chrome-extensieopslag.

## 6–10 minuten: Filmavond-overzicht en onafhankelijkheid

1. Volg eventueel **Probeer SeatBuddies in 90 seconden**. Bewaar fictief: **De maan van papier**, **Fictief Filmhuis**, **12 april 2030**, **19:30**, **Zaal 2**. Het overzicht toont dit als eigen invoer, met **Wat moet ik nu doen?**. Zonder zaal moet UNKNOWN blijven.
2. Vul A F10 en B F11 in via de eigen invoerkaarten. Doorloop zelf A’s vijf geordende stappen; B blijft onafhankelijk. Eén afgeronde eigen melding is partieel, twee zijn **NOT SITE VERIFIED**. De extensie boekt niets. Controleleeftijd en herkomst moeten zichtbaar blijven; na 15 minuten vervallen eigen controles.
3. Wijzig B’s tijd naar 21:00: mismatch moet veilige stop/vergelijking aangeven. Herstel de invoer zelf. F10/F11: **CONSECUTIVE_UNVERIFIED**, geen officiële plattegrond, aangrenzendheid, gangpad-, categorie-, beschikbaarheids- of holdbewijs. Andere rij: geen bewezen aangrenzendheid.
4. Typ onopgeslagen A/B-velden, open de popup en laat enkele statuspolls verlopen: gewone polling mag die invoer niet wissen. Kies een nieuwe fictieve buddy, annuleer eerst, bevestig daarna: alleen B’s oude invoer/context/controles verdwijnen; A blijft behouden. Actief hernoemen/verwijderen volgt dezelfde regel.

## 10–13 minuten: concept, worker en echte browserherstart onderscheiden

1. Open **Filmplan-concept veilig bewaren of herstellen**, klik zelf **Bewaar tijdelijk filmplan-concept**. Dit kan ook zonder nickname-onthouden. Alleen vijf filmvelden, maximaal vier uur; geen selectie, stoelen, stappen of contexten.
2. Voor een natuurlijke workerstop: sluit popup/paneel/fixture/inspecties, laat Chrome de worker stoppen en heropen. DevTools/polling kan hem wakker houden. Een geforceerde workerstop heeft afzonderlijk native CI-bewijs; noteer precies wat je zelf uitvoerde. Na echte workervervanging mogen opt-in bijnamen terugkomen, **geen gekozen buddy, actief plan, stoelen, A/B-stappen of bindings**.
3. Klik zelf **Herstel concept**: alleen bewerkbare formuliervelden komen terug met **Concept, opnieuw controleren**; het overzicht blijft zonder actief plan. Pas na eigen controle en **Bewaar filmplan** begint een nieuw plan met lege controles. **Verwijder concept** wist de opslag, niet je huidige formuliervelden.
4. **Opnieuw laden** van de extensie is geen workerstop: het wist Chrome-sessieopslag. Een volledige browserherstart doet dat ook; alleen opt-in nickname/ID mag blijven. Sla vóór een afzonderlijke browserherstartproef opnieuw een fictief concept op, sluit Chrome volledig af (⌘Q) en heropen: concept/voortgang weg, alleen opgeslagen bijnamen terug. Claim geen cold-restart-PASS als je alleen het paneel sloot.

## 13–15 minuten: context, demo, wissen en bediening

1. Desgewenst zelf **Toestaan in incognito** inschakelen via extensiedetails. Dit kan de extensie herladen en concept/voortgang wissen. Open normale/incognitovensters uitsluitend op about:blank. Het **normale paneel** kan na expliciet lijst ophalen neutrale A-/B-contextmetadata koppelen; geen accountbewijs. Popup heeft geen koppelrechten. Een popup/paneel uit incognito of onbekende context mag geen onthouden gegevens lezen/wijzigen; de lokale handmatige fallback blijft beschikbaar. Trek toestemming weer in: B-koppeling vervalt; geen metadata wordt opgeslagen.
2. Open de fictieve testpagina onder Simulatie / technische proef. Controleer dynamische fictieve schermstappen en widget verbergen/herplaatsen: één widget, **DEMO · NIET GEBOEKT · GEEN VUE INTEGRATIE**. Een onthouden bijnaam wordt hier niet gedeeld. Geen echte pagina-injectie. Verpakte hoofdpagina’s in incognito zijn geen geldige spanning-proefroute.
3. Toetsenbord: Tab/Shift+Tab/Enter/Spatie, zichtbare focus, buddybevestiging, privacycheckbox, conceptknoppen; richting 320px geen horizontale overflow. Controleer desgewenst VoiceOver apart. Automatische Mac-UI-tests bewijzen geen VoiceOver of native Mac-bediening.
4. **Diagnostiek zonder privégegevens** mag alleen versie/capabilities/rechtenscope/bewijsklassen/opslagmodus tonen; geen namen, film, URL’s of tab-ID’s. **Wis alle tijdelijke gegevens** en expliciet herverbinden wissen ook opgeslagen bijnamen/concept. Verwijderen: chrome://extensions → SeatBuddies → Verwijderen; daarna eigen uitgepakte map wissen.

Meld uitsluitend fictieve geschoonde feiten met [het QA-formulier](qa-evidence-template.md): OS/Chrome/0.5.0/commit/run/stap/verwacht/feitelijk en PASS/FAIL/NOT_RUN/BLOCKED/INCONCLUSIVE. Geen privébrowserbeelden, accountdata, tickets of echte nicknames. Bij beleidblokkade BLOCKED registreren en handmatig verder; geen beleid/profielbestanden omzeilen.
