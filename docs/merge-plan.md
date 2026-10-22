# Integratieplan — uitsluitend voorbereiding, niets op GitHub mergen

**22 oktober 2026.** Beide onderstaande paden zijn beoordeeld op de werkelijke DAG en lokaal gerepeteerd. Ze zijn **geen opdracht om nu te mergen**. `main` blijft `c0c5c1b0f683b003288ca33eed8ad5d9b9e08825`; de zeven ouderbranches/PR-bases zijn niet gewijzigd. Exacte heads en latest CI staan in [integration-readiness](integration-readiness.md).

## Harde gates vóór een toekomstige merge

1. Eigenaar bekijkt de handmatige/fictieve testversie en de reviewbevindingen. Menselijke Mac-kaart blijft nu NOT_RUN; G0/release hebben eigen aanvullende gates.
2. Refetch main, alle PR-heads en auditbranch. Vergelijk volledige SHAs met de gerepeteerde snapshots. Iedere afwijking betekent opnieuw vergelijken, repeteren en testen.
3. Controleer vereiste checks/protection, toegestane mergemethoden, reviewers en eventuele automatische branchverwijdering in GitHub. API was hier Forbidden; admininstellingen zijn **NOT VERIFIED** en niet gewijzigd.
4. Alle required jobs voor de bedoelde toekomstige main-target-commit/merge-ref moeten zijn afgerond. Queued/cancelled/failing is geen PASS. Een oude branch-run vervangt geen nieuwe main-target-run.
5. Exact rootmanifest/versie/rechten/CSP/PNG/notices/ZIP/checksum en ongewijzigde G0-grens controleren. Geen nieuwe host-, cookie-, scripting- of andere permissie.
6. Expliciete eigenaarautorisatie voor de concrete merge verkrijgen. Nu is die **NOT_GRANTED**. Publiceren/deployen/taggen is een afzonderlijke latere beslissing, ook na een merge.

## Pad A — sequentiële stack, behoud echte mergecommits

Volgorde: **#4 → #6 → #9 → #11 → #14 → #16 → #18 → Sprint 08-audit**. Aanbevolen GitHub-methode voor dit pad: **Create a merge commit**, zonder squash/rebase. Hiermee blijven de bestaande headcommits echte ancestors en blijven de volgende PR-diffs op de al geïntegreerde basis terugvallen, zoals lokaal gerepeteerd.

Na iedere later geautoriseerde merge: laat de parentbranch voorlopig bestaan, controleer de main-SHA, inspecteer de base van de volgende PR, richt die zo nodig bewust op main, wacht nieuwe volledige checks en bekijk de diff opnieuw. **Deze sprint heeft geen base gewijzigd.** Vertrouw niet op automatische retargeting na branchverwijdering: dat servergedrag kon hier niet onafhankelijk worden bevestigd (GitHub API Forbidden, officiële documentpagina 403 en raw-sourcepad 404). Het veilige plan werkt met een expliciete latere basecontrole/retarget door de eigenaar en vereist geen automatische branchverwijdering.

**Blokkade voor blind pad A:** #9 heeft een werkelijk rode workflow met niet verkregen macos-latest/arm64-runner. Na basewijziging blijft dat oude workflowbestand onderdeel van die PR, totdat latere sprints de Intel-configuratie brengen. Eerst runner/checkprobleem op die toekomstige PR oplossen en een actuele groene vereiste run halen; niet omzeilen met admin-merge of het uitschakelen van Mac. Integratie-inhoud is lokaal conflictvrij, maar deze checkgate is daardoor niet vanzelf voldaan.

Squash/rebase van vroege PR’s verandert de commit-identiteit en verbreekt de gerepeteerde ancestry. Een volgende ongewijzigde featurebranch heeft dan nog de oorspronkelijke ouders: GitHub kan eerdere commits/diffs opnieuw tonen of conflicten krijgen. Dat betekent niet dat Git noodzakelijk iedere bestandsregel dupliceert; het betekent dat deze mergeproef niet meer de gekozen route bewijst. Een nieuwe gecontroleerde stack/rebase of ander plan is dan nodig. Geen histories herschreven of force-push uitgevoerd.

## Pad B — één toekomstige cumulatieve integratiereview

