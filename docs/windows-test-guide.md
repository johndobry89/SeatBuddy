# Windows — SeatBuddies 0.4.0-test installeren

Dit is een **unpacked testbuild**, geen Store-release en geen Vue-boekingsintegratie. Chrome desktop 116+ en toestemming om extensies te installeren vereist. De browsercode is dezelfde als op [Mac](macos-test-guide.md); Windows-uitvoering is niet door Linux- of Mac-CI bewezen.

## Download en openen

1. Open [Sprint 04 Actions](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-10-sprint-04), kies de gewenste commit en bekijk de afzonderlijke jobresultaten. Download **seatbuddies-chrome-test** onder Artifacts; GitHub-login kan nodig zijn.
2. Rechtsklik in Verkenner → **Alles uitpakken**. Pak ook de binnenste **seatbuddies-0.4.0-chrome-test.zip** uit, bijvoorbeeld naar `Documenten\SeatBuddies-test\0.4.0\`. `manifest.json`, `background.js`, `popup.html`, `sidepanel.html`, `fixture.html`, `icons` en `assets` moeten direct in de gekozen map staan. Geen ZIP of bovenliggende map selecteren.
3. Open `chrome://extensions`, schakel **Ontwikkelaarsmodus** in en kies **Uitgepakte extensie laden**. Controleer **SeatBuddies 0.4.0**, de twee rode stoelen en alleen Side Panel-rechten. Bij beheerdersblokkade: stop; wijzig geen organisatiebeleid.
4. Pin via het puzzelstukje. Het icoon opent de **buddy-popup**. **Open boekingsassistent** opent daarna bewust het volledige paneel. Als dat niet lukt: lees het hersteladvies en probeer Chrome’s gewone zijpaneelmenu in een normaal venster. De extensie voert geen boekingsactie uit.

Optioneel checksum via PowerShell: `Get-FileHash .\seatbuddies-0.4.0-chrome-test.zip -Algorithm SHA256`; vergelijk met het `.sha256`-bestand. Oudere Sprint 02/03-builds houden `seatmates-windows-test` / `seatmates-chrome-test` en zijn niet 0.4.0.

## Fictieve functietest

1. Voeg in de popup **Filmmaatje** toe, hernoem naar **Avondbuddy**, kies en bevestig. De lijst is tijdelijk, begint leeg en is geen pas-/accountkoppeling. Fictieve Sanne/Mark zijn een expliciete DEMO-optie, niet automatisch geladen.
2. Open het paneel: **Ik + Avondbuddy**. Je kunt ook zonder buddy handmatig verder. Plan **De maan van papier**, **Fictief Filmhuis**, **12 april 2030**, **19:30**, **Zaal 2** en bewaar A F10 / B F11 als eigen invoer.
3. Alleen A doorlopen mag B niet afronden. Kies met B-invoer aanwezig een andere buddy: eerst annuleren houdt alles; bewust bevestigen wist alleen B’s invoer/koppeling/controles en onopgeslagen B-velden. A blijft staan. Geselecteerde buddy hernoemen/verwijderen vraagt dezelfde bevestiging.
4. Andere tijd/ontbrekende zaal geeft geen sterke voorstellingmatch. Nummers F10/F11 blijven **niet geverifieerd naast elkaar**. Geen beschikbaarheids-, hold- of echte bevestigingsclaim.
5. Gebruik Tab/Shift+Tab/Enter en een smal paneel. Probeer onder Simulatie de fictieve pakketpagina: één demo-widget bij stapwissel, verbergen/herplaatsen; geen productie-injectie.

## Neutrale incognito- en lifecycleproef

1. Geef zelf **Toestaan in incognito** via Details als je deze proef wilt doen. Open een normaal en een incognitovenster met neutrale `about:blank`-tabs. Geen login. Heropen popup/paneel als Chrome de extensie bij de toestemming herlaadt; tijdelijke gegevens mogen verdwijnen.
2. Haal alleen in het paneel bewust de vensterlijst op. Kies de juiste actieve neutrale context voor A normaal / B incognito. De lijst gebruikt alleen nummers en contextsoort, geen titels/URL’s. Een bijnaam bewijst geen account; de popup mag geen contexten koppelen.
3. Navigeren/sluiten van een gekoppelde testtab maakt de eigen controles ongeldig. Trek incognitotoegang weer in; sluit eigen testincognitovensters als Chrome dat vraagt. B verliest zijn koppeling. `spanning` kan geen verpakte fixturehoofdpagina in incognito laden; probeer dat niet als bewijsroute.
4. Herlaad de extensie en open de popup opnieuw: buddy’s, selectie en controles zijn weg; er wordt niets herhaald. Maak onderscheid tussen extensiereload en een werkelijk waargenomen natuurlijke workerstop. Open inspectievensters/pollende UI kunnen de worker wakker houden.
5. Zelfcontrole onder **Diagnostiek zonder privégegevens** is optioneel en bevat geen nickname, film, tabnummers, titels of URL’s. Bestaande capabilities zijn geen toestemming voor elke handeling. Bij verbindingsverlies blijft lokaal plannen zonder buddybeheer beschikbaar; bewust herverbinden wist tijdelijke gegevens in alle panelen en herhaalt geen mislukte opdracht.

## Wissen, bijwerken, verwijderen

Buddy’s verwijder je afzonderlijk of met **Wis alle buddy’s**. Het paneel heeft **Wis alle tijdelijke gegevens** voor alle planning én bijnamen. Gebruik voor een nieuwe build een bewust gekozen uitgepakte map; controleer Details/diagnostische versie en voorkom dubbele oude testextensies. Verwijderen: `chrome://extensions` → SeatBuddies → **Verwijderen**, daarna desgewenst de eigen testmap verwijderen.

Zelf bouwen: Node.js 24 LTS, `npm ci`, `npm run check`, `npm run package`; ZIP/checksum verschijnen in `build/`. Geen backend/secrets nodig. Leg alleen fictieve, niet-persoonlijke uitkomsten vast met [het QA-formulier](qa-evidence-template.md). Volledige handmatige matrix: [testplan](manual-test-plan.md). Geen echte accounts, tickets, checkout of betaling voor deze test.
