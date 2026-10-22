# Draft PR — Sprint 12 / Operation Reboot

**Titel:** Sprint 12: compacte Vue-start, gerepareerde pollingknop en eerlijk product-NO-GO

**Base:** `feat/issue-25-sprint-11`

**Head:** `feat/issue-27-sprint-12`

**State:** DRAFT; niets mergen/publiceren. Refs #27.

## Probleem en gedrag

De eigenaar kon 0.10.1 op Mac installeren en zien, maar de lange administratieve flow faalde productmatig en Start simulatie knipperde. De normale popup/Side Panel hebben nu één compact scherm met één officiële Quick Ticket-link, zonder filmformulier, buddybeheer, technische status of polling. Alle eerdere tools blijven bewust bereikbaar achter Ontwikkelaarstests; sluiten behoudt onopgeslagen concepten en pauzeert verversen.

De oorzaak van het knipperen is daadwerkelijk FAIL→PASS gereproduceerd: GET_STATE deelt geen disabled-status meer met mutaties. Tien vertraagde polls van twee seconden houden opacity/focus stabiel; echte acties blijven correct disabled. Late replies/scope disposal zijn afgeschermd. Packaging accepteert statische lokale Vite-backtickimports met dezelfde exact-targetvalidatie; expressies, externe/ontsnappende/ontbrekende targets blijven geblokkeerd met regressies.

Klein alleen-fictief toekomstontwerp hergebruikt de ZERO EXTRA-engine: bestaande voorstelling/stoelpaar → onafhankelijke A/B-reviews in 3 acties, 30 seconden geldig. Geen nieuwe administratie in de productroute. Vijf OSS-bronnen onderzocht, niets gekopieerd/geïnstalleerd; officiële bronnen met HTTP 403 en issue-ledgergegevens expliciet onderscheiden. Kort Vue-toestemmingsconcept voorbereid, niet verstuurd.

## Gates en veiligheid

**PRODUCT_VALUE NO-GO:** geen nieuwe geverifieerde live stoel-/voorstelling-/kosteninformatie of bewezen echte tijdwinst tegenover twee tabs. Geen voordeelclaim uit de fictieve vergelijking van zes met drie acties. Stop speculatieve uitbreiding pending een officieel toegestane bron. G0 NO-GO/toestemming INCONCLUSIVE. Nieuwe menselijke Mac-proef voor 0.11 NOT_RUN; oude 0.10.1-proef geïnstalleerd/renderend maar UX FAIL.

Exact sidePanel/storage, spanning en strikte CSP. Geen hosts/content scripts/activeTab/scripting/tabs/cookies, nieuwe dependencies, accounts, injectie, checkout, reservering, betaling of annulering. Opt-in nickname-/conceptbewaring en worker/B-isolatie behouden; geen stilzwijgende datawisactie of statusherstel.

## Validatie en artifact

**Werkelijk afgerond:** [run 39864149479](https://github.com/johndobry89/SeatBuddy/actions/runs/39864149479) op ebfdae8bbb804d6cadff0ccc9b49e0dee43a74b9 **SUCCESS 6m27s**. Linux Ubuntu 24.04 **331 unit / 31 UI / 11 native PASS**; Mac Intel **331 unit / 31 UI / 7 native smoke PASS**. Inclusief strikte popupgeometrie, zelfstandig A/B, privacy/storage/restart, self-test, ZERO EXTRA en upgradebarrière. Eerdere native layoutfouten en Linux-installatietimeout eerlijk vastgelegd in het [ledger](https://github.com/johndobry89/SeatBuddy/blob/feat/issue-27-sprint-12/docs/reboot-delivery.md), niet als groen geteld.

De lokale beheerde Chrome-installaties blijven afzonderlijk BLOCKED vóór de worker. Native CI installeert de daadwerkelijke Actions-wrapper na buitenste digest 85eb7945… + vaste inner checksum, geen dist-vervanging. Geen menselijke Finder/arm64/VoiceOver/Chrome 116 of live Vue-PASS. Alleen documentatie volgt deze gezamenlijke gevalideerde implementatie; definitieve dochead heeft eigen volledige CI, actuele conclusies afzonderlijk in eindoverdracht gecontroleerd.

Runtime **seatbuddies-0.11.0-chrome-test.zip**, 31 files/127441 bytes, SHA256 `5b4e69b7780d85d808d97f43e372982926b39fca7984eb78d395d5a02fb800c8`. Alleen runtime/iconen/volledige notices. Korte installatie-/Mac-kaart, benchmark, ADR-010, bronmapping en securityreview bijgewerkt.

## Beoordelen

[Benchmark](https://github.com/johndobry89/SeatBuddy/blob/feat/issue-27-sprint-12/docs/ux-reset-benchmark.md), [Vue-besluit](https://github.com/johndobry89/SeatBuddy/blob/feat/issue-27-sprint-12/docs/vue-integration-decision-2026-10.md), [securityreview](https://github.com/johndobry89/SeatBuddy/blob/feat/issue-27-sprint-12/docs/security-review-sprint12.md), [ADR-010](https://github.com/johndobry89/SeatBuddy/blob/feat/issue-27-sprint-12/docs/decisions/ADR-010-product-shell-reboot.md), [Mac-kaart](https://github.com/johndobry89/SeatBuddy/blob/feat/issue-27-sprint-12/docs/macos-test-guide.md). Overige PR-keten/main blijven ongewijzigd; deze draft niet mergen zonder afzonderlijke opdracht.
