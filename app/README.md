# SeatBuddies Next (0.12.0-experimental)

Onafhankelijke Chrome-extensie voor twee mensen die ieder met een eigen Vue Movie Pass naar dezelfde film willen en naast elkaar willen zitten. **SeatBuddies reserveert, selecteert of betaalt niets en is niet verbonden aan Vue.** Ontwerpkeuzes staan in [ADR-011](../docs/decisions/ADR-011-seatbuddies-next.md).

## Wat het doet

**Persoon A: "Ik kies de stoelen"**

1. Open op vuecinemas.nl de stoelkaart van de voorstelling.
2. Klik op het SeatBuddies-icoon en kies **Ik kies de stoelen**.
3. SeatBuddies toont maximaal drie paren gewone, vrije stoelen die zeker naast elkaar liggen. Je ziet ook of de lijst op "achterin en midden" staat of op kaartvolgorde.
4. Kies één paar en klik op **Kopieer bericht voor mijn partner**. Stuur het bericht, bijvoorbeeld via WhatsApp. Het is gewone, leesbare tekst, dus ook zonder extensie te begrijpen.

**Persoon B: "Mijn partner stuurde stoelen"**

1. Open met je eigen account dezelfde voorstelling tot de stoelkaart.
2. Klik op SeatBuddies, kies **Mijn partner stuurde stoelen** en plak het bericht. Een chatnaam ervoor of een extra regel erna is geen probleem.
3. Je krijgt groen, oranje of STOP:
   - **Groen:** je stoel is nu vrij en ligt direct naast die van je partner.
   - **Oranje:** je stoel is vrij, maar die van je partner niet meer. Waarschijnlijk heeft je partner die net gekozen; vraag het na.
   - **STOP:** een andere voorstelling, je stoel is bezet, of het paar is niet veilig vast te stellen. De reden staat erbij.

Daarna kiest en boekt ieder zelf op Vue.

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

Laad `app/dist` via `chrome://extensions` → Ontwikkelaarsmodus → **Uitgepakte extensie laden**. Doe dat voor B in een eigen Chrome-profiel.

`.npmrc` zet `legacy-peer-deps`, omdat npm 10 anders crasht bij het oplossen van peer-dependencies. De peers (`vite`) staan expliciet vastgepind.

## Bewijsstatus

| Onderdeel | Status |
| --- | --- |
| Unit- en UI-tests (jsdom, verzonnen fixtures) | PASS: 51 |
| Echte Chromium: gebundelde reader op een lokaal vervulde, verzonnen pagina; popup op 360 px | PASS: 3 |
| Extensie laadt uitgepakt in Chromium zonder fouten | PASS |
| Native action-popup met echte activeTab-toegang | NOT_RUN |
| Live Vue-observatie, proef met twee personen, gemeten tijdwinst | NOT_RUN |
| Boekingen | Nooit onderdeel van deze app |

De Vue-selectors komen uit de geanonimiseerde waarnemingen van het eerdere experiment. Ze zijn geen garantie dat de echte site er nu zo uitziet: bij afwijking is het resultaat ONBEKEND.
