# macOS — SeatMates 0.3.0-test in 10–15 minuten

Gebruik uitsluitend fictieve filmgegevens en neutrale tabs in een eigen, toegestaan testprofiel. Geen echte Vue-accounts of boekingen. Chrome desktop 116+ is vereist. De melding van 20 oktober 2026 dat de extensie op Mac installeert en visueel opent is **USER_REPORTED_PARTIAL_SMOKE**; de onderstaande A/B-proef is daarmee nog niet uitgevoerd. Geautomatiseerd Mac-bewijs en menselijke Mac-QA worden apart bijgehouden in [feasibility](feasibility.md).

## 0–3 minuten: downloaden en openen

1. Open [Actions voor Sprint 03](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-7-sprint-03). Kies de run bij de gewenste commit en controleer de afzonderlijke Linux- en macOS-resultaten.
2. Download **seatmates-chrome-test** onder Artifacts (GitHub-login kan nodig zijn). Pak het Actions-archief uit. Dubbelklik daarna ook op de binnenste **seatmates-0.3.0-chrome-test.zip**. Dezelfde browsercode is bestemd voor Mac en Windows; een ZIP-naam bewijst geen OS-test. Oudere Sprint 02-runs hebben nog `seatmates-windows-test`; gebruik de versies niet door elkaar.
3. Bewaar de uitgepakte map bijvoorbeeld onder `Documenten/SeatMates-test/0.3.0/`. Daarin moet direct **manifest.json** staan, naast `background.js`, `sidepanel.html`, `fixture.html` en `assets/`. Kies straks deze binnenste map, geen ZIP of bovenliggende map. Optioneel in Terminal: `shasum -a 256 seatmates-0.3.0-chrome-test.zip` en vergelijk de volledige waarde met het `.sha256`-bestand.
4. Open `chrome://extensions`, schakel **Ontwikkelaarsmodus** in, kies **Uitgepakte extensie laden** en selecteer die map. Controleer op Details versie **0.3.0**, incognito aanvankelijk uit, en geen website-/cookie-/debuggerrechten. Bij een beheerdersblokkade: stop deze proef; wijzig geen beleid.
5. Pin SeatMates via het puzzelstukje. Klik het icoon om het echte zijpaneel te openen. Sluit en heropen het paneel via het icoon. Na een nieuwe build: klik **Opnieuw laden** op de extensiekaart en heropen het paneel; oude voortgang mag vervallen.

## 3–7 minuten: afzonderlijke fictieve A/B-stappen

1. Plan **De maan van papier**, **Fictief Filmhuis**, **12 april 2030**, **19:30**, **Zaal 2**. Bewaar met het toetsenbord: Tab naar **Bewaar filmplan**, Enter. Focus hoort naar “Controleer A en B afzonderlijk” te gaan.
2. Open per kaart **Voorstelling en stoel … controleren**. Bewaar A: F10 en B: F11. Type een veld over meerdere pollingrondes: onopgeslagen tekst mag niet verdwijnen.
3. Doorloop uitsluitend A's vijf eigen stappen als fictieve zelfmeldingen. A toont **Zelf gemeld afgerond**, B blijft ongecontroleerd en de partiële melding verschijnt. Dit bewijst geen websitebevestiging. **MANUAL_SELF_REPORT** is eigen invoer; echt websitebewijs blijft **UNKNOWN**.
4. Verander B's aanvang naar 21:00, bewaar en meld de accountstap. De voorstellingstap moet blokkeren. A's eigen voortgang blijft staan. Meld bij B een uitlogprobleem; alleen B moet opnieuw controleren.
5. Herstel B naar het plan. Ook als beide tijden gelijk zijn en F10/F11 elkaar numeriek opvolgen, mag er geen gegarandeerde buurstoel, beschikbaarheid of hold worden getoond. Laat de zaal leeg in een nieuw plan: vergelijking blijft UNKNOWN en eerdere controles vervallen.
6. Open **Alle gegevens wissen**, wis en controleer lege invoer, lege koppelingen en beide personen ongecontroleerd. Optioneel: bekijk de aparte **Simulatie / technische proef**; uitkomsten moeten SIMULATION blijven.

## 7–11 minuten: neutrale Chrome-contexten, opt-in en intrekken

