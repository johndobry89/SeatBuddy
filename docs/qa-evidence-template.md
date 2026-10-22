# Veilig terugmelden

Gebruik uitsluitend het **ene kopieerbare rapport op de [Mac-kaart](macos-test-guide.md)**. Het vraagt volledige buildcommit, run, inner ZIP-hash, OS/Chrome en M1–M7 met korte geschoonde waarneming. Alle menselijke regels beginnen NOT_RUN; vul uitsluitend werkelijk uitgevoerde stappen in. De optionele ZERO EXTRA-proef hoort bij M7, niet bij een extra formulier.

- **PASS:** deze concrete stap daadwerkelijk uitgevoerd en geslaagd.
- **FAIL:** waargenomen afwijking; vermeld stap en verwacht → feitelijk, met fictieve reproductie.
- **BLOCKED:** concrete uitvoeringsblokkade, bijvoorbeeld organisatiebeleid. Niet omzeilen.
- **NOT_RUN:** niet uitgevoerd. **INCONCLUSIVE:** onvoldoende bewijs voor een oordeel.

Geen echte naam, e-mail, wachtwoord, pasnummer, ticket/QR, betaaldata, persoonlijke tabtitel/URL, profielmap of ruwe browserlog. Geen screenshot nodig. De tijdelijke technische preview is optioneel: lees hem eerst; er is geen automatische bijlage/upload. **Meld een probleem** opent alleen een leeg GitHub-issue.

Een build is geen menselijke installatieproef. Een gewone assistenttab is geen native Side Panel-PASS. FICTIONAL_TEST is geen native Chrome-/Vue-bevestiging. De oude beperkte Mac-opening blijft USER_REPORTED_PARTIAL_SMOKE, geen huidige acceptatie. Mac/Windows/arm64/VoiceOver en niet uitgevoerde herstarts blijven NOT_RUN. Publieke G0-observatie heeft een [afzonderlijke begrensde gids](g0-human-observation-guide.md) en is geen onderdeel van de eerste fictieve proef.

Na FAIL volgt fictieve reproductie → gericht regressie-issue → kleine reparatie → getroffen tests en volledige CI → dezelfde menselijke stap herhalen. Geen issue of PASS namens de eigenaar zonder diens feitelijke waarneming.
