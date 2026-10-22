# Chrome Web Store — SeatBuddies (voorbereiding)

Bijgewerkt **22 oktober 2026**. **DRAFT — niet ingediend, gepubliceerd of goedgekeurd.** Testversie **0.10.0**, MV3, Chrome 116+. Dit document beschrijft de huidige runtime en is geen Storetoelating. [ADR-006](docs/decisions/ADR-006-explicit-local-retention.md) vervangt uitsluitend de oudere geen-opslagkeuze; overige invarianten blijven gelden.

## Conceptlisting

**Naam:** SeatBuddies — samen naar de film (test)

**Korte omschrijving:** Eén filmavond, twee eigen trajecten. Plan samen, controleer apart; SeatBuddies boekt niets.

De Chrome-popup beheert optionele korte buddybijnamen en opent het Side Panel. Het Filmavond-overzicht toont een eigen filmplan, één of na expliciete keuze twee afzonderlijke vijfstappenlijsten, eigen controletijd/herkomst en een veilige vervolgstap. Verschillen, ontbrekende zaal, verlopen controles, logout en contextverlies vragen nieuwe eigen controle. Een nickname is geen accountidentiteit; een zelfmelding is geen websitebevestiging. Opeenvolgende stoelnummers bewijzen geen aangrenzende beschikbaarheid of hold.

**Nieuw plan: SOLO.** Een bijnaam activeert B niet. **Ook met buddy plannen** is een aparte keuze; uitschakelen vraagt bevestiging bij B-invoer/geschiedenis, wist alleen lokaal B en behoudt A. Plan → lokale review → geordende eigen stappen. Wijzigingen/expiry/contextverlies maken review ongeldig; mode en review worden nooit opgeslagen/hersteld. Lokaal wissen draait geen boeking terug en annuleert niets. Zie [ADR-007](docs/decisions/ADR-007-ephemeral-planning-review.md).

Bijnamen zijn standaard tijdelijk. Alleen na expliciet inschakelen worden nickname/ID-paren lokaal onthouden. Een afzonderlijke knop kan uitsluitend filmplan-conceptvelden maximaal vier uur in Chrome-sessiegeheugen bewaren. Herstellen vult alleen bewerkbare invoer; nooit een actief plan, stoelen, A/B-controles of bevestigingen. Het product werkt zonder buddy of opslag. Geen extra-pass-autofill, accountvalidatie, checkout, betalingen of automatische reserveringen. De widget en 90-secondenproef staan uitsluitend op de verpakte fictieve testpagina.

Independent third-party tool. Not affiliated with or endorsed by Vue Cinemas. Reservations remain separate and are only final when independently confirmed by Vue.

**Sprint 09:** alleen een verpakt fictief read-only adapterlab; geen echte Vue-observer of injectie. Openbaar voorwaardenonderzoek BLOCKED; FAQ/voorwaarden/toestemming onbekend. Observaties blijven UNKNOWN, worden niet bewaard of in diagnose gekopieerd. Geen aangezette Vue-integratie adverteren.

**ZERO EXTRA, Sprint 10:** harde SeatBuddies-productkeuze van de eigenaar: nooit Ultra Lux of een betaalde fallback. Alleen Lux/Saver Lux/Super Saver Lux als mogelijke categorie, kosten blijven op Vue te controleren; geen geverifieerde universele Vue-prijsaanspraak. Werkende duo-zoeker uitsluitend op fictieve kaart, inclusief toegankelijkheidsroute zonder gezondheidsgegevens. Optionele eigen categorie blijft vluchtig en ontbreekt in opslag/diagnostiek. Geen live beschikbaarheid/hold/boekingsclaim.

## Lokale eerste proef

**Controleer SeatBuddies** is een expliciete tijdelijke FICTIONAL_TEST op geïsoleerde eigen kernlogica, protocol, los fictief DOM en publieke API-aanwezigheid. Geen gebruikerstoestand, opgeslagen bijnamen/concepten, persoonlijke tabs of incognitogegevens worden gelezen of gewijzigd. Geen netwerk, upload, QA-opslag of nieuwe permissie. De strict allowlisted kopie bevat uitsluitend scope, veilige extensie-/adapterversie, vaste test-ID/status/grove codes. Overall succes bewijst geen browserinstallatie, storagewerking, accountkoppeling of echte reservering. Kopiëren naar het systeemklembord gebeurt alleen na klik, met exacte preview en werkelijke succes-/weigeringfeedback.

## Rechtenverantwoording

