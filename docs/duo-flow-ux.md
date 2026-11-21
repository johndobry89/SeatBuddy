# 0.11.11-experimental — begrijpelijke duo-overdracht

Basis: 0.11.10-experimental, diagnostische fix (#47). De eigenaar heeft op
21 november 2026 in Vue Enschede bevestigd dat 0.11.10 de voorstelling en
stoelparen weer kon lezen. De kopieer-/ontvangstflow bleef onduidelijk; dit is
een **UX-fix**, geen uitbreiding van boekingsmogelijkheden.

## A: kiezen en delen

1. Lees handmatig de open, openbare Vue-stoelpagina.
2. Bij gevonden kandidaten staat **1. Kies jullie stoelen**. Geen automatische
   keuze: een radioselectie is verplicht.
3. **2. Kopieer stoelen voor je partner** is vanaf het begin zichtbaar maar pas
   klikbaar na de keuze. Na een geslaagde klembordactie volgt de aanwijzing om
   het **hele** bericht door te sturen. De compacte popup blijft binnen de
   bestaande 360×600-regressiegrens. Geen automatische verzending.

## B: ontvangen en controleren

1. De partner opent zelf de **exactzelfde** voorstelling in een eigen normaal
   Chrome-profiel.
2. De partner opent **3. Stoelen van partner ontvangen**, plakt het volledige
   bericht en kiest **Controleer deze stoelen**.
3. De bestaande strikte parser, vijfminutengrens en exacte stoelcontrole
   bepalen de uitslag. Een mogelijke match is geen reservering of garantie.

Het diagnostische **Kopieer rapport** staat onder het inklapbare **Technisch
rapport (voor foutopsporing)**; de knop blijft beschikbaar op verzoek, met
dezelfde voorwaarden en afwijzing bij onvoldoende bewijs.

## Ongewijzigde veiligheidsgrenzen

- Tekstprotocol `SeatBuddies duo-plan v1` ongewijzigd; geen migratie of opslag.
- Twee onafhankelijke personen/profielen, vijf minuten vanaf de eerste lezing,
  dezelfde vijf voorstellingsvelden, gekozen exact paar ook buiten B's top drie.
- Ultra Lux, speciale/unknown-stoelbuffer, icon-/gangpad-/geometriecontroles,
  rangschikking en alle STOP/NIET BESCHIKBAAR-gevallen ongewijzigd.
- Geen nieuwe Chrome-permissies, netwerkverkeer, seat-click, hold, accountactie,
  checkout of prijs-/bijbetalingsclaim.
- Normale 0.11.0-packagecode en manifest ongewijzigd.

## Acceptatie

Synthetische browserproef: de deelknop is vóór selectie zichtbaar én disabled,
wordt na een bewuste keuze enabled, kopieert nog steeds het canonieke plan en
meldt het vervolg; B kan het plan in een onafhankelijk profiel ontvangen en
controleren, inclusief alle STOP-cases. Diagnostisch rapport blijft bereikbaar
via uitklappen; een klembordfout geeft geen vals succes. Normale tests en
verpakte ZIP-integriteit blijven verplicht.

**0.11.11 live A→B, tijdwinst en echte boekingen: NOT_RUN. G0: INCONCLUSIVE.**
