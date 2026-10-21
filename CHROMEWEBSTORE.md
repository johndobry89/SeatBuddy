# Chrome Web Store — SeatMates (voorbereiding)

Laatst bijgewerkt: **21 oktober 2026**. **DRAFT — niet ingediend, niet gepubliceerd, niet goedgekeurd.** Deze voorbereiding volgt de [officiële Chrome Extensions-richtlijn](https://github.com/GoogleChrome/modern-web-guidance/tree/main/skills/chrome-extensions) en het bijbehorende [CHROMEWEBSTORE-template](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/chrome-extensions/references/webstore/chromewebstore-template.md), gelezen op deze datum. Manifestbron: `public/manifest.json`, testversie **0.3.0**, MV3, minimum Chrome 116.

## Store listing — concept

**Naam:** SeatMates — handmatige A/B-assistent (test)

**Korte omschrijving:** Plan één filmavond met twee aparte stappenlijsten. Controleer zelf voorstelling en stoelen; SeatMates boekt niets.

**Uitgebreide omschrijving:** Plan samen een filmbezoek en houd de eigen controles voor twee personen apart bij. Vul zelf film, bioscoop, datum, tijd, zaal en gewenste stoelen in. Doorloop daarna per persoon de eigen stappen. Een zelfmelding is geen websitebevestiging en opeenvolgende stoelnummers bewijzen geen aangrenzende plaatsen of beschikbaarheid.

Desgewenst koppel je bewust een normale en een toegestane incognitotab om je vensters te onderscheiden. Dit stelt geen accountidentiteit vast en leest geen website. Een optionele, duidelijk gemarkeerde simulatie gebruikt uitsluitend fictieve gegevens. Bij ontbrekende browsermogelijkheden blijft lokaal handmatig plannen mogelijk. Tijdelijke voortgang kan vervallen; er wordt niets automatisch herhaald.

SeatMates verstuurt geen planningsgegevens, heeft geen eigen server en gebruikt geen tracking. Het leest geen accounts, wachtwoorden, cookies, betaalgegevens of tickets. Gegevens bestaan alleen tijdelijk; wissen, een herstart of verwijderen kan ze doen verdwijnen. Meer uitleg en problemen melden: https://github.com/johndobry89/SeatBuddy/issues — uitsluitend met fictieve gegevens.

Onafhankelijke testassistent, niet verbonden aan of goedgekeurd door Vue Cinemas. Iedere reservering blijft afzonderlijk en wordt alleen door de gebruiker op de officiële website afgerond. Deze build heeft geen echte Vue-integratie, leest geen seatmap en doet geen betaling of boeking. Geen garantie op beschikbaarheid, naast elkaar zitten of gelijktijdige reserveringen.

**Categorie (concept):** Productivity. **Taal:** Nederlands.

**Single purpose:** Twee personen helpen zelf één filmvoorstelling en hun afzonderlijke controles en stoelwensen bij te houden.

## Graphics en assets

| Asset                             | Vereiste bij eventuele indiening | Huidige status                                      |
| --------------------------------- | -------------------------------- | --------------------------------------------------- |
| Store-icoon                       | 128×128 PNG                      | Niet gemaakt; geen officiële Vue-branding gebruiken |
| Store-screenshot                  | 1280×800 of 640×400              | Niet gemaakt; alleen fictieve gegevens              |
| Extra afbeeldingen/promotietegels | Afzonderlijk kiezen/controleren  | Niet gemaakt                                        |

Lokale test-screenshots zijn geen voorbereide Store-assets en worden niet in het runtimepakket opgenomen. Naam-/merkrechten zijn nog niet onderzocht.

## Verantwoording van werkelijk gevraagde rechten

| Manifestonderdeel                                        | Reden en grens                                                                                                                                                              |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `permissions: ["sidePanel"]`                             | Toon de twee eigen stappenlijsten naast de browserpagina na een bewuste gebruikersactie                                                                                     |
| `incognito: "spanning"`                                  | Eén tijdelijke coördinator; optionele minimale contextkoppeling van normale/incognitovensters na expliciete Chrome-opt-in. Geen toestemming op zichzelf, geen accountbewijs |
| `host_permissions`, optionele rechten, `content_scripts` | Afwezig; G0 voor productieobservatie is niet gehaald                                                                                                                        |

Geen `tabs`, `storage`, `cookies`, `debugger`, `scripting`, `<all_urls>`, private API of remote runtimecode. De ondersteunde tab-/venster-API’s kunnen zonder gevoelige tabrechten minimale nummers/contextsoort geven; alleen een expliciete lijst-/koppelactie vraagt die op. Gewone statuspolling scant geen tabs. Alleen tab-/vensternummer en incognitovlag gaan naar de paneelkeuze; titels en URL’s worden niet gebruikt/doorgegeven. De vaste publieke Vue-link opent alleen na een menselijke klik in de browser en verleent geen hosttoegang.

## Privacy & data use

Er is **lokale tijdelijke verwerking van gebruikersinvoer en contextmetadata**, geen verzameling door een ontwikkelaar/server, verkoop, analyse of verzending naar derden. Een uiteindelijke Store-disclosure moet deze feitelijke lokale verwerking correct aangeven; dit bestand is geen al ingediend formulier.

| Gegeven                                                                                                           | Lokale verwerking                                                                                                  | Off-device verzending / delen |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| Film/bioscoop/datum/tijd/zaal, gewenste rij/stoel                                                                 | Alleen handmatige invoer in geheugen, ongeverifieerd                                                               | Nee                           |
| Eigen A/B-stappen, problemen, controletijd                                                                        | Tijdelijk in geheugen; eigen meldingen vervallen na 15 minuten                                                     | Nee                           |
| Expliciet gekozen tab-/vensternummers, incognitovlag                                                              | Tijdelijke contextboekhouding, geen browsergeschiedenis                                                            | Nee                           |
| Niet-gevoelige diagnostiek                                                                                        | Alleen na gebruikersactie zichtbaar; versie, capabilities, scope, modus en bewijssoort; geen film/IDs/titels/URL’s | Nee                           |
| PII, gezondheid, financiën, auth, persoonlijke communicatie, geografische locatie, webgeschiedenis, websiteinhoud | Niet gevraagd/gelezen door de extensie. Een bioscoopveld is een eigen plan, geen locatievolging                    | Nee                           |

Geen persistente browseropslag, cookies, backend, clipboardlezing, analytics of netwerkcaptures. De content-security-policy verbiedt runtimeconnecties en externe scripts. De worker, panelen en fixtureberichten valideren strikt en begrensd; de fixture krijgt geen gegevens van de andere persoon. De ontwikkeltools van Chrome/MCP zijn apart optioneel en horen niet bij de extensie; hun privacygrenzen staan in `docs/agent-browser-debugging.md`.

- [x] Gegevens worden niet verkocht.
- [x] Gegevens worden uitsluitend voor de hierboven beschreven handmatige functie verwerkt.
- [x] Gegevens worden niet gebruikt voor kredietwaardigheid of leningen.

**Wissen/verwijderen:** “Wis alle tijdelijke gegevens” reset de coördinator. Opnieuw verbinden wist na expliciete gebruikersactie ook de lokale concepten en gedeelde coördinatorgegevens. Een worker-/browserherstart vergeet tijdelijke gegevens; een nog open paneel kan eigen onopgeslagen velden hebben. Sluit/herlaad dat paneel om ook die te verwijderen. Verwijderen: `chrome://extensions` → SeatMates → Verwijderen; verwijder daarna de eigen uitgepakte map.

## Privacy policy

**Publieke privacybeleid-URL:** nog niet ingericht of gepubliceerd. De lokale beschrijving hierboven moet vóór eventuele indiening naar een actuele, publiek bereikbare policy worden vertaald en gecontroleerd. Publiceren van die policy of de extensie is geen onderdeel van deze opdracht.

## Distributie en ontwikkelaarsinformatie

Huidige distributie: broncode en een unpacked **testbuild** via Actions. Storezichtbaarheid en regio’s: nog niet besloten. Publishernaam/contactmail: nog door de eigenaar te kiezen, niet verzonnen. Support/homepage: https://github.com/johndobry89/SeatBuddy. Geen Store-accountgegevens in deze repository.

## Versiehistorie

| Versie     | Datum      | Wijziging                                                                             | Storestatus           |
| ---------- | ---------- | ------------------------------------------------------------------------------------- | --------------------- |
| 0.3.0-test | 2026-10-21 | Platformneutraal pakket, Mac-QA, herstel, expliciete bronlabels en lokale diagnostiek | Draft, niet ingediend |
| 0.2.0-test | 2026-10-20 | Handmatige A/B-assistent en contextkoppeling                                          | Niet ingediend        |

## Reviewstatus en beperkingen

Geen Storebeoordeling of afwijzing ontvangen. Publicatie blijft geblokkeerd op onder meer naam-/merkrechten, assets, publishergegevens, privacybeleid, actuele Store-policycontrole en expliciete publicatieautorisatie. Huidig bewijs betreft code, fictieve UI en per omgeving geregistreerde Chrome-tests; zie `docs/feasibility.md`. G0 voor Vue is niet gehaald. Geen echte boekingsbevestiging geïmplementeerd. De Mac-opening van 20 oktober is uitsluitend USER_REPORTED_PARTIAL_SMOKE. Een runtime-ZIP/checksum bewijst geen Storegeschiktheid of menselijke OS-QA.
