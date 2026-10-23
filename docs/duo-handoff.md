# Sprint 13 — Duo Handoff

Issue [#41](https://github.com/johndobry89/SeatBuddy/issues/41),
basis `a50b112a6074f4b45e77c5b6e86689f5c0b4f477`, branch
`feat/issue-41-duo-handoff`, **0.11.7-experimental**. Normale versie **0.11.0**
ongewijzigd. Geen nieuwe architectuur, dependency, accountkoppeling of rechten.

## Wat werkt en waar STOP geldt

A leest bewust de huidige eerste stoelpagina, kiest expliciet één van maximaal
drie bestaande kandidaten (geen standaardkeuze) en klikt **Kopieer duo-plan**.
B opent zelf dezelfde eerste stoelpagina in een **ander eigen Chrome-profiel**,
opent **Duo-plan ontvangen**, plakt de tekst en klikt **Controleer duo-plan op
deze Vue-pagina**. Twee tabs in één profiel zijn geen onafhankelijke logins.

Het tekstcontract is `SeatBuddies duo-plan v1` plus canonieke leesbare JSON,
maximaal 700 tekens. De strikte parser/formatter accepteert uitsluitend versie,
`OWNER_VISIBLE_PAGE`, `NOT_BOOKED`, waarnemingstijd, de vijf voorstellingsvelden en
rij/A/B/categorieën. A is het eerste stoelnummer in het gekozen fysieke paar,
B het tweede. Geen URL, HTML, iconen, volledige kaart, ID, account/pass, ticket,
prijs of vrije bijlage. Verdachte tekst, extra/ontbrekende velden, duplicaatkeys,
wijzigingen buiten het canonieke formaat, verkeerde versie en ongeldige
categorieën betekenen STOP. De tekst is geen geauthenticeerd bewijs van afzender
of account; B controleert altijd de actuele zichtbare bron.

B doet precies één geïsoleerde top-framelezing na de klik, onder dezelfde
origin-/normaalprofiel-/grant-/document-/checkoutgrenzen als de bestaande reader.
Alle vijf velden moeten identiek en volledig zichtbaar zijn. De gerichte controle
zoekt het ontvangen paar ook **buiten B's top drie**, met dezelfde ene fysieke
beoordelingsfunctie als de ontdekker: beschikbare stoelen, unieke rij/nummers/
kolommen, directe DOM-buren, geen onderbreking/gangpad, geen overlap, normale
geometrie inclusief de bestaande 30%-grens, geen bijzondere/Ultra Lux/onbekende
plaatsen, identieke categorieën via `EXACT_VISIBLE_ICON`. Geen nieuwe schema's.
B retourneert alleen minimale openbare voorstellingslabels en een van:

| Status             | Betekenis                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| DUO_MATCH_POSSIBLE | Exact paar nu mogelijk; zelf op Vue vergelijken                                                    |
| MISMATCH_SHOWING   | Minstens één volledig waargenomen voorstellingsveld wijkt af                                       |
| PAIR_UNAVAILABLE   | Minstens één doelstoel unavailable/picked; geen oordeel over een eerdere eigen aankoop             |
| UNKNOWN_STOP       | Onvolledige/ambiguë bron, onveilige buurrelatie, onbekende categorie, verlopen plan of browserfout |

Planleeftijd is maximaal vijf minuten **vanaf A's pagina-observatie**, niet vanaf
kopiëren/plakken. Toekomstige tijden worden geweigerd; de grens wordt vóór en na
de browserlezing gecontroleerd. Eén lokale vervalcallback wist de weergave, zonder
site-timer, countdown of polling. Herlezen, gewijzigd plakveld, navigatie/tabwissel
of popupsluiting wissen het bewijs en de selectie. Een lokale revisie voorkomt
dat een vertraagd antwoord een inmiddels gewijzigd plan alsnog groen maakt.
Dezelfde tekst terugplakken maakt een oud lopend antwoord niet geldig.

**De controle is bedoeld vóór beide losse boekingen en biedt geen tijdslot of
hold.** A en B boeken ieder zelf; Movie Pass-bijbetaling blijft per account
**UNKNOWN**, ook bij Regular/Dolby of een match. Geen selectie, hold, checkout,
annulering, betaling, login of profielautomatisering. Klembord uitsluitend
`writeText` direct na klik, met afgewacht succes/fout; nooit automatisch lezen.
Duo-invoer/resultaten blijven alleen in popupgeheugen: geen workerberichten,
local/session-storage, opslagherstel, netwerk of stil tabbladonderzoek.

## Werkelijk bewijs en resterende proef

- **OWNER_MANUAL_LIVE_OBSERVATION, 0.11.6, issue #41:** eigenaar bevestigde drie
  fysiek aaneengesloten Super Saver Lux-paren in rij 8 (1+2/2+3/3+4) op de genoemde
  Enschede-voorstelling. Dit actualiseert de eerdere NOT_RUN in de FIX 04-notitie
  uitsluitend voor live kandidaatgeneratie/visuele kaartcontrole. Geen eigen
  live bezoek door de agent, account-/kosten-/hold- of tweepersoonsbewijs.
- **SYNTHETIC_FIXTURE:** vijf nieuwe unitregressies: expliciete veilige export en
  injectie/schemaweigering; exacte B-doelcontrole buiten top drie; alle vijf
  mismatch-/ontbrekende-/beschermde contexten vóór kaartlezing; bezet/categorie/
  Ultra/onbekend/gangpad/kolom/overlap/bijzonder; tijdigheid en veranderd bewijs.
  De gezamenlijke suite: **360 unit PASS**, format/lint/types/icons/build PASS.
  De bestaande gebouwde normale UI: **31 tests PASS**.
- **RENDERER_WITH_TRANSPORT_DOUBLE, lokaal PASS:** gebouwde experimentele Vue-UI
  daadwerkelijk bediend en visueel bekeken bij 360×600; drie A-keuzes plus
  kopieeractie en B's match passen zonder scroll. Synthetische bron en dubbele
  Chrome-/klembordtransporten; ook lokaal verval na vijf minuten en het weigeren
  van late antwoorden na gewijzigde invoer werkelijk gecontroleerd. Dit bewijst
  geen native grant of echt klembord.
- De native ZIP-regressie start **twee afzonderlijke tijdelijke Chrome-profielen**
  en echte action-popups/activeTab/executeScript op uitsluitend lokaal vervulde
  fictieve documenten. Controleert geen standaardkeuze, toetsenbordkopie,
  klembordweigering (testdouble), exact paar buiten B's top drie, maximaal 600px,
  bezetting na GO, laat antwoord na invoerwijziging, onveilige invoer vóór injectie
  en nul nieuwe storage-/worker-/HTTP-effecten. B sluit zonder herstel.
- **Lokale native uitvoering BLOCKED:** beheerde `ExtensionInstallBlocklist=[*]`;
  beleid blijft intact. De runner meldt **11 normale + 2 experimentele
  serviceworker-prerequisitefouten**, geen functioneel native resultaat. Geen
  renderer-PASS als native bewijs presenteren.
  Definitieve Linux/macOS Intel-resultaten en exacte oplevercommit worden bij
  het opleverrapport gecontroleerd; [branchchecks](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-41-duo-handoff).
- **OWNER_LIVE_DUO NOT_RUN, HUMAN_TASK_SPEEDUP NOT_RUN, LIVE_BOOKING_TEST NOT_RUN,
  G0-toestemming INCONCLUSIVE.** Geen productie-integratie of nul-kostenbelofte.

## Handelingen versus twee tabs

Binnen de popup: A **lezen → paar kiezen → kopiëren** = drie acties, nul
voorstellingsinvoervelden. B **disclosure openen → plakken → controleren** = drie
acties, één plakveld, geen dubbele filminvoer. Ieder heeft daarnaast één bewuste
extensie-icoonklik nodig. Zelfde pagina/profielen openen en tekst via het zelf
gekozen kanaal doorgeven blijven handmatig; dat kanaal is geen extensiefunctie.
Bij de gemeten korte synthetische labels: nul scrollacties; lange labels, zoomen,
uitgeklapte technische details of fouttekst kunnen meer ruimte vragen.

Twee gewone Vue-tabs hebben nul extensieacties, maar vragen nog handmatige
vergelijking/overdracht van voorstelling, categorie en fysiek paar. Aantallen
websiteklikken, werkelijk invoerwerk, duur en foutkans zijn **niet gemeten** in een
vergelijkbare live tweepersoonstaak. Alleen de automatische hercontrole vervangt
mogelijk vergelijkingswerk. **GO voor begrensde menselijke proef; NO-GO voor een
bewezen tijdwinst-/boekings-/productieclaim.** Bij geen praktisch voordeel stoppen,
geen aanvullende beheerworkflow bouwen.

## ZIP en korte eigenaarproef

Experimenteel: `build/experiment/seatbuddies-0.11.7-experimental-chrome-test.zip`
en gelijknamige `.sha256`; alleen deze versie installeren voor de duo-proef.
SHA256: `a2aefdaff669d4fb81a9517e2c4a826e8f4d5f6d067f4e61f98c23aef64376e8`.
Beide pakketten zijn onafhankelijk op ZIP-CRC, SHA en alle bytes tegen hun dist
gecontroleerd; normale ZIP is byte-identiek met een herbouw van de basiscommit:
`372d6ef1682ae3a9c339f1bd9f4a3d044c3eebf3a693453e0dcc6fdb675625fc`.
CI installeert de echte gedownloade wrapper/inner ZIP na beide checksumcontroles;
geen release of Web Store-publicatie.

1. Controleer op Mac met `shasum -a 256` de experimentele ZIP, pak uit en laad in
   `chrome://extensions` → Ontwikkelaarsmodus → **Uitgepakte extensie laden** de
   map met `manifest.json`. Herhaal in B's eigen profiel. Incognitotoegang uit;
   bijwerken van dezelfde uitgepakte map kan met **Opnieuw laden**.
2. A: lees de eerste veilige stoelpagina, vergelijk kaart/voorstelling visueel,
   kies één paar, kopieer en geef uitsluitend dat duo-plan aan B. B: open zelf
   exact dezelfde eerste pagina, plak via **Duo-plan ontvangen** en controleer.
   Vergelijk A/B-toewijzing en het exacte paar zelf; ieder STOP-signaal respecteren.
3. Noteer alleen match/STOP, overeenstemming met de zichtbare kaart, benodigde
   acties/scroll en ervaren voordeel. Geen accounts, privé-HTML, ticket-/betaal-
   of boekingsgegevens delen. Deze proef vereist geen boeking of checkoutactie.
