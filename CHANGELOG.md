# Changelog

## 0.4.0-test — 21 oktober 2026 (Sprint 04, SeatBuddies)

- Nieuwe publieke naam SeatBuddies, oorspronkelijk SVG-stoelenmerk, reproduceerbare 16/32/48/128px PNG-iconen en toegankelijk charcoal/crimson/cream/goud-thema. Geen externe fonts of merkassets.
- Echte action-popup met tijdelijke Buddy Manager: optioneel toevoegen, hernoemen, verwijderen, één selectie, lege beginstaat en expliciete fictieve voorbeelden.
- Gedeelde selectie met het volledige Side Panel via beperkte, gevalideerde berichten. Popup krijgt geen A/B-/incognitodata. Verwachte generatie/revisie blokkeert oude of herhaalde mutaties.
- Buddywissel, actieve rename/remove en deselectie vragen bevestiging en wissen B’s oude invoer, context en controles; A blijft zelfstandig. Ook onopgeslagen B-invoer wordt niet bij een andere buddy getoond. Volledig wissen/herstart wist ook bijnamen en conceptvelden.
- Expliciete popupknop opent het echte Side Panel binnen de gebruikersactie; automatisch panel-on-action staat uit. Handmatige assistent zonder buddy en bestaande privacy/fallback blijven behouden.
- Alleen op fixture.html een Vue-reactieve demo-widget met duidelijke NIET GEBOEKT/GEEN VUE INTEGRATIE-labels, geteste stapwissels en teardown.
- Runtimepakket **seatbuddies-0.4.0-chrome-test.zip** met popup/iconvalidatie en checksum. Mac-CI behouden op officieel macos-15-intel na aangetoonde arm64-capaciteitsproblemen; dit is geen arm64- of menselijke Mac-testclaim.

Geen storage-/host-/andere nieuwe Chrome-rechten, productie-injectie, accountidentificatie of checkoutactie. G0 blijft niet gehaald. Werkelijk uitgevoerde controles en per-platform uitkomsten staan in feasibility.

## 0.3.0-test — 21 oktober 2026 (Sprint 03, geen Store-release)

- Platformneutraal `seatmates-0.3.0-chrome-test.zip`, runtime-allowlist, byte-/checksumcontrole en negatieve verpakkingstests; oude Sprint 02-artifactnamen blijven alleen historisch gedocumenteerd.
- macOS-build/unit/UI-matrix naast de Linux-extensieproeven. Nederlandse Mac-QA-, bewijs-, Chrome-agentdebug- en veilige G0-observatiegidsen.
- Expliciete bewijssoorten: SIMULATION, MANUAL_SELF_REPORT, BROWSER_CONTEXT_ONLY en UNKNOWN. Echte Vue-bevestiging blijft NOT_IMPLEMENTED.
- Begrensde berichtenwachttijd, herkenning van een nieuwe worker en bewuste reset bij opnieuw verbinden. Geen wachtrij, vermenging van lokale/workerclaims of herhaling van mislukte opdrachten. Verouderde contextkeuzes vervallen bij tabwijzigingen. Een resetbarrière weigert oudere opdrachten die nog op Chrome wachten.
- Zelfcontrole uitsluitend na gebruikersactie, met gereduceerde tijdelijke diagnostiek zonder planning, identiteit, URL’s of tabnummers.
- Structureel uitgeschakelde productieadapter, beproefd met fictieve HTML/SVG; geen nieuwe manifestrechten. CHROMEWEBSTORE.md is voorbereiding, geen publicatie.

Uitgevoerde controles en hun grenzen staan in [feasibility](docs/feasibility.md). Geen echte accounts, checkoutacties, betalingen of reserveringen getest.

## 0.2.0-test — 20 oktober 2026 (Sprint 02)

Handmatig filmplan, onafhankelijke A/B-stappen, ongeverifieerde stoelvergelijking, echte neutrale Chrome-contextkoppeling en expliciete incognito-opt-in/-intrekking. Linux-CI bewees twee extensieproeven; Windows-menselijke QA bleef open. Geen Vue-integratie.

## 0.1.0-test — 20 oktober 2026 (Sprint 01)

MV3/Vue 3/TypeScript-skelet, twee onafhankelijke fictieve sessies, strict matching, veilige berichtgrenzen, testfixtures en handmatige fallback.
