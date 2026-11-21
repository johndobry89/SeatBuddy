# FIX 07 — duidelijke STOP/NIET BESCHIKBAAR (0.11.10-experimental)

Basis: `8f007138b2361f2a1ebb37254ae9d5d2d2319a00`, de gestapelde
`feat/issue-43-rear-center-ranking`-branch. Dit is uitsluitend een
diagnostische wijziging aan de bestaande experimentele popup. Geen live
Vue-integratie, boekingsautomatisering of uitbreiding van Chrome-permissies.

## Reden

In oktober verscheen bij de eigenaar in een normaal `Ctrl+N`-venster
`NIET BESCHIKBAAR`; de rapportknop bleef uitgeschakeld. Een gekopieerd
duo-plan gaf generiek `UNKNOWN_STOP`. De toenmalige meldingen bundelden
incognito-instelling, ongeschikte tab, ingetrokken toegang, ongeldige/verlopen
planinhoud en onveilige/onduidelijke stoelkaart. De exacte oude oorzaak is
niet bewezen. Het gedeelde plan van 24 oktober 2026, 11:17:00 lokale tijd,
verviel door de bestaande vijfminutenregel om 11:22:00.

## Verandering

- De browserlaag levert alleen vaste foutcodes en openbare uitleg:
  `POPUP_CONTEXT`, `INCOGNITO_PERMISSION`, `TAB_UNAVAILABLE`, `TAB_CHANGED`,
  `READ_FAILED`. Onverwachte Chrome-fouten blijven verborgen; nooit ruwe
  URLs, privéschermen, errors, tokens of sessiegegevens tonen of opslaan.
- De incognito-instelling wordt expliciet als **toestemming** uitgelegd:
  ook een normaal venster wordt bewust geweigerd zolang die schakelaar aanstaat.
  Het bestaande beleid is niet versoepeld.
- B onderscheidt ongeldige tekst, verlopen plan, niet-beschikbare paginalezing,
  onvolledige voorstelling en niet-bewezen exact paar. De bestaande aparte
  `MISMATCH_SHOWING`- en `PAIR_UNAVAILABLE`-statussen blijven bestaan.
- De popup toont de oorzaak ook wanneer de browsercontext al vóór de leesklik
  ongeldig wordt. Rapport kopiëren blijft dan verboden.
- De normale versie blijft 0.11.0; alleen het experimentele
  manifest en rapportlabel krijgen versie 0.11.10.

## Ongewijzigde veiligheidsgrenzen

Vijf minuten TTL, canoniek duo-plan, twee onafhankelijke profielen, identiek
voorstellingsbewijs, exact B-paar (ook buiten top drie), iconen, Ultra Lux-
uitsluiting, 30%-afstand, DOM/kolom/gangpad/rijtoets, speciale één-stoelbuffer,
achterin/middenrangschikking, geen prijsclaim of account-/sitehandeling.
Geen extra opslag, netwerk, permissies, logging of ruwe browserexceptions.

## Verificatie en handmatige testkaart

1. Bouw in een schone lokale omgeving beide pakketten en vergelijk de normale
   ZIP byte voor byte met de bekende 0.11.0-basis.
2. Unit/format/lint/types/UI/native controleren met fictieve documenten.
   Regresseer expliciet incognitotoestemming AAN in een normaal venster,
   onvolledige/onjuiste actieve tab, tabwissel, browserfout, exact vijf minuten,
   ongeldig plan, onveilig paar, andere voorstelling en bezette stoel.
3. Pas na geslaagde synthetische native CI: eigenaar laadt de experimentmap
   in twee eigen normale Chrome-profielen, incognitotoegang uit. A leest de
   eerste zichtbare Vue-stoelkaart, kiest en kopieert een nieuw paar. B leest
   dezelfde voorstelling en controleert exact dat paar **binnen vijf minuten**.
   Elk STOP-resultaat wordt alleen met de nieuwe niet-gevoelige melding
   genoteerd; geen echte boeking of betaling nodig.

**OWNER_LIVE_0.11.10 NOT_RUN · LIVE_B_BOOKING NOT_RUN · G0 INCONCLUSIVE.**
