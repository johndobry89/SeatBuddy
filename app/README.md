# SeatBuddies Next (0.12.0-experimental)

Onafhankelijke Chrome-extensie voor twee mensen die ieder met een eigen Vue Movie Pass naar dezelfde film willen en naast elkaar willen zitten. **SeatBuddies reserveert, selecteert of betaalt niets en is niet verbonden aan Vue.** Ontwerpkeuzes staan in [ADR-011](../docs/decisions/ADR-011-seatbuddies-next.md).

## Wat het doet

**Snelst: twee vensters op één computer.** Maak in Chrome twee profielen. In elk profiel log je één keer in op een eigen Vue-account; Chrome onthoudt dat. Open in beide vensters dezelfde voorstelling tot de stoelkaart. Daarna:

1. **Venster 1:** klik op het SeatBuddies-icoon → **Zoek twee stoelen**. Je ziet maximaal drie paren gewone, vrije stoelen die zeker naast elkaar liggen, en of de lijst op "achterin en midden" staat of op kaartvolgorde. Kies een paar → **Kopieer voor het tweede venster**.
2. **Venster 2:** SeatBuddies → **Gekozen stoelen controleren** → plak (Ctrl+V of Cmd+V). De controle start meteen.
3. Je krijgt groen, oranje of STOP:
   - **Groen:** de stoel voor dit account is vrij en ligt direct naast de andere.
   - **Oranje:** deze stoel is vrij, maar de andere niet meer. Dat is verwacht als je die net in het andere venster hebt gekozen of geboekt.
   - **STOP:** een andere voorstelling, de stoel is bezet, of het paar is niet veilig vast te stellen. De reden staat erbij.
4. Kies in elk venster de eigen stoel en rond per account de boeking af.

**Op afstand:** kies **Kopieer om te versturen** en stuur het bericht via bijvoorbeeld WhatsApp. Het is gewone, leesbare tekst. De ander plakt het bij **Gekozen stoelen controleren**; een chatnaam ervoor of een extra regel erna is geen probleem.

SeatBuddies vraagt, bewaart en gebruikt geen e-mailadressen of wachtwoorden, logt nergens in en klikt niets aan op Vue.

## Installeren zonder zelf te bouwen

1. Open op GitHub het tabblad **Actions** → workflow **SeatBuddies Next** → de laatste geslaagde run.
2. Download onder **Artifacts** het bestand `seatbuddies-next-extension` en pak het uit.
3. Ga in Chrome naar `chrome://extensions`, zet **Ontwikkelaarsmodus** aan en kies **Uitgepakte extensie laden**. Kies de uitgepakte map (met `manifest.json` erin).
4. Herhaal stap 3 in het tweede Chrome-profiel.

**Gaat er live iets mis?** Klik in de popup op **Kopieer foutrapport** en plak dat bij een issue. Het rapport bevat alleen statuscodes en aantallen: geen titels, stoelnummers of accountgegevens.

## Veiligheidsgrenzen

- **Rechten:** alleen `activeTab` en `scripting`. Gelezen wordt pas na een klik in de popup, alleen in het actieve tabblad, het hoofdframe, en alleen op `vuecinemas.nl`.
- **Geen opslag, netwerk of tracking:** geen service worker, geen opslag, geen netwerk (`connect-src 'none'`), geen analytics. Incognito is uitgeschakeld (`not_allowed`).
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
| Unit- en UI-tests (jsdom, verzonnen fixtures) | PASS: 58 |
| Echte Chromium: gebundelde reader op een lokaal vervulde, verzonnen pagina; popup op 360 px | PASS: 3 |
| Extensie laadt uitgepakt in Chromium zonder fouten | PASS |
| Native action-popup met echte activeTab-toegang | NOT_RUN |
| Live Vue-observatie, proef met twee personen, gemeten tijdwinst | NOT_RUN |
| Boekingen | Nooit onderdeel van deze app |

De Vue-selectors komen uit de geanonimiseerde waarnemingen van het eerdere experiment. Ze zijn geen garantie dat de echte site er nu zo uitziet: bij afwijking is het resultaat ONBEKEND.
