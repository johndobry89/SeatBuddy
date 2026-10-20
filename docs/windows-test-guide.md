# Windows-testbuild installeren — SeatMates 0.2.0-test

Dit is een **testbuild**, geen Chrome Web Store-release en geen werkende Vue-boekingsintegratie. Je hebt desktop Chrome 116 of nieuwer nodig op een computer waarop je zelf extensies mag installeren. Windows-uitvoering is niet in de Linux-cloud gevalideerd.

## Download en uitpakken

1. Open [Actions voor de Sprint 02-branch](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-5-sprint-02). Kies de run bij de juiste commit; bekijk ook of de tests geslaagd zijn. Een bouwartefact bewijst geen geslaagde browsertest.
2. Download onder **Artifacts** het bestand **seatmates-windows-test**. Mogelijk moet je ingelogd zijn op GitHub om artefacten te downloaden.
3. Klik in Verkenner met rechts op het gedownloade ZIP-bestand → **Alles uitpakken**. Het Actions-archief bevat `seatmates-0.2.0-windows-test.zip` en een SHA-256-bestand.
4. Pak ook **de binnenste ZIP** uit, bijvoorbeeld naar `Documenten\SeatMates-test\`. In die map moet `manifest.json` staan, naast `background.js`, `sidepanel.html`, `fixture.html` en `assets`.
5. Open `chrome://extensions`. Zet rechtsboven **Ontwikkelaarsmodus** aan. Kies **Uitgepakte extensie laden** en selecteer de map die `manifest.json` bevat. Selecteer geen ZIP en ook niet de bovenliggende map.
6. Pin SeatMates via het puzzelstukje in de Chrome-werkbalk. Klik op het icoon: het echte zijpaneel moet openen. Noteer Chrome-versie, Windows-versie, build/commit en eventuele foutmelding zonder privégegevens.

Als Chrome meldt dat je beheerder dit blokkeert: stop de installatieproef. Wijzig geen organisatiebeleid. Gebruik een eigen toegestane computer of vraag de beheerder om de juiste toegang.

## De handmatige assistent proberen

1. Gebruik eerst fictieve gegevens: **De maan van papier**, **Fictief Filmhuis**, **12 april 2030**, **19:30**, **Zaal 2**. Kies **Bewaar filmplan**.
2. Open per kaart **Voorstelling en stoel controleren**. Vul bijvoorbeeld A: rij F, stoel 10 en B: rij F, stoel 11 in. Bewaar de eigen invoer voordat je de controles uitvoert.
3. Loop de stappen voor A door. A mag dan **Zelf gemeld afgerond** tonen terwijl B ongecontroleerd blijft. Er is nog steeds geen waargenomen websitebevestiging. Test daarna een probleem bij B; A mag niet stilzwijgend wijzigen.
4. Controleer dat opeenvolgende nummers alleen als **niet geverifieerd naast elkaar** worden weergegeven. Laat de zaal leeg of verander B's tijd: er mag geen volledige voorstellingmatch ontstaan.
5. Probeer het paneel met een smalle breedte, Tab/Shift+Tab, Enter en de uitklapbare onderdelen. Deel uitsluitend screenshots met fictieve gegevens.
6. Gebruik alleen als je dat zelf wilt de gewone link naar de officiële Vue-homepage. Die opent een normale browserpagina in de huidige context, geen tweede account. De extensie leest of bedient die pagina niet. Een echte boeking is geen onderdeel van deze installatieproef.

## Incognito: expliciet toestaan en weer intrekken

1. Open in `chrome://extensions` **Details** van SeatMates. Schakel zelf **Toestaan in incognito** in, alleen als browserbeleid dit toelaat en je die proef wilt uitvoeren.
2. Open handmatig een normaal venster en een incognitovenster met elk een neutrale lege tab. Je hoeft niet in te loggen.
3. Ga in het normale SeatMates-paneel per kaart naar **Browsercontext kiezen of loskoppelen**. Klik bewust op **Vensterlijst ophalen / vernieuwen**; er wordt niet op de achtergrond gescand. Gebruik bij meerdere vensters **Toon gekozen venster** om je keuze te controleren. Kies voor A de actieve normale tab en voor B de actieve incognitotab. De lijst bevat bewust geen paginatitels of URL’s. Vergelijk de vensters zelf, vooral als je meerdere hebt geopend.
4. De koppeling bewijst alleen tab-/venster-/incognitometadata; geen account, voorstelling of boeking. Verbreek de koppeling weer en test navigeren/sluiten: alleen de betreffende eigen controles moeten vervallen.
5. Schakel **Toestaan in incognito** weer uit. Als Chrome de wijziging uitstelt, sluit je eerst alle eigen testincognitovensters en controleer je opnieuw. B moet zijn koppeling verliezen; een extensieherstart mag alle tijdelijke gegevens wissen. Controleer opnieuw in het normale paneel.

**Belangrijk:** een `spanning`-extensie kan `fixture.html` niet als hoofdpagina van een incognitotab laden. Probeer dat niet als bewijsroute voor B. De fictieve A/B-simulatie staat los van deze echte contextproef. Bij ontbrekende toegang of onduidelijke vensters gebruik je de handmatige begeleiding in aparte eigen profielen; de extensie claimt dan geen geïsoleerde accounts.

## Bijwerken, wissen en verwijderen

- **Wis alle tijdelijke gegevens** wist plan, koppelingen en eigen controles. Een workerherstart of browserherstart begint ook opnieuw; er wordt niets automatisch uitgevoerd.
- Voor een nieuwe testbuild: pak uit in een nieuwe of bewust vervangen eigen map, laad die build en controleer de weergegeven versie. Verwijder desgewenst eerst de vorige testextensie om dubbele panelen te vermijden.
- Verwijderen: `chrome://extensions` → SeatMates → **Verwijderen**. Daarna kun je de zelf uitgepakte testmap verwijderen.
- Voor zelf bouwen: Node.js 24 LTS, `npm ci`, `npm run check`, `npm run package`. De ZIP en checksum verschijnen in `build/`. Er is geen backend, accountsecret of server nodig.