| Recht     | Gebruik                                                                     | Beperking                                                                                                      |
| --------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| sidePanel | Eigen assistent naast het browservenster openen na een gebruikersklik       | Geen pagina-injectie of checkoutactie                                                                          |
| storage   | Expliciet opt-in nickname/ID-lijst en afzonderlijk bewaard filmplan-concept | Alleen local/session, TRUSTED_CONTEXTS vóór toegang, schema’s/limieten/wisacties; geen status of incognitodata |

Geen host/optional/content-script/tabs/cookies/activeTab/scripting/debugger/history/identity/webRequest/unlimitedStorage-permissies. Incognito spanning is opt-in in Chrome; het normale paneel kan alleen expliciet gekozen neutrale tab-/venstermetadata gebruiken. Workercontrole van document én venster weigert incognito/onbekende popup/paneelverzoeken vóór gedeelde/retentiegegevens. Het procesvlaggetje inIncognitoContext alleen is onvoldoende. Native popup/paneel zonder volledige Chrome-metadata krijgen een unieke live document-URL en zijn alleen toegelaten zolang Chrome extensietoegang in incognito uitschakelt. Met die toegang aan vraagt de onduidelijke native route om **Open assistent in normaal venster**: een gewone extensietab met verifieerbare normale document-/venstermetadata en volledige functies. Geen focusheuristiek of clientclaim als herkomstbewijs. Geen storage.sync, backend, analytics, externe scripts/fonts of runtimeconnecties.

## Privacy en bewaartermijnen

| Gegevens                                                                                                       | Verwerking en retentie                                                                                                                                     | Buiten apparaat |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Optionele bijnamen, opaque ID                                                                                  | Maximaal twaalf, gevalideerd, tijdelijk; alleen na expliciete opt-in in storage.local tot verwijderen/uitschakelen/uninstall                               | Nee             |
| Gekozen buddy, solo/samenkeuze en review                                                                       | Alleen coordinatorgeheugen, nooit opgeslagen of hersteld                                                                                                   | Nee             |
| Film/cinema/datum/tijd/optionele zaal                                                                          | Eigen geheugeninvoer; alleen na specifieke bewaaractie als concept in storage.session, max. vier uur                                                       | Nee             |
| Gewenste rij/stoel, A/B-stappen, problemen, controletijd                                                       | Alleen geheugen, eigen controles vervallen na 15 minuten; nooit opslag/herstel                                                                             | Nee             |
| Expliciet gekozen tab-/venster-ID’s, incognitovlag                                                             | Alleen tijdelijke contextboekhouding, geen account/geschiedenis; nooit opslag                                                                              | Nee             |
| Diagnostiek                                                                                                    | Expliciete technische allowlistpreview met veilige versie/build/adapter/foutcode/capabilities, geen privévelden; alleen zelf kopiëren naar systeemklembord | Nee             |
| Wachtwoorden, pas-/accountnummers, emails, cookies, tokens, tickets/QR, betaaldata, paginatitels/ingelogde DOM | Niet gevraagd, gelezen, opgeslagen of verzonden door de extensie                                                                                           | Nee             |

**Lokale Chrome-opslag is niet standaard versleuteld.** Bijnamen kunnen persoonlijk betekenisvol zijn: kies een korte fictieve of niet-identificerende bijnaam; geen accountinformatie. Nicknames zijn geen geheimenkluis. Schema’s beperken velden, aantallen, formaten en totale payload; ze kunnen niet de betekenis van alle vrijwillig getypte tekst bewijzen. Er wordt geen volledige snapshot opgeslagen of gelogd.

Vóór gebruik beperkt de worker local én session tot TRUSTED_CONTEXTS; een mislukte restrictie levert zichtbare onbeschikbaarheid, geen schijnsucces of alternatieve browseropslag. Dit sluit toekomstige content scripts uit maar is geen sandbox tussen eigen verpakte extensiepagina’s: die blijven vertrouwde code. De fictieve widget krijgt via het protocol geen onthouden nickname/roster en bevat geen opslagcode. Popup krijgt geen filmplaninhoud, A/B- of incognitodata. Geen automatische externe overdracht. Een bewuste kopieeractie schrijft de exact getoonde diagnose naar het systeemklembord; de extensie uploadt niets. De aparte **Meld een probleem**-link opent een leeg GitHub-issue zonder query/payload. CSP sluit externe scripts/verbindingen uit.

**Workerstop:** alleen opt-in nickname/ID en een nog geldig expliciet concept kunnen blijven. Gekozen buddy, samenmodus, review, actief plan, A/B-vinkjes, seats, observaties en bindings starten leeg. Concept wordt nooit automatisch teruggezet. **Browserherstart of extensie-disable/reload/update:** Chrome-sessieconcept weg; alleen opt-in local-lijst blijft. **Conceptverloop:** toekomstige/ongeldige/onbekende/te grote records worden verwijderd; verlopen concept bij volgend gebruik geweigerd/verwijderd. Geen gevoelige quarantinekopie of log.

