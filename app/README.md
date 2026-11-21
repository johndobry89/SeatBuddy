# SeatBuddies Next (0.12.0-experimental)

Onafhankelijke Chrome-extensie voor twee mensen die ieder met een eigen Vue Movie Pass naar dezelfde film willen en naast elkaar willen zitten. **SeatBuddies reserveert, selecteert of betaalt niets en is niet verbonden aan Vue.** Ontwerpkeuzes staan in [ADR-011](../docs/decisions/ADR-011-seatbuddies-next.md).

## Wat het doet

**Snelst: normaal venster + incognitovenster, vier klikken.**

Eenmalig: laad de extensie (zie hieronder) en zet in `chrome://extensions` bij SeatBuddies **Toestaan in incognito** aan. Dat doet de extensie nooit zelf.

1. **Venster 1 (normaal, eerste account):** open de stoelkaart van de voorstelling en klik op het SeatBuddies-icoon. Het zoekt meteen en toont maximaal drie paren gewone, vrije stoelen die zeker naast elkaar liggen. Je ziet ook of de lijst op "achterin en midden" staat of op kaartvolgorde. **Klik op een paar:** het voorstel is meteen gekopieerd.
2. **Open tweede account (incognito):** deze knop opent de Vue-inlogpagina in een incognitovenster. Log daar zelf in op het tweede account en open dezelfde voorstelling.
3. **Venster 2 (incognito):** klik op het SeatBuddies-icoon. Het leest het voorstel van het klembord en controleert meteen:
   - **Groen:** de stoel voor dit account is vrij en ligt direct naast de andere.
   - **Oranje:** deze stoel is vrij, maar de andere niet meer. Dat is verwacht als je die net in het andere venster hebt gekozen of geboekt.
   - **STOP:** een andere voorstelling, de stoel is bezet, of het paar is niet veilig vast te stellen. De reden staat erbij.
4. Kies in elk venster de eigen stoel en rond per account de boeking af.

**Met een tweede Chrome-profiel** in plaats van incognito werkt het ook. Klik dan in venster 2 op **Gekozen stoelen controleren**.

**Op afstand:** kies na het kopiëren **Ik stuur het voorstel door** en stuur het via bijvoorbeeld WhatsApp. Het is gewone, leesbare tekst. De ander plakt het bij **Gekozen stoelen controleren**.

**Wat SeatBuddies niet doet:**
- Hij vraagt, bewaart en gebruikt geen e-mailadressen of wachtwoorden en logt nergens in.
- Hij klikt niets aan op Vue.
- Het klembord leest hij alleen als de popup opent in een incognitovenster, of als je op "Gekozen stoelen controleren" klikt. Hij gebruikt alleen tekst die met `SeatBuddies-voorstel:` begint; andere tekst wordt genegeerd en nergens getoond.

## Installeren zonder zelf te bouwen

1. Open op GitHub het tabblad **Actions** → workflow **SeatBuddies Next** → de laatste geslaagde run.
2. Download onder **Artifacts** het bestand `seatbuddies-next-extension` en pak het uit.
3. Ga in Chrome naar `chrome://extensions`, zet **Ontwikkelaarsmodus** aan en kies **Uitgepakte extensie laden**. Kies de uitgepakte map (met `manifest.json` erin).
4. Herhaal stap 3 in het tweede Chrome-profiel.

**Gaat er live iets mis?** Klik in de popup op **Kopieer foutrapport** en plak dat bij een issue. Het rapport bevat alleen statuscodes en aantallen: geen titels, stoelnummers of accountgegevens.

## Veiligheidsgrenzen

- **Rechten:** alleen `activeTab`, `scripting` en `clipboardRead`. De pagina wordt pas gelezen na een klik op het icoon, alleen in het actieve tabblad, het hoofdframe, en alleen op `vuecinemas.nl`.
- **Geen opslag, netwerk of tracking:** geen service worker, geen opslag, geen netwerk (`connect-src 'none'`), geen analytics. Incognito alleen als je dat zelf in Chrome toestaat (`spanning`). Ook daar wordt niets bewaard.
- **Beschermde pagina's:** inlog-, account- en betaalpagina's, of een open dialoog, worden niet gelezen. Formulierwaarden worden nooit gelezen.
- **Stoelen:** Ultra Lux, onbekende stoelsoorten, speciaal gemarkeerde plekken en paren met een bezette, onbekende of gemarkeerde directe buur worden nooit voorgesteld. "Naast elkaar" vraagt:
  - dezelfde rij;
  - opeenvolgende nummers en kolommen;
  - directe DOM-buren;
  - gemeten geometrie: geen overlap, tussenruimte ≤ 30% van een stoel.
- **Twijfel = STOP:** elke twijfel geeft STOP of ONBEKEND, nooit groen.

## Ontwikkelen

```bash
cd app
```

```bash
npm install
```

```bash
npm run check
```

```bash
CHROMIUM_PATH=/pad/naar/chrome npm run test:browser
```

Laad `app/dist` via `chrome://extensions` → Ontwikkelaarsmodus → **Uitgepakte extensie laden**, in **beide** Chrome-profielen.

`.npmrc` zet `legacy-peer-deps`, omdat npm 10 anders crasht bij het oplossen van peer-dependencies. De peers (`vite`) staan expliciet vastgepind.

## Bewijsstatus

| Onderdeel | Status |
| --- | --- |
| Unit- en UI-tests (jsdom, verzonnen fixtures) | PASS: 65 |
| Echte Chromium: gebundelde reader op een lokaal vervulde, verzonnen pagina; popupflow normaal → incognito op 360 px | PASS: 4 |
| Extensie laadt uitgepakt in Chromium zonder fouten | PASS |
| Native action-popup met echte activeTab-toegang, echt incognitovenster en klembordrecht | NOT_RUN |
| Live Vue-observatie, proef met twee personen, gemeten tijdwinst | NOT_RUN |
| Boekingen | Nooit onderdeel van deze app |

De Vue-selectors komen uit de geanonimiseerde waarnemingen van het eerdere experiment. Ze zijn geen garantie dat de echte site er nu zo uitziet: bij afwijking is het resultaat ONBEKEND.
