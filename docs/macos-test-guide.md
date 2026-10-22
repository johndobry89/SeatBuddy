# Mac-kaart — de rustige start, 0.11.0-test (2 minuten)

**Nieuwe menselijke proef NOT_RUN.** De eerdere 0.10.1 installeerde/renderde volgens de eigenaar, maar **UX FAIL**. Je hoeft die lange proef niet te herhalen. Dit is optioneel, na de bouw; alleen een eigen toegestaan testprofiel. Geen Vue-login of echte boeking nodig.

1. Download **seatbuddies-chrome-test** uit de juiste geslaagde [Sprint12-run](reboot-delivery.md). Pak de Actions-wrapper uit. Controleer `shasum -a 256 seatbuddies-0.11.0-chrome-test.zip` tegen `.zip.sha256` én de opleverhash. Pak de binnenste ZIP uit. Chrome → `chrome://extensions` → Ontwikkelaarsmodus → Uitgepakte extensie laden → vaste map met rootmanifest. Versie0.11.0, uitsluitend sidePanel/storage. Bij afwijking of beleidblokkade stoppen, niet omzeilen. Incognitotoegang uit voor deze proef.
2. Open de popup. Zie je zonder scrollen één **Open Vue Quick Ticket**-knop, zonder formulier, buddykaarten of statuscodes? De knop opent alleen de officiële openbare homepage; verder niets. Niet inloggen/boeken voor deze proef. Houd de start twintig seconden open: geen knipperen. Side Panel optioneel via **Hulp en privacy → Open boekingsassistent**. Bij fout: **Open assistent in normaal venster**; noteer fallback afzonderlijk.
3. Is dit werkelijk nuttiger dan je eigen Vue-bladwijzer/twee tabs, of alleen rustiger? **Geen voordeel is een geldig resultaat.** Advies blijft stoppen met nieuwe functies totdat een toegestane Vue-koppeling echte winst kan leveren.

Eventueel: **Ontwikkelaarstests** opent de eerdere fictieve QA-tools; **Terug naar Vue-start** sluit ze. Niet verplicht, geen film-/buddy-invoer nodig. Een mislukte boeking wordt nooit automatisch hersteld/geannuleerd. De [oude uitgebreide kaart](macos-developer-test-guide.md) is uitsluitend historische ontwikkelaar-QA: open eerst Ontwikkelaarstests, niet de productroute of een acceptatie-eis.

Kort terugmelden, alleen werkelijk uitgevoerde regels aanpassen:

```text
Buildcommit / CI-run / inner SHA256:
macOS / Chrome (geen profielpad):
Installatie: NOT_RUN
Popup compact, zonder scroll/formulier: NOT_RUN
Side Panel (of afzonderlijke normale-tabfallback): NOT_RUN
20 seconden stabiele start: NOT_RUN
Nut boven mijn huidige twee tabs: NOT_RUN
Korte waarneming (geen privégegevens):
```

Geen namen/e-mail/pasnummers/tickets/accountfoto's of logs nodig. Menselijke tijdmeting op echte boekingen is niet gevraagd. Automatische Mac Intel CI bewijst geen Finder-, arm64- of VoiceOver-werking. [Eerlijke benchmark](ux-reset-benchmark.md).
