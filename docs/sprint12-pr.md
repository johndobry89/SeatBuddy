# Draft PR — Sprint 12 / Operation Reboot

**Titel:** Sprint 12: compacte Vue-start, gerepareerde pollingknop en eerlijk product-NO-GO

**Base:** `feat/issue-25-sprint-11`

**Head:** `feat/issue-27-sprint-12`

**State:** DRAFT; niets mergen/publiceren. Refs #27.

## Probleem en gedrag

De eigenaar kon0.10.1 op Mac installeren en zien, maar de lange administratieve flow faalde productmatig en Start simulatie knipperde. De normale popup/Side Panel hebben nu één compact scherm met één officiële Quick Ticket-link, zonder filmformulier, buddybeheer, technische status of polling. Alle eerdere tools blijven bewust bereikbaar achter Ontwikkelaarstests; sluiten behoudt onopgeslagen concepten en pauzeert verversen.

De oorzaak van het knipperen is daadwerkelijk FAIL→PASS gereproduceerd: GET_STATE deelt geen disabled-status meer met mutaties. Tien vertraagde2 seconden-polls houden opacity/focus stabiel; echte acties blijven correct disabled. Late replies/scope disposal zijn afgeschermd. Packaging accepteert statische lokale Vite-backtickimports met dezelfde exact-targetvalidatie; expressies, externe/ontsnappende/ontbrekende targets blijven geblokkeerd met regressies.

Klein alleen-fictief toekomstontwerp hergebruikt de ZERO EXTRA-engine: bestaande voorstelling/stoelpaar → onafhankelijke A/B-reviews in 3 acties,30 seconden geldig. Geen nieuwe administratie in de productroute. Vijf OSS-bronnen onderzocht, niets gekopieerd/geïnstalleerd; officiële bronnen met403 en issue-ledgergegevens expliciet onderscheiden. Kort Vue-toestemmingsconcept voorbereid, niet verstuurd.

## Gates en veiligheid

**PRODUCT_VALUE NO-GO:** geen nieuwe geverifieerde live stoel-/voorstelling-/kosteninformatie of bewezen echte tijdwinst tegenover twee tabs. Geen voordeelclaim uit de synthetische6→3-actieproef. Stop speculatieve uitbreiding pending een officieel toegestane bron. G0 NO-GO/toestemming INCONCLUSIVE. Nieuwe menselijke Mac0.11-proef NOT_RUN; oude0.10.1-proef geïnstalleerd/renderend maar UX FAIL.

Exact sidePanel/storage, spanning en strikte CSP. Geen hosts/content scripts/activeTab/scripting/tabs/cookies, nieuwe dependencies, accounts, injectie, checkout, reservering, betaling of annulering. Opt-in nickname-/conceptbewaring en worker/B-isolatie behouden; geen stilzwijgende datawisactie of statusherstel.

## Validatie en artifact

Zie [concreet uitvoeringsledger](reboot-delivery.md) voor exacte runs/head/conclusies en hash.331 unit/contract en31 UI zijn de verwachte suiteomvang na de daadwerkelijk uitgevoerde regressies; platformbewijs wordt uitsluitend op afgeronde runs geclaimd. Native Linux volledige11, Mac Intel7 smoke inclusief nieuwe product-shellproef; lokale beheerde installaties blijven afzonderlijk BLOCKED. Tests installeren echte Actions-wrapper na buitenste digest + inner checksum, geen dist-vervanging. Geen menselijke Finder/arm64/VoiceOver of live Vue-PASS.

Runtime **seatbuddies-0.11.0-chrome-test.zip**,31 files/127441 bytes, SHA256 `5b4e69b7780d85d808d97f43e372982926b39fca7984eb78d395d5a02fb800c8`. Alleen runtime/iconen/volledige notices. Korte installatie-/Mac-kaart, benchmark, ADR-010, bronmapping en securityreview bijgewerkt.

## Beoordelen

[Benchmark](ux-reset-benchmark.md), [Vue-besluit](vue-integration-decision-2026-10.md), [securityreview](security-review-sprint12.md), [ADR-010](decisions/ADR-010-product-shell-reboot.md), [Mac-kaart](macos-test-guide.md). Overige PR-keten/main blijven ongewijzigd; deze draft niet mergen zonder afzonderlijke opdracht.
