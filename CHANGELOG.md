# Changelog

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
