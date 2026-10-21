# Sprint 05 — handmatige Chrome-proef op Mac en Windows

Gebruik alleen fictieve film-/stoelgegevens en neutrale tabs. Geen echte accounts, live checkoutacties of aankoop. Noteer per stap datum/tijd/tijdzone, OS, Chrome-versie, commit, extensieversie en de werkelijk geziene uitkomst. Installatie: [Mac-testgids](macos-test-guide.md) of [Windows-testgids](windows-test-guide.md). Bewijs vastleggen: [QA-formulier](qa-evidence-template.md).

| Proef                                                  | Verwacht gedrag                                                                                                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extensie laden en werkbalkicoon klikken                | Echte popup opent; expliciete paneelknop opent Side Panel, simulatie is apart                                                                                     |
| Plan zonder zaal                                       | Geldige voorlopige planning; voorstellingmatch blijft UNKNOWN                                                                                                     |
| Ongeldige datum, lege film/locatie/tijd                | Geen geldig opgeslagen plan of sterke match                                                                                                                       |
| A/B eigen invoer bewaren                               | Alleen expliciete eigen film-/stoelgegevens; geen accountgegevens                                                                                                 |
| Alleen A door vijf stappen                             | A zelf gemeld afgerond, B onvoltooid; partiële melding, geen websitebevestiging                                                                                   |
| Andere tijd/zaal in B                                  | Geen doorgang langs voorstellingcontrole; foutpad vraagt eigen vergelijking                                                                                       |
| Opeenvolgende stoelnummers                             | Alleen ongeverifieerde nummervergelijking, geen echte buur-/beschikbaarheidsclaim                                                                                 |
| Uitloggen/mismatch/onzekere uitkomst melden            | Alleen die persoon moet opnieuw controleren; geen retry/rollback                                                                                                  |
| Wijzigen eigen details / opnieuw plannen               | Eigen controles / beide controles vervallen zoals vooraf aangegeven                                                                                               |
| Plan tijdens polling bewerken                          | Onopgeslagen invoer blijft staan; focus en cursor blijven bruikbaar                                                                                               |
| Tab/Shift+Tab/Enter op 320px                           | Labels, knoppen, uitklappen en focus bruikbaar; geen horizontale overflow                                                                                         |
| Expliciete normale context A                           | Alleen browsermetadata gekoppeld, geen account of sitewaarneming                                                                                                  |
| B zonder incognitotoegang of normaal venster           | Koppeling geweigerd; bruikbare handmatige route blijft beschikbaar                                                                                                |
| Expliciete incognito-opt-in, neutrale tab B            | Alleen als Chrome het toestaat: aparte tab-/venster-/incognitometadata zichtbaar in normaal paneel                                                                |
| Navigatie/sluiten/vervangen/verplaatsen gekoppelde tab | Koppeling en eerdere eigen controles van die persoon vervallen                                                                                                    |
| Incognitotoegang intrekken                             | B-koppeling/progressie vervalt; een workerreload mag alle tijdelijke gegevens wissen                                                                              |
| 15 minuten zonder nieuwe eigen controle                | Eigen voortgang vervalt; plan en stoelwensen blijven ongeverifieerde invoer                                                                                       |
| Worker stoppen / browser herstarten                    | Geen herstel van voortgang, geen acties opnieuw uitvoeren, opnieuw plannen                                                                                        |
| Geen Chrome-runtime                                    | Lokale handmatige assistent werkt zonder browserkoppeling; herladen wist alles                                                                                    |
| Fictieve simulatie / pakketpagina                      | SIMULATION, nooit echte bevestiging; echte metadata voor reguliere fixture A; B als verpakte incognitopagina is NO-GO in spanning                                 |
| Rechten/netwerk/opslag inspecteren                     | Alleen sidePanel + storage, geen hostrechten/externe requests; uitsluitend opt-in nickname/ID en afzonderlijk opgeslagen filmplan-concept, nooit incognito/bewijs |

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

## Buddy-popup en fictieve widget (behouden uit 0.4.0)

| Proef                                    | Verwacht gedrag                                                                                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toolbaricoon                             | Echte SeatBuddies-popup met logo en buddykeuze, geen stilzwijgend paneel                                                                                                        |
| Popupknop                                | Native Side Panel na een expliciete klik; nuttige fout bij ontbrekende/geblokkeerde API                                                                                         |
| Lijst begint leeg / fictieve voorbeelden | Geen impliciete profielaanmaak; Sanne/Mark alleen expliciet DEMO                                                                                                                |
| Add/rename/remove/select                 | Gevalideerde korte bijnamen, maximaal twaalf, één geselecteerd ID, geen accountbewijs                                                                                           |
| Dubbel/ongeldig nicknameveld             | Duidelijke fout, geen ongeldige invoer/accountvelden naar coördinator                                                                                                           |
| Popup naar paneel                        | Zelfde tijdelijke selectie, zichtbaar Ik + buddy; popup ziet geen A/B- of incognitometadata                                                                                     |
| Buddy wijzigen/rename/remove met B-werk  | Eerst bevestigen; annuleren behoudt alles; bevestigen wist alleen B (ook conceptvelden/contextkeuze)                                                                            |
| A-invoer tijdens buddywissel             | Eigen A-checks en onopgeslagen A-velden blijven staan                                                                                                                           |
| Verouderde popupmutatie                  | Generatie/revisie/resetbarrière weigert, geen automatische mutation retry                                                                                                       |
| Volledig wissen / workerrestart          | Volledig wissen verwijdert opslag; workerrestart vergeet selectie/plan/voortgang en tijdelijke namen. Opt-in namen/geldig expliciet concept kunnen blijven; nooit bewijsherstel |
| Geen buddy / offline                     | Volledige handmatige assistent blijft bruikbaar; offline geen fictief gedeeld buddybeheer                                                                                       |
| Fictieve widgetstap/herplaatsen          | Eén Vue-kaart, demo-labels, beperkte naamweergave; unmount stopt polling, geen productie-injectie                                                                               |
| Iconen/pakket                            | Originele SVG en reproduceerbare PNG’s, action/default_popup correct, runtime-only ZIP/checksum                                                                                 |