**Veiligste huidige voorstel:** één toekomstige main-target **draft** met de volledige definitieve auditboom, omdat die ook de laatste Mac-/privacy-/reset-/packagefixes bevat. Nu alleen [de cumulatieve vergelijking](https://github.com/johndobry89/SeatBuddy/compare/main...feat/issue-19-sprint-08?expand=1); geen concurrerende PR naar main geopend.

Dit is een grote review: Sprint 07 alleen al had 121 gewijzigde bestanden en 30 commits; Sprint 08 voegt audit/fixes toe. Gebruik de PR-/oppervlaktekaart en de zeven oorspronkelijke discussies om traceerbaarheid te bewaren. Kies ook hier later een echte mergecommit als behoud van bestaande commit-ancestry gewenst is. Bewaar vooraf de PR-links/heads; GitHub kan bij bereikbaarheid van commits PR-statussen automatisch bijwerken. Controleer de oude drafts na integratie en laat de eigenaar het verdere opruimen bepalen. Deze sprint sluit niets en verwijdert geen branch.

Voordeel: de complete finale workflow/testboom wordt als één geheel tegen main beoordeeld; er hoeft niet tussentijds een oude onvolledige workflow als distributiepunt te dienen. Nadeel: grotere review, geen vervanging voor menselijke beoordeling van alle oppervlakken. Nieuwe main-target-checks en concrete toestemming blijven verplicht.

## Werkelijk uitgevoerde lokale proef

Eigen, losgekoppelde worktrees onder /tmp, geen checkout of wijziging van de main-branch. De sequentiële proef maakte alleen lokale no-ff-mergecommits. Alle stappen zonder conflict; na iedere merge exact dezelfde tree als de bron-head:

| Stap           | Bron-head                                  | Alleen lokale mergecommit                  | Geobserveerde tree                         | Identiteit |
| -------------- | ------------------------------------------ | ------------------------------------------ | ------------------------------------------ | ---------- |
| PR #4          | `b2be53ee40d756da1a68b5455d5ab3f81fe36074` | `3b136f8d4c5d347cfa77c352423f6617295916ed` | `5f08e860ad560aee06c68dbaeaa6457f295af19b` | PASS       |
| PR #6          | `c4b72b49fcde06b41568a6e660866d5e6c903b27` | `9f065e7c203a165125d45308df65ef29c1d116e9` | `1ae40949aa76edc68c218aef565a0faf853b725e` | PASS       |
| PR #9          | `383d79d1260fdb0fdc4df0e8dd4ebb2407146a53` | `cccb017a721334b90de6a6d4f244fce9ed811b17` | `39722d5033c63ed911573acfd2b2eeedf02b3bf3` | PASS       |
| PR #11         | `61c7fcaeec8dbebadb2244a224e4d682b1e4acf6` | `c2dfab166683a16853d4b7ff1a7e2d540ebe709c` | `27b5993dd417ea06142505149c48107e7fe8d43d` | PASS       |
| PR #14         | `129f84e3c2fd9d802217214a44864ef56354c522` | `f4ff9ae78e7a4ae3761b5d8e98a236168ecec7b9` | `aaad705cfb6d1aea1aab81b9c3c7639c9f28ea43` | PASS       |
| PR #16         | `40fee3dea7ce3ef5db79e667f93af3903dca8d9c` | `dfd42dac77482d3fbd6268f9c4c89a5a913238df` | `af14ef89e448c84d8800155b40172d35c5150823` | PASS       |
| PR #18         | `3209eeed7940c47a44dc1045ea1930e7530fc36d` | `35759937700df78661b528dd76e7816dab731322` | `92bcdf66dfa779caa01e24aa93384bcebd08aa9a` | PASS       |
| Sprint 08 code | `cdbeb1c574ccc5d12f7bf60ef33287f758b0cad4` | `7e54aaafb2f876e4b23b82077a255cf0f67556e1` | `34654e43d79e0b789f1b1951f6db01a53ed2c8f8` | PASS       |

Cumulatieve proef: lokale merge `84eaca644c252bf286dc194e4af0f8ba5dd119dd`, tree `34654e43d79e0b789f1b1951f6db01a53ed2c8f8`. Die is exact gelijk aan zowel de sequentiële eindboom als code-head `cdbeb1c574ccc5d12f7bf60ef33287f758b0cad4`: **nul afwijkende bestanden**. Commit-DAGs verschillen door de gekozen lokale mergecommits; bestandsinhoud verschilt niet. Geen van deze mergecommits is op de remote auditbranch gepubliceerd.

In de sequentiële eindboom daadwerkelijk uitgevoerd: `npm ci --cache /tmp/seatbuddy-npm`, `npm run check` (239 tests, lint/types/format/iconen/build), `npm run package`, en `npm run test:ui` (21 PASS, Chromium met transportdoubles). Native installatie in deze beheerde omgeving is beleidsmatig BLOCKED; native CI controleert de feature-head met dezelfde bronboom. De gerepeteerde en feature-ZIP zijn bytegelijk, niet alleen qua manifest.

De latere documentatie-head wordt vóór afronding nog uitsluitend lokaal op beide proefbomen toegepast en met de volledige feature-tree vergeleken. Eind-SHA/identiteit en final-head-CI worden ook in de oplevering/PR-tekst vastgelegd; deze tekst verzint geen eigen toekomstige commit-SHA. Alle zelf aangemaakte worktrees worden na de proef verwijderd; main en ouderbranches blijven staan.

## Reproduceerbare lokale commandoreeks

Alle mergecommando’s hieronder horen uitsluitend in de eigen wegwerpworktree. Heads eerst exact controleren; niet blind draaien wanneer remote refs sinds de bovenstaande registratie zijn veranderd.

```sh
git fetch origin main refs/pull/4/head:refs/remotes/origin/pr-4 refs/pull/6/head:refs/remotes/origin/pr-6 refs/pull/9/head:refs/remotes/origin/pr-9 refs/pull/11/head:refs/remotes/origin/pr-11 refs/pull/14/head:refs/remotes/origin/pr-14 refs/pull/16/head:refs/remotes/origin/pr-16 refs/pull/18/head:refs/remotes/origin/pr-18
AUDIT_HEAD=$(git rev-parse feat/issue-19-sprint-08)
REHEARSAL_DIR=$(mktemp -d /tmp/seatbuddies-rehearsal-XXXXXX)
git worktree add --detach "$REHEARSAL_DIR" c0c5c1b0f683b003288ca33eed8ad5d9b9e08825
for source in origin/pr-4 origin/pr-6 origin/pr-9 origin/pr-11 origin/pr-14 origin/pr-16 origin/pr-18 "$AUDIT_HEAD"; do
  git -C "$REHEARSAL_DIR" merge --no-ff --no-edit "$source" || exit 1
  test "$(git -C "$REHEARSAL_DIR" rev-parse 'HEAD^{tree}')" = "$(git rev-parse "$source^{tree}")" || exit 1
done
cd "$REHEARSAL_DIR"
npm ci
npm run check
npm run test:ui
npm run package
```

Bij een native toegestane Linux-testomgeving volgt `HEADED=1 xvfb-run -a npm run test:e2e`; op macOS Intel `HEADED=1 npm run test:smoke:chrome`. Alleen geïsoleerde wegwerpprofielen en fictieve data, geen managed-policy-aanpassing. Voor cumulatief pad B: een tweede eigen detached worktree vanaf dezelfde main en slechts één no-ff-merge van AUDIT_HEAD; controleer dezelfde tree. Na alle verificatie terug naar de oorspronkelijke repo en alleen de eigen worktree met `git worktree remove --force "$REHEARSAL_DIR"` verwijderen. Het force-argument dient uitsluitend om eigen gegenereerde node_modules/dist/testresultaten in die wegwerpkopie op te ruimen, nooit om bestaande werkmappen of gebruikerswerk te verwijderen.

## Stopcriteria en latere distributie

STOP bij gewijzigde heads/main, conflict of niet-identieke tree, nieuw verschil in permissies/bewijs/opslag, ontbrekende checks, onbekende artifacts/checksum, open P0/P1, verloren bron-/reviewtraceerbaarheid of ontbrekende concrete toestemming. Niet automatisch oplossen via squash/force-push/adminoverride.

Versie **0.8.0-test** is een echte hardening-/pakketwijziging, geen nieuwe Vue-feature. Artifact **seatbuddies-chrome-test**, inner **seatbuddies-0.8.0-chrome-test.zip** + `.sha256`, 24 bestanden inclusief LICENSE en THIRD_PARTY_NOTICES.txt. Geen tag/release aangemaakt. Tags, Storeinzending, deployment, automatische branchcleanup en naams-/juridische goedkeuring zijn uitsluitend eventuele latere handmatige eigenaarbesluiten. Technisch integration-GO is geen GO voor publieke distributie; zie de afzonderlijke [gates](project-readiness.md).
