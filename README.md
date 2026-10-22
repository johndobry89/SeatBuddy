# SeatBuddies — Operation Reboot 0.11.0-test

Een onafhankelijke Chrome MV3-extensie met Vue 3 en TypeScript. De standaardpopup en het Side Panel tonen nu **één compact scherm, één knop: Open Vue Quick Ticket**. Geen filmformulier, buddybeheer, simulatie of technische status op de normale start. De knop opent uitsluitend `https://www.vuecinemas.nl/` in een nieuwe tab. **Deze versie leest Vue niet en boekt niets.**

**PRODUCT_VALUE NO-GO:** dit is een rustigere start, nog geen bewezen verbetering boven twee gewone Vue-tabbladen of een bladwijzer. De eerste menselijke proef van 0.10.1: geïnstalleerd/renderend, **UX FAIL**. Meer administratie bouwen lost dat niet op. Advies: stop verdere functie-uitbreiding totdat een toegestane Vue-bron echte coördinatiewinst mogelijk maakt. [Eerlijke benchmark](docs/ux-reset-benchmark.md) · [onderzoek en onverzonden toestemmingsconcept](docs/vue-integration-decision-2026-10.md).

**Geen extra betaling is een harde producteis. Ultra Lux altijd uitgesloten.** Lux, Saver Lux en Super Saver Lux zijn alleen mogelijke kandidaten, nooit een nul-kostengarantie. Controleer per persoon het uiteindelijke bedrag na Movie Pass op Vue, inclusief latere kosten. Twee tabs in hetzelfde profiel zijn geen twee logins: ieder een eigen account en eigen browsersessie, bijvoorbeeld een ander eigen Chrome-profiel. De knop maakt geen afzonderlijke B-sessie aan. [Alle twaalf regels](docs/seatbuddies-business-rules.md).

## Installeren

1. Download **seatbuddies-chrome-test** uit de geslaagde [Sprint 12 Actions-run](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-27-sprint-12). Controleer de exacte commit en Linux/macOS Intel-resultaten in de [oplevering](docs/reboot-delivery.md).
2. Pak de buitenste Actions-ZIP uit. Vergelijk `shasum -a 256 seatbuddies-0.11.0-chrome-test.zip` met de bijgeleverde `.zip.sha256` en de opleverhash. Stop bij afwijkingen. Pak vervolgens de **binnenste ZIP** uit; `manifest.json` moet direct aan de root staan.
3. Chrome 116+ → `chrome://extensions` → Ontwikkelaarsmodus → Uitgepakte extensie laden → kies die vaste map. Controleer **0.11.0**, uitsluitend **sidePanel + storage** en geen websiterechten. Pin het icoon. Popup → **Open Vue Quick Ticket**. Side Panel optioneel via **Hulp en privacy → Open boekingsassistent**; bij fout verschijnt de normale-vensterfallback. Omgevingsbeleid niet omzeilen.

[Korte Mac-kaart](docs/macos-test-guide.md) · [Windows](docs/windows-test-guide.md). Nieuwe menselijke acceptatie **NOT_RUN**; we wachten daar niet op. Native Mac Intel CI is automatisch browserbewijs, geen Finder-, Apple Silicon-, VoiceOver- of menselijke gebruikstest.

## Optionele ontwikkelaarstests

**Ontwikkelaarstests** is standaard dicht. Openen laadt bewust de eerdere assistent: buddybeheer, solo/samen, filmconcept, review, onafhankelijke A/B-stappen, lokale zelftest, diagnostiek en simulaties. Het is geen verplichte of live boekingsflow. **Terug naar Vue-start** bewaart onopgeslagen lokale velden en pauzeert polling; er wordt niets stilzwijgend gewist of bevestigd.

Onder diagnostiek → simulatie → **Open fictieve testpagina** staan de bestaande adapterproeven, 18 ZERO EXTRA-plattegronden en een klein nieuw ontwerpvoorbeeld: bestaande fictieve voorstelling → fysiek stoelpaar → twee onafhankelijke fictieve reviews in drie acties. Geen account, beschikbaarheidsbewijs, hold of boeking. Het experiment hergebruikt de bestaande beleidslogica; kaartverloop wist beide reviews. Resultaten zijn **FICTIVE_ONLY**, geen bewijs dat SeatBuddies sneller is op Vue.

