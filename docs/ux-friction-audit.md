# First-Run Forge — UX-frictieaudit

Uitgevoerd op 21 oktober 2026, uitsluitend met fictieve gegevens. Dit is een gemeten lokale rendererroute, geen onderzoek op Vue en geen claim over boekingstijd. Baseline: Sprint 06, commit `40fee3dea7ce3ef5db79e667f93af3903dca8d9c`, gebouwde 0.6.0. Vergelijking: gebouwde Sprint 07, 0.7.0. De twee `friction audit`-tests in `tests/integration/ui.spec.ts` voeren dezelfde taak uit en bewaken het nieuwe klikbudget.

## Afbakening en uitkomst

Startpunt is een reeds geopend, leeg paneel. Eindpunt is vijf geordende eigen stappen voor iedere actieve persoon. Inbegrepen: expliciet samen kiezen waar nodig, focusklikken op alle vijf filmvelden en twee stoelvelden per persoon, bewaren, review en iedere eigen stap. Datum/tijd worden via Playwright ingevuld. Toolbar openen en popup → Side Panel zijn buiten deze telling; de echte browserroute heeft afzonderlijke native tests. Optionele bijnamen, opslag en technische demo zijn in beide routes buiten de taak gehouden.

| Route    | Sprint 06 pointerklikken | Sprint 07 pointerklikken | Film-/stoelveldgroepen | Trusted input-events |
| -------- | -----------------------: | -----------------------: | ---------------------: | -------------------: |
| SOLO     |                       15 |                       14 |                      7 |                5 → 5 |
| TOGETHER |                       24 |                       22 |                      9 |                7 → 7 |

De test telt daadwerkelijk ontvangen vertrouwde DOM-clicks/input-events. Input-events zijn **geen fysieke toetsaanslagen**: de twee datum-/tijdvelden leveren bij deze Playwright-invoer geen trusted input-event. Het aantal benodigde veldgroepen blijft gelijk. Baseline beide tests PASS; na implementatie beide tests PASS. Geen verzonnen vergelijking met live Vue, tijdsbesparing of minder noodzakelijke veiligheidscontroles.

## Weggenomen frictie

Voorheen moest een nieuw plan worden bewaard, daarna iedere eigen invoerkaart afzonderlijk, daarna de review. Gewenste A/B-stoelen kunnen nu meteen in hetzelfde planformulier; één PLAN-command bewaart ze atomair als eigen invoer. Hierdoor vervalt één aparte bewaaractie solo en twee samen. Dezelfde SeatFields-component blijft beschikbaar voor latere afzonderlijke wijzigingen, afwijkende voorstelling en herstel. Geen tweede datamodel of wizard.

De hoofdroute blijft **Plan → Controleer → Eigen stappen**. B begint niet actief en een bijnaam activeert B niet. De technische simulatie staat onder bestaande diagnostiek, de optionele 90-secondenproef en buddyhulp onder de hoofdroute. De compacte startuitleg in popup/paneel verwijst alleen naar de eigen fictieve proefpagina.

## Invoer en veiligheid

- Gewone polls, popupgebruik en wisselen naar de technische weergave mogen onopgeslagen invoer niet verwijderen. De handmatige componenten blijven gemount.
- Een workervervanging herstelt geen toestand. Uitsluitend reeds getypte, onopgeslagen film-/A-velden in het nog geopende document blijven zichtbaar als concept; geen actief plan, controles, review of samenmodus wordt teruggestuurd. Bewaren en opnieuw controleren blijven nodig.
- B-invoer hoort bij de bestaande B-epoch. Buddywissel, reset en workervervanging wissen B, inclusief de nieuwe onopgeslagen initiële stoelvelden. A blijft zelfstandig. Expliciet volledig wissen/herverbinden wist ook de lokale conceptvelden.
- Alle vijf eigen controles per actief traject, de WORKFLOW-generatie/revisie/epoch, reviewverval en bronlabels blijven behouden. Er komt geen nieuwe opslag of browserpermissie bij.

## Nog niet onderzocht

Menselijke Mac-ergonomie, VoiceOver, daadwerkelijke invoersnelheid en live Vue zijn niet getest. Renderermetingen bewijzen geen toolbarbediening. De korte [Mac-proef](macos-test-guide.md) staat klaar voor later; menselijke uitslagen blijven NOT_RUN. Het [securityreviewverslag](security-review-sprint07.md) beschrijft concrete gevonden en gerepareerde randgevallen.
