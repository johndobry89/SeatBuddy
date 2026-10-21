# Sprint 03 — handmatige Chrome-proef op Mac en Windows

Gebruik alleen fictieve film-/stoelgegevens en neutrale tabs. Geen echte accounts, live checkoutacties of aankoop. Noteer per stap datum/tijd/tijdzone, OS, Chrome-versie, commit, extensieversie en de werkelijk geziene uitkomst. Installatie: [Mac-testgids](macos-test-guide.md) of [Windows-testgids](windows-test-guide.md). Bewijs vastleggen: [QA-formulier](qa-evidence-template.md).

| Proef                                                  | Verwacht gedrag                                                                                                                   |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Extensie laden en werkbalkicoon klikken                | Echte Chrome Side Panel opent; assistent is standaard, simulatie is apart                                                         |
| Plan zonder zaal                                       | Geldige voorlopige planning; voorstellingmatch blijft UNKNOWN                                                                     |
| Ongeldige datum, lege film/locatie/tijd                | Geen geldig opgeslagen plan of sterke match                                                                                       |
| A/B eigen invoer bewaren                               | Alleen expliciete eigen film-/stoelgegevens; geen accountgegevens                                                                 |
| Alleen A door vijf stappen                             | A zelf gemeld afgerond, B onvoltooid; partiële melding, geen websitebevestiging                                                   |
| Andere tijd/zaal in B                                  | Geen doorgang langs voorstellingcontrole; foutpad vraagt eigen vergelijking                                                       |
| Opeenvolgende stoelnummers                             | Alleen ongeverifieerde nummervergelijking, geen echte buur-/beschikbaarheidsclaim                                                 |
| Uitloggen/mismatch/onzekere uitkomst melden            | Alleen die persoon moet opnieuw controleren; geen retry/rollback                                                                  |
| Wijzigen eigen details / opnieuw plannen               | Eigen controles / beide controles vervallen zoals vooraf aangegeven                                                               |
| Plan tijdens polling bewerken                          | Onopgeslagen invoer blijft staan; focus en cursor blijven bruikbaar                                                               |
| Tab/Shift+Tab/Enter op 320px                           | Labels, knoppen, uitklappen en focus bruikbaar; geen horizontale overflow                                                         |
| Expliciete normale context A                           | Alleen browsermetadata gekoppeld, geen account of sitewaarneming                                                                  |
| B zonder incognitotoegang of normaal venster           | Koppeling geweigerd; bruikbare handmatige route blijft beschikbaar                                                                |
| Expliciete incognito-opt-in, neutrale tab B            | Alleen als Chrome het toestaat: aparte tab-/venster-/incognitometadata zichtbaar in normaal paneel                                |
| Navigatie/sluiten/vervangen/verplaatsen gekoppelde tab | Koppeling en eerdere eigen controles van die persoon vervallen                                                                    |
| Incognitotoegang intrekken                             | B-koppeling/progressie vervalt; een workerreload mag alle tijdelijke gegevens wissen                                              |
| 15 minuten zonder nieuwe eigen controle                | Eigen voortgang vervalt; plan en stoelwensen blijven ongeverifieerde invoer                                                       |
| Worker stoppen / browser herstarten                    | Geen herstel van voortgang, geen acties opnieuw uitvoeren, opnieuw plannen                                                        |
| Geen Chrome-runtime                                    | Lokale handmatige assistent werkt zonder browserkoppeling; herladen wist alles                                                    |
| Fictieve simulatie / pakketpagina                      | SIMULATION, nooit echte bevestiging; echte metadata voor reguliere fixture A; B als verpakte incognitopagina is NO-GO in spanning |
| Rechten/netwerk/opslag inspecteren                     | Alleen sidePanel-permissie, geen hostrechten of automatische externe requests, geen persistente plan-/incognitogegevens           |

Automatische echte-extensietests openen het Side Panel vanuit een expliciete klik en controleren echte browserzenders. Een tweede test schakelt via de normale Chrome-instellingen in een eigen wegwerpprofiel expliciet incognitotoegang in/uit, koppelt neutrale Chrome-contexten en stopt de worker via testinstrumentatie. Dit wijzigt geen beheerd browserbeleid en gebruikt geen productiepagina. Leg PASS alleen vast als die test werkelijk in die omgeving heeft gedraaid.

Voor G0 is de volgende menselijke stap: actuele publieke Vue-voorwaarden/help beoordelen en toestemming/scope vastleggen, daarna alleen een toegestane handmatige observatie van de benodigde velden. Geen G0-GO uit fixturetests, publieke marketingtekst of Chrome-contextmetadata afleiden.

## Aanvullende Sprint 03-regressies

| Proef                                     | Verwacht gedrag                                                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Nieuwe workergeneratie in een open paneel | Snapshot vervangen, eerdere voortgang UNKNOWN, hersteladvies; geen automatisch plan/acknowledgement                  |
| Transport hangt of antwoord is ongeldig   | Na maximaal vier seconden lokale fallback, busy vrij, oude claims weg; late antwoorden herstellen niets              |
| Expliciet opnieuw verbinden               | Alleen reset van alle tijdelijke lokale/gedeelde gegevens; geen merge/replay van eerdere opdrachten                  |
| Herverbinden mislukt                      | Bestaande lokale conceptinvoer blijft bruikbaar                                                                      |
| Diagnostiek openen zonder uitvoeren       | Geen rapport; pas na bewuste zelfcontrole een gereduceerde momentopname                                              |
| Zelfcontrole                              | Versie, capabilities, scope, toestemming, modus en bewijssoorten; geen film, identiteit, titels, URL’s of tabnummers |
| Bewijslabels                              | MANUAL_SELF_REPORT, BROWSER_CONTEXT_ONLY, SIMULATION of UNKNOWN; echte Vue-bevestiging NOT_IMPLEMENTED               |
| Productieadapter met voorbeeldmarkup      | Altijd UNAVAILABLE, geen DOM-toegang of hostrechten                                                                  |
| Runtime-ZIP                               | Platformneutrale naam; manifest aan root; checksum/bytes kloppen; geen broncode, .env, logs, caches of symlinks      |

Een geslaagde macOS-build/unit/UI-job valideert geen menselijke Side Panel-bediening, incognito of VoiceOver op Mac. De echte extensieproeven draaien afzonderlijk op Linux. Gebruik de G0-gids voor toegestane echte observaties; die volgen niet automatisch uit deze matrix.