**Wissen:** individuele verwijdering werkt de opgeslagen lijst bij. De laatste verwijderen/**Wis alle buddy’s**, uitschakelen/**Vergeet opgeslagen buddies** verwijdert de local-key en het concept; bestaande namen kunnen bij uitschakelen uitsluitend tijdelijk blijven. **Verwijder concept** verwijdert alleen de opgeslagen conceptkey en behoudt huidige formuliervelden. **Wis alle tijdelijke gegevens** en expliciet herverbinden wissen beide keys, coördinator en clientconcepten. Een waargenomen incognitotoestemmingswijziging verwijdert het concept. Bij wisfout wordt geen verwijdering bevestigd; uninstall wist extensieopslag. Verwijderen: chrome://extensions → SeatBuddies → Verwijderen; daarna eigen runtime-map verwijderen.

- [x] Geen verkoop van gegevens.
- [x] Alleen gebruik voor de beschreven lokale assistentfunctie.
- [x] Geen gebruik voor kredietwaardigheid of leningen.

## Licenties en technische integratie

De test-ZIP bevat eigen LICENSE en gegenereerde THIRD_PARTY_NOTICES.txt voor daadwerkelijk gebundelde MIT-modules. Dependencies blijven lockfile-pinned; inspectie/advisoryresultaat in [S08-review](docs/security-review-sprint08.md). Dit is geen juridische vrijgave of supply-chain-attestatie. Beide integratiepaden zijn uitsluitend lokaal gerepeteerd; geen branch/PR is gemerged. Store- en publieke distributie blijven NO-GO zonder afzonderlijke gates/toestemming.

## Indieningsvoorwaarden en assets

Originele SVG en PNG-iconen 16/32/48/128px zijn aanwezig. [Designsystem](docs/design-system.md) bevat werkelijk gemaakte fictieve rendererbeelden, geen authentieke Vue-/Macbeelden. Store-screenshots/promotieassets in vereiste formaten, publishernaam/contact, naam-/merkrechtcontrole, publieke privacybeleid-URL en actuele Store-policyreview moeten vóór eventuele indiening nog worden afgerond. Geen gegevens verzinnen of deze test-ZIP als Storepakket presenteren.

Support/homepage: https://github.com/johndobry89/SeatBuddy. Huidige distributie is broncode en unpacked test-ZIP/checksum via Actions. Geen accountinstellingen, zichtbaarheid of Storepublicatie wijzigen binnen deze sprint.

| Versie      | Datum      | Wijziging                                                                                         | Storestatus           |
| ----------- | ---------- | ------------------------------------------------------------------------------------------------- | --------------------- |
| 0.10.0-test | 2026-10-22 | ZERO EXTRA: fictieve duo-matcher, harde Ultra Lux-/kostenfilter en optionele eigen categorie      | Draft, niet ingediend |
| 0.9.0-test  | 2026-10-22 | The Reality Gate: fictieve read-only port, openbaar onderzoek BLOCKED, G0-matrix                  | Draft, niet ingediend |
| 0.8.0-test  | 2026-10-22 | Integration Forge: reset/TTL/diagnosehardening, echte verpakte native testbron en runtime-notices | Draft, niet ingediend |
| 0.7.0-test  | 2026-10-21 | First-Run Forge: kortere planning en geïsoleerde lokale proef                                     | Draft, niet ingediend |
| 0.6.0-test  | 2026-10-21 | Projector Ready: solo/samen, lokale review, herstel en diagnosekopie                              | Draft, niet ingediend |
| 0.5.0-test  | 2026-10-21 | Movie Night HQ, expliciet nickname-onthouden en concept-only herstel                              | Draft, niet ingediend |
| 0.4.0-test  | 2026-10-21 | Werkende Buddy Manager, popup/paneel, originele iconen en fictieve widget                         | Niet ingediend        |
| 0.3.0-test  | 2026-10-21 | Platformneutrale testbuild, Mac-QA, herstel en diagnostiek                                        | Niet ingediend        |
| 0.2.0-test  | 2026-10-20 | Handmatige A/B-assistent                                                                          | Niet ingediend        |

Feitelijke controles en platformgrenzen: [feasibility](docs/feasibility.md). G0 live Vue **NOT PASSED**. Geen Storebeoordeling, echte boekingsbevestiging of menselijke Mac-acceptatie geclaimd. De op 20 oktober gemelde opening blijft USER_REPORTED_PARTIAL_SMOKE.
