# Mac — SeatBuddies 0.4.0-test in 10–15 minuten

Voer deze menselijke test **na de bouw** uit. Gebruik uitsluitend fictieve nicknames, film-/stoelgegevens en neutrale tabs in een eigen toegestaan testprofiel. Geen echte accounts, tickets of checkoutacties. De gemelde visuele opening van SeatMates op 20 oktober 2026 blijft **USER_REPORTED_PARTIAL_SMOKE**, geen volledige A/B-QA. Automatische Mac- en Linux-bewijzen staan afzonderlijk in [feasibility](feasibility.md).

## 0–3 minuten: installeren en de popup openen

1. Open [Sprint 04 Actions](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-10-sprint-04); controleer commit en beide jobs. Download **seatbuddies-chrome-test** (GitHub-login kan nodig zijn). Pak het Actions-archief uit en daarna ook **seatbuddies-0.4.0-chrome-test.zip**.
2. Bewaar de binnenste uitgepakte map, bijvoorbeeld `Documenten/SeatBuddies-test/0.4.0/`. Daarin staan direct `manifest.json`, `background.js`, `popup.html`, `sidepanel.html`, `fixture.html`, `icons/` en `assets/`. Kies geen ZIP of bovenliggende map. Optioneel: `shasum -a 256 seatbuddies-0.4.0-chrome-test.zip`, vergelijk met `.sha256`.
3. Open `chrome://extensions`, zet **Ontwikkelaarsmodus** aan en kies **Uitgepakte extensie laden**. Selecteer die map. Chrome 116+ vereist. Controleer **SeatBuddies**, versie **0.4.0**, de twee rode stoelen en alleen Side Panel-rechten. Verwijder een oude testinstallatie als je anders dubbele iconen/panelen hebt. Verplaats de geladen map daarna niet.
4. Pin SeatBuddies via het puzzelstukje en klik het icoon. Nu opent de **popup**, met “Met wie ga je naar de film?”. Klik **Open boekingsassistent** om het zijpaneel te openen; toolbarclick opent niet meer rechtstreeks het paneel. Als Chrome dit blokkeert, lees de herstelmelding en probeer het normale Chrome-zijpaneelmenu; wijzig geen organisatiebeleid.

## 3–6 minuten: echte tijdelijke buddy’s

1. De lijst begint leeg. Voeg de fictieve bijnaam **Filmmaatje** toe. Probeer een e-mailadres/pasnummer niet: zulke gegevens horen hier niet en worden begrensd/geweigerd. Gebruik geen echte namen of accountidentifiers voor deze proef.
2. Hernoem naar **Avondbuddy**. Kies die buddy en lees “B begint opnieuw”. Annuleer één keer: niets verandert. Kies opnieuw en bevestig bewust. De popup toont **Ik + Avondbuddy**, geen abonnement of accountbewijs.
3. Open het paneel. B heet nu Avondbuddy; de technische rollen A/B blijven zichtbaar en onafhankelijk. Sluit/heropen de popup: dezelfde keuze moet terugkomen zolang de worker nog leeft. Je kunt ook in het paneel **Buddy kiezen of beheren** openen; het is dezelfde coördinator, geen tweede lijst.
4. Je kunt zonder buddy verder: **Ga verder zonder buddy** vraagt bij een bestaande keuze ook bevestiging. De volledige handmatige assistent blijft bruikbaar. Optioneel kun je vanuit een lege lijst expliciet fictieve Sanne/Mark laden; DEMO moet zichtbaar blijven.

## 6–10 minuten: A/B-independence, wisselen en stoelgrenzen

1. Bewaar **De maan van papier**, **Fictief Filmhuis**, **12 april 2030**, **19:30**, **Zaal 2**. Gebruik Tab/Shift+Tab en Enter; focus hoort na bewaren bij de A/B-sectie. Open per kaart de eigen invoer, bewaar A F10 en B F11.
2. Doorloop A’s vijf eigen stappen als fictieve zelfmeldingen; B blijft zelfstandig ongecontroleerd. Alleen A afronden geeft een partiële eigen melding, nooit een waargenomen websitebevestiging.
3. Geef ook B alvast eigen controles en typ eventueel onopgeslagen stoelvelden. Voeg in de popup **Nieuw maatje** toe, kies die en annuleer eerst: B blijft staan. Bevestig daarna bewust: alleen B’s eerdere invoer, context en controles worden UNKNOWN/opnieuw controleren; onopgeslagen B-velden en oude contextkeuze verdwijnen. A’s controles en onopgeslagen A-velden mogen niet verdwijnen. Bewaar voor de nieuwe B zelf opnieuw details.
4. Hernoem/verwijder de geselecteerde buddy: dezelfde waarschuwing en B-reset horen te volgen. Een niet-geselecteerde buddy hernoemen/verwijderen mag A/B niet resetten. **Wis alle buddy’s** verwijdert de lijst; **Wis alle tijdelijke gegevens** in het paneel wist daarnaast alle planning/voortgang.
5. Verander B’s tijd naar 21:00 en bewaar: geen volledige voorstellingmatch/doorgang. Laat de zaal leeg in een nieuw plan: UNKNOWN. F10/F11 bewijzen nooit aangrenzende beschikbaarheid, gangpad of hold, ook niet met een geselecteerde bijnaam.

