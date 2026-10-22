# G0 — handmatige, toegestane observatie op macOS

Doel: vaststellen of een toekomstige **read-only** navigatieadapter verantwoord en technisch mogelijk is. De huidige extensie blijft een zelfstandige handmatige assistent. Chrome-contextmetadata en fictieve HTML/SVG-testjes halen G0 niet.

## Eerst toestemming en publieke informatie

Lees zelf de actuele [Vue-voorwaardenindex](https://www.vuecinemas.nl/voorwaarden/algemene-voorwaarden), de relevante gelinkte Movie Pass-voorwaarden en [Movie Pass-informatie](https://www.vuecinemas.nl/subscription/details). Noteer datum, documenttitel, publiek bronadres en alleen relevante niet-persoonlijke bepalingen of een korte samenvatting. Als het toegestane gebruik van een browserhelper/DOM-observatie onduidelijk blijft, noteer **UNKNOWN / INCONCLUSIVE** en vraag Vue langs de gewone eigen route om verduidelijking. Publiek kunnen lezen betekent geen toestemming voor automatisering.

Op 21 oktober 2026 kon deze cloud beide publieke adressen niet bereiken: proxy CONNECT 403. De inhoud en geldende voorwaarden zijn hier niet gelezen. Dat is geen oordeel dat Vue deze toepassing verbiedt of toestaat.

**Sprint 09, 22 oktober:** nieuwe gewone GET naar de index opnieuw CONNECT-proxy-403; geen primaire tekst gelezen. [Gedateerd record](g0-public-research-2026-10.md), [beslismatrix](g0-decision-matrix.md) en [korte publieke kaart voor later](g0-owner-observation-card.md). Deze oudere uitgebreide gids is geen opdracht om nu accounts te gebruiken.

## Begrensde observatie door de gebruiker zelf

1. Begin met publieke pagina's in je eigen Chrome. Noteer uitsluitend of film, bioscoop, datum, tijd en zaal zichtbaar zijn; geen screenshots of HTML-export nodig.
2. Alleen waar je dit zelf rechtmatig mag en de voorwaarden het toelaten, kun je de reeds beschikbare navigatie **zelf** bekijken. Deel geen login, wachtwoord, PIN of accounttoegang met een agent. Gebruik geen agent/MCP/remote debugging op het persoonlijke profiel, ook niet “alleen om te kijken”. De testextensie leest deze pagina's niet.
3. Stop vóór iedere knop of overgang die een stoel selecteert/vasthoudt, betaling, reservering, annulering of andere checkoutactie kan veroorzaken. Is een seatmap alleen via zo'n actie bereikbaar, noteer **NOT_RUN / onbekend**. Je hoeft voor G0 geen kaartje te bestellen of een selectie te maken.
4. Als een seatmap zonder zulke actie zichtbaar én veilig te onderzoeken is, noteer hoogstens HTML / SVG / canvas / onbekend. Alleen de zichtbare vorm kan onvoldoende zijn: “onbekend” is beter dan raden. Geen DOM-dump, consolecode, requests/HAR, responsebody, verborgen API, boekingstoken of screenshot van een ingelogde pagina verzamelen. Als je de representatie niet zonder gevoelige inspectie kunt vaststellen, laat dit onderdeel open.
5. Twee afzonderlijke eigen sessies mag je alleen handmatig vergelijken waar toegestaan. Deel geen identiteiten; rapporteer hoogstens of de twee personen zelf onafhankelijk ingelogd konden blijven. Een normaal/incognitovenster op zichzelf bewijst dit niet. Bij twijfel: onbekend, gebruik aparte eigen profielen en handmatige begeleiding.

## Formulier — alleen hoog-over feiten

Vul een apart record in; sla geen persoonlijke gegevens op in GitHub. Gebruik [qa-evidence-template.md](qa-evidence-template.md) voor omgeving/status.

| Veld                                    | Veilige invulling                                                                                                                                        |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Datum/tijdzone, Chrome/macOS-versie     | Versienummers, geen profielnaam                                                                                                                          |
| Onderzochte publieke voorwaarden        | Publieke URL zonder query/fragment, documenttitel, datum, korte relevante passage/samenvatting; UNKNOWN toegestaan                                       |
| Toestemmingsgrens                       | Expliciet toegestaan / onduidelijk / niet toegestaan, met publieke of geschoonde bron; geen toestemming veronderstellen                                  |
| Domeinklasse                            | Officieel publiek / accountgedeelte / andere partij / UNKNOWN; eventueel alleen vastgestelde publieke origin, nooit persoonlijke paden of URL-parameters |
| Paginatype                              | Publieke film / programma / voorstelling / seatmap / review / anders / UNKNOWN                                                                           |
| Velden visueel aanwezig                 | Film ja/nee/onbekend; bioscoop; datum; tijd; zaal — geen accountinformatie                                                                               |
| Seatmap representatie                   | HTML / SVG / canvas / onbekend / NOT_RUN, plus hoe dit veilig is vastgesteld                                                                             |
| Verschil selectie versus bevestiging    | Alleen algemene zichtbare betekenis waar al rechtmatig bekend; niet testen door te boeken; meestal NOT_RUN                                               |
| Twee zelfstandige sessies               | Zelf handmatig vastgesteld / niet vastgesteld / NOT_RUN; geen namen of identifiers                                                                       |
| Afzonderlijk boeken toegestaan?         | Ja/nee/onbekend met voorwaardenbron; technische mogelijkheid is een andere vraag                                                                         |
| Afzonderlijk boeken technisch mogelijk? | Hoog-over eigen waarneming / onbekend / NOT_RUN; geen boekingsproef vereist                                                                              |
| Stopreden en resultaat                  | PASS voor exact de uitgevoerde beperkte observatie / FAIL / NOT_RUN / BLOCKED / INCONCLUSIVE                                                             |

## Vervolg na het record

Een maintainer beoordeelt toestemming, exact bewezen origins, veldbetrouwbaarheid, accountisolatie en Chrome-scope gezamenlijk in [feasibility](feasibility.md). Een groen veld of publiek voorbeeldadres schakelt niets in. `productionPolicy.enabled` staat vast op `false`, de originlijst is leeg en `observeProduction` leest zelfs het DOM niet. Het toevoegen van echte hostrechten/content scripts vereist een afzonderlijk beoordeelde codewijziging mét G0-bewijs. Stoelacties en bevestigingsherkenning hebben latere gates; automatische finale handelingen blijven uitgesloten.

Bij onvoldoende bewijs blijft de handmatige assistent het geldige product. Geen credentials aanleveren, geen remote debugsessie starten en geen echte boeking uitvoeren om dit formulier compleet te maken.
