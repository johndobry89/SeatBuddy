# FIX 02 — twee legendavarianten en veilig kopiëren

Issue #35 inclusief Eindhoven-addendum, 23 oktober 2026. Basis
`ef1143b74c4c6f1a69d434823a8c8d43de5b297b`; **0.11.4-experimental**.

**Bewijs versus hypothese:** eigenaar meldt live Enschede 134 beschikbaar / 12
niet beschikbaar / één geselecteerd; statuslezing GO, categorieën/paren NO-GO.
Gesaneerde private statische bevindingen tonen daarnaast Eindhoven met drie
dynamische legendatitels, geen categorieknoppen, en `Zaal 6 Dolby Cinema` in beide
koppen. Oude code vereiste vier knoppen/data-URI en weigerde dat zaalsuffix: dit
zijn aantoonbare adapterbeperkingen. Dat SingleFile de werkelijke live-iconen
herschreef is een **onbevestigde hypothese**, geen gemeten live root cause.
Eindhoven €5 bij Rang 1 is uitsluitend OWNER_MANUAL_OBSERVATION, geen HTML- of
accountprijsbewijs en geen algemene regel. Geen privé-HTML of assets gebruikt.

**Begrensde reparatie:** uitsluitend zichtbare titels bepalen LUX_4 (vier Lux-
categorieën) of RANK_3 (Regular/Saver/Super Saver uit drie dynamische items).
Anders UNKNOWN. Geen plaatsnamen, profielopslag of prijsafleiding. Dynamische
legenda heeft voorrang; zichtbare extra categorieknoppen moeten ermee kloppen.
Historische vier-knoppenvariant blijft werken. Dolby-suffix alleen met exact
passende zichtbare zaal-/kaartkop. Dezelfde fysieke controles en Ultra-/speciale-/
onbekende-categorie-uitsluitingen blijven; paren zijn mogelijke fysieke buren,
**Movie Pass-bijbetaling niet gecontroleerd**, per account zelf controleren.

Eén gedeeld mechanisme vergelijkt src/currentSrc exact na veilige normalisatie,
tijdelijk binnen de pagina. Alleen data-image en dezelfde HTTPS-origin met
begrensde statische afbeeldingspaden (assets/static/images/img/public-icons),
zonder query, fragment, credentials, gecodeerde/private/dynamische paden. Geen
externe assetorigin geverifieerd: ook example.test wordt geweigerd. Positieve
fixtures gebruiken uitsluitend verzonnen relatieve/absolute public-icons-paden,
in Chrome lokaal vervuld; geen echte Vue-assets of verzoeken. Responsieve
bronconflicten blijven UNKNOWN; geen kleur-/bestandsnaaminferentie of fetch.

Diagnosecodes: LEGEND_COUNT/TITLE (structuur), IMAGE_MISSING/ICON_TYPE (icoon),
DUPLICATE_ICON (dubbel), SEAT_ICON_NO_MATCH (geen unieke stoelmatch), NOT_VISIBLE,
UNKNOWN of NONE; de eerste vijf hebben prefix LEGEND_. Alleen enums verlaten de
pagina. Tellingen `categoryUnknownAvailable` en `ultraLuxAvailable` betreffen
alleen beschikbare stoelen. Nul Ultra Lux **herkend** bewijst geen afwezigheid.

**Kopieer rapport:** één native knop, alleen bij geldig huidig niet-beschermd
resultaat. Deterministische plaintext uit gevalideerde velden/enums, maximaal
3000 tekens; verdachte URL/e-mail/token/account-/regelinhoud wordt geweigerd.
Geen nieuwe DOM-lezing, opslag of netwerk. Alleen directe writeText na klik,
await en eerlijke succes/foutmelding; invalideren/herlezen wist de kopiestatus.

**SYNTHETIC_FIXTURE:** vijf gerichte nieuwe tests voor beide schema's, Dolby,
bronconflicten/ongeldige iconen/derde schema, beschikbaar-only tellers en exact
veilig rapport/weigeringen. Bestaande regressies behouden: **351 unit PASS**;
**31 UI PASS**. Native ZIP-proef uitgebreid met beide varianten, toetsenbordkopie,
klembord-success/error-doubles, herleesblokkering, checkoutweigering en nul
opslag/worker-/live-netwerkeffecten. Lokale native uitvoering BLOCKED door beheerde
ExtensionInstallBlocklist; geen bypass. Definitieve Linux/macOS Intel-resultaten
horen bij de exacte oplever-SHA in het opleverrapport en de branchchecks.
Normale ZIP byte-identiek; manifestrechten onveranderd (normaal sidePanel/storage,
experiment daarnaast uitsluitend activeTab/scripting). Experimentele ZIP SHA256:
`a2f846231045615f4120d8c8e23b6e9136ba7dad079fdc6a242fdcde3f46b8ca`.

**OWNER_LIVE_RANK_3_NOT_RUN / OWNER_LIVE_ICON_FIX_NOT_RUN; G0 INCONCLUSIVE.**
Eigenaar: (1) checksum controleren, alleen nieuwe experiment-ZIP installeren;
(2) veilige eerste stoelpagina lezen, actuele tellingen/header en eventuele paren
visueel vergelijken — oude aantallen nooit verwachten; (3) Kopieer rapport en
veilig in chat plakken. UNKNOWN: diagnosecode delen en STOP. Geen checkout- of
betaalproef; geen merge/publicatie of extra bioscooponderzoek.
