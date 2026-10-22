# QA-bewijs — één formulier per proef

Kopieer dit formulier en vul alleen feitelijke, niet-gevoelige observaties in. Geen volledige browserlogs, profielmappen, titels/URL’s van persoonlijke tabs, namen, wachtwoorden, e-mails, pasnummers, cookies/tokens, tickets, QR’s of betaalgegevens. Screenshots uitsluitend van fictieve testdata. Het ingebouwde diagnostische rapport is een optionele tijdelijke momentopname, geen automatische bijlage.

- Proef-ID en concrete stap:
- Datum, tijd, tijdzone:
- OS en versie:
- Browser en versie:
- Extensieversie, volledige commit-SHA, buildbron/run-URL:
- Testomgeving: eigen toegestaan testprofiel / CI-wegwerpprofiel / anders:
- Incognitotoegang: uit / expliciet aan / onbekend:
- Verwacht gedrag:
- Werkelijk waargenomen gedrag:
- Reproductie met uitsluitend fictieve velden:
- Status: PASS / FAIL / NOT_RUN / BLOCKED / INCONCLUSIVE:
- Bewijssoort: STATIC_CHECK / MOCK_INTEGRATION / handmatige fictieve Chrome-QA / MANUAL_LIVE_OBSERVATION (alleen apart toegestane G0-proef):
- Beperking en volgende kleinste controle:

**PASS** betekent dat de beschreven controle daadwerkelijk is uitgevoerd en slaagde; **FAIL** is een waargenomen afwijking; **NOT_RUN** is niet uitgevoerd; **BLOCKED** heeft een concrete uitvoeringsblokkade; **INCONCLUSIVE** heeft te weinig bewijs. Een build is geen installatieproef. Visueel openen is geen A/B-test. Linux is geen Mac- of Windows-bewijs. USER_REPORTED_PARTIAL_SMOKE is de bronkwalificatie van de gemelde Mac-opening van 20 oktober 2026, geen extra PASS voor onbekende stappen.

Voor echte websiteobservaties gebruik je ook het begrensde formulier in [g0-human-observation-guide.md](g0-human-observation-guide.md). Geen boeking uitvoeren voor deze QA.

## Eerste 0.8.0-test

De [Mac-installatiegids](macos-test-guide.md) bevat één veilig kopieerbaar compact formulier met alle menselijke regels aanvankelijk **NOT_RUN**. Vul de exacte volledige SHA uit de gedownloade Actions-run in, niet alleen 0.8.0. Lokale FICTIONAL_TEST-resultaten zijn afzonderlijk van menselijke/native QA. Upload nooit een heel profiel of ruwe browserlog; **Meld een probleem** opent een leeg issue en verstuurt niets automatisch.