De knipperende rode simulatieknop is bij de bron gerepareerd: twee-seconden-GET_STATE verversen deelt geen disabled-status meer met gebruikersacties. Een daadwerkelijk uitgevoerde FAIL→PASS-regressie controleert tien vertraagde polls, berekende opacity, focus, schermlezerstilte en oude antwoorden na een nieuwe actie. Geen cosmetische verbergtruc. [Review en bewijs](docs/security-review-sprint12.md) · [ADR-010](docs/decisions/ADR-010-product-shell-reboot.md).

## Privacy en herstel

Geen pasnummers, wachtwoorden, cookies, tokens, accountgegevens, tickets, betaaldata, tracking, externe backend, fonts of automatische uploads. Gebruik alleen verzonnen testgegevens. De normale start leest geen buddy-/planopslag en pollt de worker niet. Geen hosts, content scripts, activeTab, scripting, tabs of debugger; strikte lokale CSP met `connect-src 'none'`.

Bestaande vrijwillige bewaring blijft behouden, onder ontwikkelaarstests: maximaal twaalf gevalideerde nickname/opaque-ID-paren in `storage.local` na expliciete opt-in. Geen selectie/accountidentiteit. Een afzonderlijk opgeslagen vijfvelden-filmconcept in `storage.session` vervalt na vier uur en wordt nooit als actief plan hersteld. Chrome-opslag is niet standaard versleuteld. Alleen aantoonbaar normale vertrouwde popup/paneelcontexten mogen opslag gebruiken, na TRUSTED_CONTEXTS-restrictie. Incognito/onbekende herkomst krijgt geen gedeelde onthouden gegevens.

Workerherstart: nooit stoelen, checks, categorie, kosten, buddyselectie, samenmodus, contextbinding of boekingsstatus herstellen. Alleen bewust bewaarde bijnamen en geldig expliciet concept kunnen terugkomen. Herstelconcept vraagt eigen nieuwe controle. Extensiereload/update wist het sessieconcept; volledige wisactie annuleert geen echte boeking. Eerdere bijnamen beheren/wissen via **Ontwikkelaarstests → Buddy kiezen of beheren / Alle gegevens wissen**; uninstall wist extensieopslag. [ADR-006](docs/decisions/ADR-006-explicit-local-retention.md) · [ADR-007](docs/decisions/ADR-007-ephemeral-planning-review.md).

## Bouwen en controleren

Node 24 LTS (`.nvmrc`), geen secrets:

```sh
npm ci
npm run check
npm run test:ui
npm run test:e2e
npm run package
npm audit
```

`dist/` is direct unpacked laadbaar; `build/seatbuddies-0.11.0-chrome-test.zip` bevat uitsluitend runtime, iconen, LICENSE en vijf volledige MIT-notices. Reproduceerbare ZIP/CRC/checksum, gegenereerde imports/CSP/netwerkprimitieven en minimale rechten worden gecontroleerd. Geen code/assets/dependencies van de onderzochte projecten opgenomen.

Native tests installeren de echte gedownloade Actions-wrapper na controle van buitenste digest én binnenste checksum. Linux draait de volledige native suite; macOS Intel de @smoke-subset, beide met de nieuwe compacte-shellproef. Native upgradeproef gebruikt de vaste Sprint 10-baseline uit de workflow. Linux headed: `HEADED=1 xvfb-run -a npm run test:e2e`; Mac: `HEADED=1 npm run test:smoke:chrome`. Installatie van testbrowser: `npm exec playwright install -- --with-deps chromium` (Linux), `npm exec playwright install -- chromium` (Mac).

Deze beheerde cloud blokkeert unpacked extensies. Lokaal rendererbewijs: `CHROMIUM_PATH=/usr/bin/chromium XDG_CONFIG_HOME=/tmp/seatbuddy-chromium-config XDG_CACHE_HOME=/tmp/seatbuddy-chromium-cache npm run test:ui`. Native lokale blokkade is geen PASS; CI wordt afzonderlijk gelezen. [Feasibility](docs/feasibility.md) en [oplevering](docs/reboot-delivery.md) bevatten werkelijk uitgevoerde checks en grenzen.

G0 live Vue **NO-GO / toestemming INCONCLUSIVE**. Geen echte site-/accountinteractie, boeking, betaling, annulering, injectie of verborgen API. Niets gemerged, gedeployd, gereleased of in de Store gepubliceerd. [Changelog](CHANGELOG.md) · [masterplan](SEATMATES_MASTERPLAN.md) · [G0-gids](docs/g0-human-observation-guide.md).

Independent third-party tool. Not affiliated with or endorsed by Vue Cinemas. Grotendeels ontwikkeld met OpenAI Codex; automatische tests zijn geen menselijke acceptatie of formele securityaudit.
