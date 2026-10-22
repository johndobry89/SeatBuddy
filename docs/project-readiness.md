# Klaar voor je eerste fictieve Mac-proef

**SeatBuddies 0.10.1-test — Field Trial, 22 oktober 2026.**

**Wat heb je eraan?** Plan één filmavond solo of samen, vergelijk zelf ingevulde voorstelling/stoelen en volg A en B onafhankelijk. Buddybijnamen zijn optioneel. ZERO EXTRA helpt in de fictieve oefenkaart begrijpen waarom Ultra Lux, bijbetaling, onbekende kosten en een gangpad afvallen.

**Wat doet het niet?** SeatBuddies leest Vue niet, herkent geen account, reserveert of annuleert niets en doet geen betaling. Zelf ingevulde F10/F11 bewijzen geen echte aangrenzendheid. Een geslaagde lokale zelftest is uitsluitend FICTIONAL_TEST, geen boekings- of Mac-goedkeuring.

**Eerste klik:** download **seatbuddies-chrome-test** uit de geslaagde [opleverrun](field-trial-delivery.md). Controleer de binnenste ZIP/checksum, laad de uitgepakte map met rootmanifest, pin het stoelenicoon en klik in de popup **Open boekingsassistent**. Volg daarna de [bestaande kaart van 5–8 minuten](macos-test-guide.md), optioneel drie minuten ZERO EXTRA. Je hoeft nu niet te testen om deze sprint af te ronden.

**Als iets vastloopt:** bij een Side Panel-fout staat **Open assistent in normaal venster** klaar. Een gewone assistenttab is een afzonderlijke fallback. Bij installatiebeleid: BLOCKED, geen omzeiling. Verkeerde checksum/rootmap/versie: stop en download de juiste run opnieuw. Gebruik het ene geschoonde rapport op de Mac-kaart; geen screenshots of volledige logs nodig.

**Privacy:** gebruik verzonnen filmgegevens en korte bijnamen. Onthouden staat uit; alleen na toestemming wordt nickname/ID lokaal bewaard. Een apart bewaard vijfveldenconcept vervalt na vier uur en verdwijnt bij reload/update/browserherstart. Geen pasnummers, wachtwoorden, accounts, betaling of boekingsbewijs opslaan. Chrome-opslag is niet standaard versleuteld. Lokaal wissen annuleert niets; uninstall wist de extensieopslag.

| Besluit                                                   | Status                                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Automatische handmatige/fictieve techniek                 | Alleen GO voor daadwerkelijk geslaagde controles per platform/SHA; [bewijs en beperkingen](field-trial-delivery.md) |
| Jouw menselijke Mac-acceptatie, Windows, arm64, VoiceOver | **NOT_RUN**; automatische Mac Intel is afzonderlijk                                                                 |
| Echte Vue-integratie / G0                                 | **NO-GO / INCONCLUSIVE**, voorwaarden, accounts en echte stoel-/kostenbron niet vastgesteld                         |
| Merge, deploy, release, Store/publicatie                  | **NOT_AUTHORIZED**; alle eerdere draft-PR’s blijven ongemoeid                                                       |

**Na een gemelde FAIL:** reproduceer met uitsluitend fictieve data, leg één gericht regressie-issue vast, repareer het kleinste aantoonbaar defecte oppervlak en draai de getroffen tests plus volledige CI opnieuw. Daarna pas dezelfde menselijke stap herhalen. Geen automatische issue-aanmaak, telemetrie, verzonnen bug of menselijke PASS. Historische integratierepetities uit S08 zijn geen toestemming om de huidige stapel te mergen.
