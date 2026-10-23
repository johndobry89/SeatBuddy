# FIX 04 — gewone stoelafstand

Issue #39; basis `0712ce0b943177a64062a9d62eaa76ea77e533f9`,
branch `feat/issue-39-seat-spacing-fix`, **0.11.6-experimental**.

**OWNER_LIVE_0.11.5:** eigenaar meldt werkende LUX_4/EXACT_VISIBLE_ICON,
104 beschikbaar / 42 niet beschikbaar / één geselecteerd; 11 Ultra Lux herkend,
twee onbekende beschikbare categorieën, geen paren. Dat bewijst niet de live
geometrie of Movie Pass-bijbetaling.

**LOCAL_STATIC_RENDER, volgens issue #39:** drie afzonderlijke historische
snapshots lokaal in Chromium zonder scripts/externe verzoeken gerenderd.
16/16, 19/19 en 306/306 voorlopig geschikte buurrelaties vielen uitsluitend af
op de horizontale grens: 22px breed, 6px ruimte = 27,27%, boven 25%.
Geen oorspronkelijke HTML/URL/assets ontvangen of geüpload; checkout blijft live
geblokkeerd. De actuele live kaart is niet geometrisch onderzocht.

**Reparatie:** alleen `right.left - left.right > width * 0.25` wordt `* 0.3`.
Alle rij-/DOM-/kolom-/nummer-/categorie-/Ultra Lux-/onbekend-/overlap- en overige
geometriecontroles blijven gelijk. Geen nieuwe UI, diagnostiek of bevoegdheden.

**SYNTHETIC_FIXTURE:** één positieve 22px/6px-regressie werkelijk FAIL vóór en
PASS na de fix; negatieve 22px/8px-case en alle bestaande afwijzingen behouden.
De bestaande native ZIP-proef gebruikt ook 22px/6px, zonder extra testscherm.
`npm run check`: 355 unit PASS, format/lint/types/icons/build PASS.
Definitieve UI/native CI, volledige oplever-SHA en run staan in het opleverrapport
bij deze branch. Normale ZIP byte-identiek, Chrome-rechten onveranderd; beide
packages onafhankelijk op CRC/SHA en alle bytes tegen dist gecontroleerd.
Experimentele inner SHA256: `6514244749b0035655c52471300dae65bf962dfe2769b6508485925c79e148e1`.

**OWNER_LIVE_0.11.6_NOT_RUN; G0 INCONCLUSIVE.** Installeer na checksumcontrole de
uitgepakte experiment-map, lees bewust een veilige eerste stoelpagina en vergelijk
actuele tellingen, categorieën en mogelijke paren visueel op Vue. Geen gangpad,
Ultra Lux of onbekende categorie toegestaan; fout paar betekent STOP. Deel alleen
Kopieer rapport. Bijbetaling per account blijft onbekend; geen stoelactie,
checkout-/betaalproef, merge of publicatie.