1. Open alleen neutrale `about:blank`-tabs: één normaal venster, één incognitovenster via **⌘⇧N**. Log nergens in. Bij ontbrekende incognitoondersteuning noteer je BLOCKED en gebruik je de handmatige route.
2. Geef in `chrome://extensions` → SeatMates → Details zelf **Toestaan in incognito**. Chrome kan de extensie herladen en het paneel sluiten; heropen via het icoon. Eerdere tijdelijke gegevens mogen verdwijnen.
3. Open in het normale paneel per A/B-kaart **Browsercontext kiezen of loskoppelen** en klik bewust **Vensterlijst ophalen / vernieuwen**. Kies de actieve normale tab voor A en incognito voor B. Gebruik **Toon gekozen venster** om het juiste neutrale venster te herkennen. De lijst bevat alleen nummers en contextsoort, geen titels of URL’s.
4. De bron is nu **BROWSER_CONTEXT_ONLY**: geen account-/persoonsidentiteit of websitewaarneming. Je mag B niet aan een normale tab koppelen. Sluit A's gekoppelde testtab: A's koppeling en controles vervallen; B blijft zelfstandig zolang de worker niet herstart.
5. Trek **Toestaan in incognito** weer in. Als Chrome vraagt om incognitovensters te sluiten, sluit alleen je eigen testvensters en controleer opnieuw. B verliest zijn koppeling; een extensiereload mag alle voortgang wissen. Heropen het normale paneel indien nodig.

Laad `fixture.html` niet als hoofdpagina in incognito: dat ondersteunt `spanning` niet. De neutrale contextproef bewijst ook geen twee echte Vue-logins of uniforme incognito-Side-Panelwerking.

## 11–15 minuten: lifecycle, diagnostiek en bediening

1. Maak opnieuw een fictief plan. Open bij `chrome://extensions` de serviceworkerinspectie van **deze testextensie**. Controleer dat niets gevoeligs wordt gelogd; sluit DevTools weer (inspectie kan de worker wakker houden). Laat de worker daarna stoppen door inactiviteit. Een open, pollend paneel kan hem wakker houden; sluit dat paneel tijdens wachten. Heropen het paneel: eerder verdwenen gegevens worden niet hersteld, je vult het plan opnieuw in. Een paneel dat een nieuwe worker aantreft toont hersteladvies. Geen automatische actie.
2. Voor een deterministische resetproef kun je **Opnieuw laden** op de extensiekaart gebruiken en het paneel heropenen. Noteer dit als _extensiereload_, niet als bewezen natuurlijke worker-suspensie. De echte geforceerde workerstop heeft een afzonderlijke geautomatiseerde Chrome-test.
3. Bij verbindingsverlies blijft tijdelijk lokaal plannen mogelijk. **Verbind opnieuw en wis tijdelijke gegevens** vraagt bewust een nieuwe start: lokale én coördinatorgegevens (ook in andere SeatMates-panelen) worden gewist. Er wordt geen mislukte melding opnieuw verstuurd. Als verbinden mislukt, blijft je lokale invoer behouden.
4. Open **Diagnostiek zonder privégegevens**. Er verschijnt pas een rapport na **Voer zelfcontrole uit**. Controleer versie, capabilities, contexttoestemming, modus en **NOT_IMPLEMENTED / DISABLED_G0 / MEMORY_ONLY**. Capabilities betekenen dat de API bestaat, niet dat beleid iedere actie toestaat. Het rapport bevat geen film, tabnummers, titels of URL’s en wordt niet verstuurd. Wis de momentopname.
5. Sleep het echte paneel zo smal mogelijk richting 320px. Controleer Tab/Shift+Tab, Enter, zichtbare focus, leesbare herstelmeldingen en geen horizontale overflow. Als Chrome een andere minimumbreedte afdwingt, noteer die; de automatische UI-proef gebruikt exact 320px. Eventueel macOS-instelling voor toetsenbordnavigatie inschakelen als Tab geen knoppen bereikt. VoiceOver-kwaliteit blijft een afzonderlijke menselijke controle.

## Fouten melden, bijwerken en verwijderen

- **Manifest ontbreekt:** open in Finder de map met `manifest.json`; een Actions-ZIP bevat nog een tweede ZIP. Een broncheckout zonder `dist/` is nog niet gebouwd.
- **Dubbele versie/panelen:** verwijder de oude testextensie, laad één bewust gekozen uitgepakte map en controleer Details plus diagnostische versie. Verplaats die map daarna niet.
- **Paneel sluit na toestemming/reload:** heropen via het werkbalkicoon. Tijdelijke gegevens kunnen terecht verdwenen zijn.
- **Managed policy of Developer mode ontbreekt:** noteer BLOCKED; geen policy-/profielbestanden aanpassen.
- **Verwijderen:** `chrome://extensions` → SeatMates → Verwijderen; verwijder daarna desgewenst je eigen uitgepakte testmap.

Bugmelding: gebruik [qa-evidence-template.md](qa-evidence-template.md), bijvoorbeeld “macOS-versie / Chrome-versie / 0.3.0 / commit / stap 4 / verwacht B ongewijzigd / feitelijk … / PASS of FAIL”. Deel alleen fictieve gegevens. Geen accountnamen, browsergeschiedenis, persoonlijke schermen of ongeschoonde logs. Voor echt G0-onderzoek: eerst de afzonderlijke [handmatige observatiegids](g0-human-observation-guide.md).
