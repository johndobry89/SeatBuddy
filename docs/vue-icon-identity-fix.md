# FIX 03 — exacte live-iconidentiteit

Issue #37, 23 oktober 2026. Basis `23eea1c34bfc4246e71350308fd57d3bd882c77b`,
branch `feat/issue-37-live-icon-identity-fix`, **0.11.5-experimental**.

**OWNER_MANUAL_LIVE_OBSERVATION:** de eigenaar rapporteert 105 beschikbare
stoelen: 11 Ultra Lux, 29 Lux, 13 Saver Lux, 50 Super Saver Lux, twee onbekend,
nul ambigue matches. Zijn alleen-lezende browseranalyse vergelijkt de volledige
bronreferenties binnen dezelfde pagina; bijpassende categorieknoppen komen exact
overeen. Geen originele URL, query, asset of privé-HTML ontvangen/opgeslagen.
Dit bewijst lokale iconkoppeling volgens de eigenaar, geen paren, kosten of
succes van de nieuwe extensieversie. Inventaris verandert.

**Oorzaak en reparatie:** `reference()` weigerde `url.search` en paden buiten de
vaste statische prefixlijst vóór de vergelijking. Die filters zijn verwijderd.
Volledige canonieke HTTPS-referenties blijven uitsluitend tijdelijk in het
geïnjecteerde document, met intacte ondoorzichtige query: geen URLSearchParams,
decoderen, sorteren, strippen, hash, fetch, export, logging of opslag. Dezelfde
origin, credentials-/fragment-/protocolcontroles en placeholderweigering blijven;
data-image-fixtures blijven werken. Alle overige schema-, Ultra Lux-, fysieke
stoel-, checkout-/incognito-/grantcontroles en Kopieer rapport zijn behouden.
Geen kostenbelofte; Movie Pass-bijbetaling blijft per account ongecontroleerd.

**SYNTHETIC_FIXTURE:** drie gerichte regressies werkelijk FAIL vóór en PASS na
reparatie. Identieke verzonnen referenties met onbekend pad/query classificeren;
gewijzigde/anders geordende/gecodeerde queries matchen niet; onveilige bronnen en
src/currentSrc-conflicten worden geweigerd. Twee onbekende beschikbare stoelen
blokkeren een ander geldig paar niet. Resultaat én kopierapport bevatten geen
beeldreferenties. Bestaande native ZIP-proef heeft één extra lokale fixture in
hetzelfde pad; alle afbeeldingen worden lokaal vervuld, nooit Vue opgehaald.
`npm run check` PASS: 354 unit, format/lint/types/icons/build; 31 UI PASS.
Lokale native proef BLOCKED vóór worker door beheerde ExtensionInstallBlocklist;
geen bypass. Definitieve CI-native
uitslagen, volledige oplever-SHA en CI-run staan in het opleverrapport en bij de
[branchchecks](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-37-live-icon-identity-fix).
Normale ZIP byte-identiek; rechten onveranderd. Beide ZIPs onafhankelijk op
CRC/SHA en alle bytes tegen dist gecontroleerd. Experiment inner SHA256:
`b184c5cd3958042a6e566f8240ff5ffad70d3bf1957c3c7962a79d47b8475c64`.

**Nieuwe live-extensieacceptatie NOT_RUN; G0 INCONCLUSIVE.** Eigenaarproef:

1. Controleer checksum, pak 0.11.5 uit en laad de manifestmap in een schoon normaal
   Chrome-testprofiel; incognitotoegang uit.
2. Lees bewust de eerste stoelpagina. Vergelijk actuele header/tellingen,
   LUX_4/EXACT_VISIBLE_ICON en eventuele paren visueel, inclusief gangen/Ultra Lux.
   Historische aantallen niet afdwingen; fout paar betekent STOP.
3. Kopieer rapport en deel uitsluitend die veilige tekst. Geen stoel selecteren,
   hold, checkout- of betaalproef. Geen merge/publicatie.
