# Optionele officiële Chrome-agenttools

Gecontroleerd op **21 oktober 2026** tegen de officiële [Modern Web Guidance-bron](https://github.com/GoogleChrome/modern-web-guidance-src), [Chrome Extensions skill](https://github.com/GoogleChrome/modern-web-guidance/tree/main/skills/chrome-extensions), [DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp), [CLI-configuratie](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/configuration.md) en [toolreferentie](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/tool-reference.md). De gerenderde [Chrome AI-gids](https://developer.chrome.com/docs/extensions/ai/build-with-ai) werd hier door proxy CONNECT 403 geblokkeerd; de opgegeven metadata van 19 mei is niet zelfstandig herbevestigd. Dit zijn ontwikkeltools, geen extensiepermissies of toestemming voor een echte website.

## Skills: bewuste installatie door de ontwikkelaar

De officiële CLI biedt de interactieve keuze:

```sh
DISABLE_TELEMETRY=1 npx modern-web-guidance@latest install --choose
```

Kies desgewenst **modern-web-guidance**, **chrome-extensions**, Codex en de passende lokale installatiescope. De upstream README en CLI-bron bevestigen `--choose`; onderzocht npm-pakket: **0.0.195**. De wizard is hier **niet uitgevoerd**. Cloud-Codex ondersteunt mogelijk geen interactieve prompts, plugininstallatie of dynamische skillregistratie. Een geïnstalleerd bestand bewijst bovendien niet dat de actieve sessie de skill heeft geladen. Controleer na installatie de skilllijst van je eigen client. Wij hebben geen globale Codex-/MCP-instellingen aangepast of installatie op jouw Mac gedaan.

De huidige upstream README noemt voor geschikte Codex-clients ook `codex plugin marketplace add GoogleChrome/modern-web-guidance` en `codex plugin add modern-web-guidance@googlechrome`. Deze wijzigen clientinstellingen; voer ze alleen zelf uit als jouw client dit ondersteunt en je die installatie wilt. De wizard blijft de gedocumenteerde route voor het kiezen van beide skillpacks. Zet bij gebruik `DISABLE_TELEMETRY=1` in de betreffende opdrachtomgeving; wijzig niet automatisch iemands shellprofiel.

## MCP: uitsluitend een wegwerpbrowser

MCP kan alle inhoud van zijn browserinstantie inspecteren en wijzigen. Gebruik nooit een persoonlijk Chrome-profiel, `--autoConnect`, een bestaande persoonlijke `--browserUrl`/`--wsEndpoint` of remote debugging op een ingelogde gebruikersbrowser. Gebruik geen echte accounts. Laat installatie/configuratie van een ondersteunde MCP-client door de eigenaar doen; onderstaand is een **voorbeeld**, geen automatisch gewijzigde hostconfiguratie.

Getest serverpakket: **chrome-devtools-mcp 1.11.0**. Onderstaande vlaggen zijn zowel in upstream documentatie als met de werkelijke `--help` gecontroleerd. `--categoryExtensions` is opt-in. `--isolated` maakt een tijdelijk user-data-profiel dat bij afsluiten wordt opgeruimd. Gebruik geen `--userDataDir` naar een bestaand profiel. Officieel ondersteunt de server Chrome en Chrome for Testing; ander Chromium werkt mogelijk maar heeft geen upstream garantie.

```json
{
  "mcpServers": {
    "seatmates-isolated-chrome": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@1.11.0",
        "--isolated",
        "--categoryExtensions",
        "--no-usage-statistics",
        "--no-performance-crux"
      ],
      "env": {
        "CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS": "1",
        "CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS": "1"
      }
    }
  }
}
```

De exacte clientconfiguratie kan afwijken (Codex gebruikt afhankelijk van versie bijvoorbeeld TOML). Kopieer geen geheime headers of persoonlijke padinstellingen naar Git. Gebruik een eigen actueel gecontroleerde versie als upstream verandert. Default usage statistics en eventuele CrUX-URL-uitwisseling staan hiermee uit; Chrome's eigen metrics zijn een aparte instelling. Gebruik voor dit project geen performance-/netwerkcaptures van echte websites.

Voor filesystemtools moet de client passende MCP roots aanbieden of kan server 1.11.0 een smalle `--workspace=/absoluut/pad/SeatBuddy/dist` krijgen. Dit is een bestandsgrens, geen toestemming om willekeurige sites te bedienen. Installeer de extensie niet buiten de testbrowser. Wijzig geen managed policies wanneer installatie wordt geweigerd.

## Reproduceerbare fictieve ontwikkelproef

1. `npm ci`, `npm run check`, `npm run package`. Gebruik alleen de gegenereerde `dist/`.
2. Start de geïsoleerde MCP-server in een client die dit ondersteunt. In cloud zonder display kan `--headless`; lokaal Mac heeft een zichtbare wegwerpbrowser de voorkeur voor paneelbediening.
3. Gebruik `install_extension({"path":"/absoluut/pad/SeatBuddy/dist"})`. Noteer alleen de testextensie-ID/versie. Bij beheerdersweigering: **BLOCKED**, niet herhaald proberen of beleid omzeilen.
4. Alleen na succesvolle installatie: `reload_extension({"id":"<uitsluitend-eigen-testextensie-id>"})` en `trigger_extension_action({"id":"<zelfde-id>"})`. Controleer het echte Side Panel, onafhankelijke fictieve A/B-stappen en UNKNOWN na reload. Een gewone `sidepanel.html`-tab is geen bewijs dat het paneel als browserpaneel opent.
5. Inspecteer uitsluitend de eigen testworker en fictieve panelen. De precieze beschikbare tools/doeltypen komen uit `tools/list`; MV3-workerinspectie is geen gegarandeerde MCP-functie. Gebruik de bestaande Playwright-suspensietest als het toolaanbod dit niet ondersteunt. Geen `evaluate_script` op echte websites, netwerk-/cookiedumps of persoonlijke tabs.
6. Sluit de MCP-server/browsertest. Bewaar alleen een klein geschoond bewijsrecord, geen user-data-map, cookiefile, globale clientconfig of ongeschoonde capture.

De autonome Playwright-route blijft beschikbaar: `npm run test:ui` en `HEADED=1 xvfb-run -a npm run test:e2e` op Linux; lokaal Mac zonder Xvfb `HEADED=1 npm run test:e2e`. Elk testprofiel wordt nieuw aangemaakt en opgeruimd. Incognitotoestemming wordt alleen via zichtbare Chrome-instellingen gegeven; echte Vue-pagina's komen niet voor in deze proeven.

## Wat in deze sprint werkelijk is gebruikt

De officiële MCP-server 1.11.0 is tijdelijk via `npm exec --yes --cache /tmp/seatbuddy-npm --package chrome-devtools-mcp@1.11.0 -- chrome-devtools-mcp --help` gecontroleerd. Een tijdelijk lokaal stdio-JSON-RPC-testclient heeft `initialize` en `tools/list` aangeroepen. De extensiontools werden echt aangeboden. Daarna is `install_extension({"path":"/workspace/SeatBuddy/dist"})` werkelijk aangeroepen met `--isolated --headless --executablePath=/usr/bin/chromium --chromeArg=--no-sandbox --categoryExtensions --no-usage-statistics --no-performance-crux --workspace=/workspace/SeatBuddy/dist`. Het profiel was nieuw, leeg en bevatte geen gebruikersaccounts. `--no-sandbox` is alleen nodig voor deze ingeperkte Linux-runner; het is geen aanbevolen Mac-instelling.

Chrome antwoordde: **“Protocol error (Extensions.loadUnpacked): Loading of unpacked extensions is disabled by the administrator.”** MCP-installatie dus **BLOCKED**, reload/echte Side Panel-/workerinspectie via MCP **NOT_RUN**. Managed policy is niet gewijzigd. De tijdelijke server/client zijn geen permanent geregistreerde hosttool. Aanvullende fictieve rendererinspectie en CI-resultaten staan met hun werkelijke grenzen in [feasibility](feasibility.md).

In een tweede vers wegwerpprofiel zijn ook echte MCP-aanroepen gedaan: `new_page({"url":"http://127.0.0.1:8767/sidepanel.html"})`, `take_snapshot({"pageId":2})` en `take_screenshot({"pageId":2,"filePath":"/tmp/seatbuddy-mcp-panel.png","fullPage":true})`. De gebouwde lokale preview toonde correct de bruikbare lokale fallback en UNKNOWN-bronnen; de fictieve screenshot is bekeken. Dit is **PASS voor rendererinspectie**, geen geïnstalleerde extensie, Side Panel-plaatsing, worker- of incognitobewijs. De publieke Vue-link is niet gevolgd. Een eerdere snapshot van de lege starttab is geen UI-bewijs; de genoemde pageId is uit de daadwerkelijk aangeboden lijst gekozen.