Menselijke Mac-QA volgt na de bouw. Native Chrome-tests en renderer-transportdoubles blijven afzonderlijke bewijssoorten; de bestaande baselineproeven blijven ingeschakeld. Zie het haalbaarheidsregister voor feitelijke resultaten.

## Sprint 05 — nickname-retentie en Movie Night HQ

Gebruik uitsluitend fictieve data, na de bouw. Bewijs workerstop, extensiereload en browserherstart apart; zie Mac-/Windows-gids en ADR-006.

| Proef                                                         | Verwacht                                                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Default / expliciete opt-in                                   | Geen records vóór toestemming; daarna alleen gevalideerde nickname/opaque ID, max. 12                                    |
| Workerstop                                                    | Alleen opt-in namen en geldig expliciet concept kunnen blijven; selectie/plan/stoelen/controles/bindings leeg            |
| Disable / vergeten / individuele / clear-all                  | Opgeslagen records bijgewerkt/verwijderd, wisfouten zichtbaar; geen schijnsucces                                         |
| Onbekend/incognito document                                   | Geen gedeelde/onthouden read/write/reset; normale lokale handmatige fallback                                             |
| Draft bewaren/herstellen                                      | Alleen vijf filmvelden, max. 4 uur; herstel slechts ongecommitteerd formulier, geen status/PLAN                          |
| Toekomstig/verlopen/corrupt/extra velden                      | Weigeren en verwijderen zonder bewijsherstel of gevoelige logging                                                        |
| Gelijktijdig hernoemen / oude generatie                       | Geserialiseerd; stale writes geweigerd, geen automatische retry; expliciete revocatie mag oude rosterrevisie overstemmen |
| Polling/popup/openen                                          | Onopgeslagen velden blijven; bevestigde buddywissel wist B, A blijft                                                     |
| HQ next step / mismatch / stale / logout / partiële meldingen | Eén veilige vervolgstap, behoud vijf onafhankelijke checks, nooit websitebevestiging                                     |
| Stoelen / keyboard / 320px                                    | CONSECUTIVE_UNVERIFIED zonder echte kaart/hold; semantische labels/focus, geen horizontale overflow                      |
| Browserherstart/reload                                        | Session-concept weg, alleen opt-in local-lijst blijft; menselijke OS-proef apart                                         |

## Sprint 06 — Projector Ready (alleen fictieve invoer)

| Proef                                                    | Verwachting                                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Leeg plan / nickname selecteren                          | SOLO, B niet actief; nickname activeert niets                                                                             |
| Samen expliciet kiezen                                   | A/B zelfstandig; nieuwe andere voorstelling begint weer solo                                                              |
| Eigen invoer, missing hall/seat/mismatch                 | Review weigert onbekend/afwijkend; geen geordende stappen overslaan                                                       |
| Review + opgeslagen B-edit                               | Review vervalt, A-checks blijven; nieuwe handeling pas na eigen review                                                    |
| Solo bij B-input/binding/checks of onopgeslagen velden   | Eerst bevestiging; annuleren behoudt B, bevestigen wist alleen lokale B, geen boeking geannuleerd                         |
| Twee panelen / oude generatie/revisie/epoch / dubbelklik | Eén geldige overgang; stale opdracht geweigerd, alleen view-refresh, geen replay                                          |
| A zelf gemeld DONE / B FAILED/mismatch/UNKNOWN           | A/B aparte bron/leeftijd, menselijke eerste-reservering/tweede-accounthulp                                                |
| Beide zelf gemeld                                        | Echte bevestiging op Vue niet geverifieerd; nooit CONFIRMED                                                               |
| Workerstop + concept-only restore                        | Geen samenmodus/review/A/B-proof; concept vult alleen formulier                                                           |
| Diagnosepending/succes/geweigerd                         | Exacte allowlistpreview, succes na resolve, bij denied selecteerbare handmatige fallback; geen privévelden/exceptiontekst |
| GitHub-link                                              | Exact vast issues/new-adres zonder tekstparameters of automatische verzending                                             |
| Toetsenbord/320px/reduced-motion/live                    | Focus per keuze/review/bevestiging/preview; geen overflow; geen nieuwe live-tekst bij stille polls                        |
| Gewijzigd fictief schema                                 | Oude fixturewaarneming gewist, UNKNOWN en handmatig verder                                                                |
| Gegenereerd pakket                                       | MV3 0.6.0, exact sidePanel/storage, CSP/runtime-audit, popup/iconen, ZIP+SHA256                                           |

De Mac-/Windowsgids bevat de menselijke uitvoering na de bouw. Native Linux-CI, renderer-doubles en menselijke VoiceOver/native Mac zijn verschillende bewijsniveaus. Geen echte Vue-test. Lokaal resetten/reviewen annuleert of bevestigt geen reservering.