## 10–13 minuten: neutrale contexten en fictieve widget

1. Geef desgewenst zelf **Toestaan in incognito** via `chrome://extensions` → Details. Open een normaal en een incognitovenster (**⌘⇧N**), beide alleen met `about:blank`. Log nergens in. Een toestemmingswijziging kan de extensie/popup sluiten/herladen en tijdelijke gegevens wissen; heropen de popup en het normale paneel.
2. Kies in het **paneel**, niet de popup, per kaart **Browsercontext kiezen of loskoppelen** → **Vensterlijst ophalen / vernieuwen**. Maak de gewenste neutrale tab zelf actief, controleer het gekozen venster, koppel normale metadata aan A en expliciet toegestane incognitometadata aan B. De popup krijgt die contextgegevens niet. Browsercontext ≠ accountidentiteit.
3. Sluit een gekoppelde testtab en controleer dat diens koppeling/controles vervallen. Trek incognitotoegang weer in; sluit eigen neutrale incognitovensters als Chrome daarom vraagt. B verliest zijn koppeling; een reload mag alles wissen. Bij beleidblokkade noteer BLOCKED en gebruik de handmatige route. Laad `fixture.html` niet als incognitohoofdpagina: spanning ondersteunt dat niet.
4. Open **Simulatie / technische proef** → **Open fictieve testpagina**. De widget toont **DEMO · NIET GEBOEKT · GEEN VUE INTEGRATIE**. Wissel fictieve schermstappen, verberg/plaats de widget terug: één kaart, geen duplicaten. De knop opent het echte paneel waar Chrome het toestaat. Er wordt niets in een Vue-pagina geïnjecteerd of ingediend.

## 13–15 minuten: restart, privacy en bediening

1. Maak een fictieve buddy/plan, klik **Opnieuw laden** op de extensiekaart en heropen de popup. Lijst, selectie en voortgang zijn leeg; oude opdrachten mogen niets terugzetten. Noteer dit als extensiereload, geen bewezen natuurlijke workersuspensie. Voor natuurlijke suspensie: sluit alle testpanel-/fixture-inspecties, wacht op de workerstop en heropen; open polling-UI/DevTools kan de worker wakker houden. De gedwongen workerstop heeft een afzonderlijke geautomatiseerde Chrome-test.
2. Bij verbroken verbinding kun je lokaal handmatig plannen zonder buddybeheer. **Verbind opnieuw en wis tijdelijke gegevens** wist bewust de gedeelde en lokale gegevens, ook in andere SeatBuddies-panelen. Geen oude opdracht wordt herhaald; een mislukte herverbinding laat lokaal plannen mogelijk.
3. Open **Diagnostiek zonder privégegevens** en voer zelfcontrole uit. Controleer 0.4.0, scope/capabilities en **NOT_IMPLEMENTED / DISABLED_G0 / MEMORY_ONLY**. Geen bijnamen, film, tabnummers, URL’s of accountdata in het rapport. Wis het rapport.
4. Controleer smalle popup/paneelbreedte richting 320px, leesbare cream/crimson/goud-contrasten, geen horizontale overflow, Tab/Shift+Tab/Enter en zichtbare focus bij buddybevestiging. Noteer Chrome’s werkelijke minimumbreedte als die afwijkt; automatische UI-tests gebruiken exact 320px. VoiceOver blijft menselijke QA. Schakel eventueel macOS-toetsenbordnavigatie in als Tab geen knoppen bereikt.

## Bijwerken, problemen en verwijderen

- **Manifest ontbreekt:** kies de binnenste uitgepakte map, geen Actions-ZIP, broncheckout of bovenliggende map. Zelf bouwen: `npm ci`, `npm run check`, `npm run package`; runtime staat in `dist/`.
- **Popup/paneel verdwijnt na toestemming/reload:** normaal heropenen via het icoon → paneelknop. Tijdelijke gegevens kunnen terecht weg zijn.
- **Beleidblokkade:** stop die proef; geen managed policies of browserprofielbestanden wijzigen.
- **Bijwerken:** gebruik een bewust gekozen nieuwe uitgepakte map/build en controleer versie 0.4.0. Oudere SeatMates/0.3.0-artifacts zijn niet de nieuwe build.
- **Verwijderen:** `chrome://extensions` → SeatBuddies → Verwijderen; verwijder daarna je eigen uitgepakte map.

Meld alleen fictieve, geschoonde feiten met [het QA-formulier](qa-evidence-template.md): OS-/Chrome-versie, 0.4.0, commit/run, stap, verwacht/feitelijk gedrag en PASS/FAIL/NOT_RUN/BLOCKED/INCONCLUSIVE. Geen persoonlijke browserbeelden, echte bijnamen, cookies, tokens of tickets. Voor eventueel later echt G0-onderzoek eerst de [afzonderlijke veilige observatiegids](g0-human-observation-guide.md).
