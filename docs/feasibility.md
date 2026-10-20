# Feasibility & evidence register — SeatBuddy / SeatMates

**Updated:** 2026-10-20  
**Overall state:** G0 live Vue **NOT_RUN / BLOCKED** · Sprint 01 unpacked-fixture smoke **PASS on GitHub runner** · Sprint 02 manual assistant built/tested locally; new actual Chrome smoke **BLOCKED locally**, runner outcome recorded separately below · G2–G5 live gates **NOT_RUN**

This file is the source of truth for observed practical feasibility. Design assumptions and tests using fixtures do not prove the Vue website or booking flow.

## Status vocabulary

`NOT_RUN`: test not performed · `PASS`: actual criterion met with evidence · `FAIL`: observed failure · `BLOCKED`: clear obstacle · `INCONCLUSIVE`: evidence insufficient.

Evidence levels: `DESIGN_REVIEW`, `STATIC_CHECK`, `MOCK_INTEGRATION`, `MANUAL_LIVE_OBSERVATION`, `LIVE_BOOKING_TEST`.

## G0 checklist — no live side effects

| ID    | Subject                                                                   | Status                 | Evidence                                                                                  |
| ----- | ------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| G0-01 | Review current Vue terms, authorization boundary and allowed interactions | BLOCKED / INCONCLUSIVE | S02-RESEARCH: official Vue destinations denied by egress proxy; no authorization inferred |
| G0-02 | Observe current Vue page flow without final checkout action               | NOT_RUN                | —                                                                                         |
| G0-03 | Identify exact allowed hostnames and page semantics                       | NOT_RUN                | —                                                                                         |
| G0-04 | Determine DOM/SVG/canvas seat map representation                          | NOT_RUN                | —                                                                                         |
| G0-05 | Separate account sessions (normal and incognito)                          | NOT_RUN                | —                                                                                         |
| G0-06 | Test Chrome incognito opt-in / MV3 spanning metadata                      | NOT_RUN                | —                                                                                         |
| G0-07 | Verify role A/B provenance and Side Panel behavior                        | NOT_RUN                | —                                                                                         |
| G0-08 | Observe harmless selection vs actual confirmation signals                 | NOT_RUN                | —                                                                                         |

## G1 engineering (local, fake data only)

| ID    | Subject                                            | Status                              | Evidence                                                                                                                     |
| ----- | -------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| G1-01 | Working MV3 build and Vue side panel               | PASS (build / extension-page smoke) | S01-CI; actual Side Panel opening added to S02 test, distinct from S01                                                       |
| G1-02 | Build installable with Load unpacked               | PASS on GitHub runner               | S01-CI; managed cloud remains BLOCKED; Windows NOT_RUN                                                                       |
| G1-03 | Local mocked A/B roles and statuses                | PASS (MOCK_INTEGRATION)             | S01-LOCAL; not real accounts                                                                                                 |
| G1-04 | Executed lint/typecheck/unit tests/build           | PASS                                | S01-LOCAL                                                                                                                    |
| G1-05 | Incognito spanning spike with real Chrome metadata | BLOCKED locally                     | S02 new test requires a permitted disposable browser; packaged incognito fixture route NO-GO by documented platform contract |

## Observation record template

- **Observation ID:**
- **Date/time/timezone:**
- **Observer and permission context:**
- **Environment:** Chrome version, OS, extension commit SHA, incognito permission
- **Scope:** exact attempted operation; confirm non-destructive
- **Expected outcome:**
- **Observed outcome:** only verified, privacy-safe facts
- **Evidence class:**
- **Result:** PASS / FAIL / NOT_RUN / BLOCKED / INCONCLUSIVE
- **Redacted reproduction steps:**
- **Known limitations and next check:**

Never include account emails, subscription IDs, cookies, auth tokens, ticket QR codes, payment details or identifying screenshots.

## Current factual conclusions

None about live Vue checkout, real dual-account isolation, live adjacency signals, seat holds, terms compliance or successful bookings. Sprint 01 now contains implemented and locally tested fictional simulation code. The masterplan and original ADRs remain design records; their uncompleted live gates have not been marked passed.

## S01-LOCAL — implementation evidence

- **Date/timezone:** 2026-10-20, Europe/Berlin (CEST).
- **Scope:** issue #3 / `CODEX_BUILD_BRIEF.md`, branch `feat/issue-3-sprint-01`, based on `c0c5c1b0f683b003288ca33eed8ad5d9b9e08825`. Only local fictional data; no real accounts or website checkout opened.
- **Environment:** Linux cloud workspace, Node.js 24.19.0, npm 11.9.0, Chromium 154.0.8037.57, Playwright 1.64.1, Vue 3.5.44, TypeScript 6.0.3, Vite 8.3.4. Exact dependency versions and integrity metadata are in `package-lock.json`.
- **Implementation:** plain Vite multi-entry MV3 build with packaged worker/panel/fixture, no live content scripts or web host permissions. Only `sidePanel` permission. Chrome 116+ minimum for the panel action behaviour. No changes to the architecture decisions or project invariants; `spanning` remains an unproven browser experiment.

| Command / check                                                     | Result                | Evidence and limits                                                                                                   |
| ------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm ci --cache /tmp/seatbuddy-npm`                                 | PASS                  | Frozen-lockfile installation repeated successfully                                                                    |
| `npm run format:check`                                              | PASS                  | Maintained implementation/docs formatting checked; original project contracts excluded from automatic formatting      |
| `npm run lint`                                                      | PASS                  | ESLint with zero warnings                                                                                             |
| `npm run typecheck`                                                 | PASS                  | Strict Vue/TypeScript checking                                                                                        |
| `npm test`                                                          | PASS                  | 64 unit/contract tests across 4 files; actual tests, no skipped suite                                                 |
| `npm run build`                                                     | PASS                  | Produces `dist/manifest.json`, worker, panel, fixture and local assets                                                |
| `npm run test:ui` with system Chromium and writable XDG directories | PASS                  | 2 browser UI mock tests; actual built Vue UI + real Node router/coordinator through a simulated Chrome transport      |
| `npm run test:e2e` with system Chromium                             | BLOCKED (runner FAIL) | Browser refuses unpacked extension installation; no extension worker starts. This is not a passing extension/API test |
| `npm audit --omit=dev`                                              | PASS                  | 0 reported production dependency vulnerabilities at execution time; not a complete security assessment                |
| Actual Chrome Side Panel placement / normal+incognito provenance    | BLOCKED               | Managed `ExtensionInstallBlocklist: ["*"]` and `IncognitoModeAvailability: 1`; policy unchanged                       |
| Live Vue terms/accounts/checkout/seats/confirmation                 | NOT_RUN               | Out of this implementation's scope; G0 unchanged                                                                      |
| GitHub Actions                                                      | NOT_RUN locally       | Workflow supplied; only remote execution can establish CI results                                                     |

The unit/contract cases cover all five showtime mismatches and missing fields, invalid dates/times, aisle/category/seat topology, independent partial simulation, replay/future/expired observations, malformed and oversized payloads, spoofed tab/document/window/origin/frame, role swaps, missing/revoked consent, navigation/closure/window move/tab replacement, worker module restart, and no restoration/replay of simulated completion. Real confirmation is absent from the accepted status schema; user/fixture input cannot create it.

The UI mock checks cover independent A advancement, matching/mismatching showtimes, aisle separation, partial failure, stale B with current A, reset, independent manual checklists, lack of checklist persistence, missing Chrome runtime fallback and a 320px viewport without horizontal overflow. Screenshots of the fictional UI were inspected locally. These checks do not validate Chrome APIs, accessibility with assistive technology, two actual cookie jars, real Side Panel placement or live site observation.

Browser test reproduction in this cloud instance:

```sh
CHROMIUM_PATH=/usr/bin/chromium \
XDG_CONFIG_HOME=/tmp/seatbuddy-chromium-config \
XDG_CACHE_HOME=/tmp/seatbuddy-chromium-cache \
npm run test:ui
```

Use the same environment prefix for `npm run test:e2e`; that command currently fails on the documented policy restriction. The actual-extension test remains present and enabled for a compatible browser; no policy override, assertion weakening or passing substitute was used. See [manual-test-plan.md](manual-test-plan.md) for the outstanding local installation, incognito and real worker-suspension checks. G1 cannot be marked complete until those required browser checks have real evidence.

## S01-CI — reconcile runner success with the cloud restriction

Rechecked on 2026-10-20 (Europe/Berlin): [run 39389132288](https://github.com/johndobry89/SeatBuddy/actions/runs/39389132288) and [job 118516132358](https://github.com/johndobry89/SeatBuddy/actions/runs/39389132288/job/118516132358) show **Success**, total 1m11s / job 1m08s. The run title identifies head `b2be53e`, whose full Git head is **`b2be53ee40d756da1a68b5455d5ab3f81fe36074`**. The corresponding committed workflow runs `npm ci`, `npm run check`, `npm run test:ui` and `npm run test:e2e` on `ubuntu-latest` with Playwright Chromium. The public summary was read; detailed downloadable job logs/API metadata were unavailable here. The PR runner checkout may use a generated merge ref; the stated SHA is the PR head, not an invented runner checkout SHA.

**Evidence class:** MOCK_INTEGRATION with an actual unpacked-extension fixture smoke. It establishes that the generated Sprint 01 package loaded in that runner browser, its worker responded with real browser sender metadata for the regular fixture A, its built UI passed the exercised synthetic scenarios and normal-tab B was rejected. S01 checked Side Panel configuration; it did **not** invoke the actual panel-opening UI, grant incognito, exercise B in an incognito tab, prove independent accounts or visit Vue. The cloud's policy failure is a separate scoped BLOCKED result, not a contradiction or a repository failure. This reconciles and supersedes the earlier unknown remote-CI status; historical S01-LOCAL results above are unchanged.

## S02-RESEARCH — platform contracts and G0 boundary

**Date:** 2026-10-20, Europe/Berlin. Only public, non-destructive documentation/source requests were attempted.

| Official source                                                                                                                                                   | Observed result / precise boundary                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Current Chrome Side Panel page](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)                                                            | Proxy CONNECT 403; rendered page not read                                                                                                                                  |
| [Official Side Panel documentation source](https://github.com/GoogleChrome/developer.chrome.com/blob/main/site/en/docs/extensions/reference/sidePanel/index.md)   | Read successfully from official archived site source; documents Chrome 116+ `sidePanel.open()` after an explicit user gesture and the sidePanel permission                 |
| [Current Chromium Side Panel schema](https://github.com/chromium/chromium/blob/main/chrome/common/extensions/api/side_panel.idl)                                  | Read successfully; local package path, explicit user-action opening, defaults and panel behaviour. API contract, not runtime proof                                         |
| [Official incognito documentation source](https://github.com/GoogleChrome/developer.chrome.com/blob/main/site/en/docs/extensions/mv3/manifest/incognito/index.md) | Read successfully; archived documentation, not a live observation. Spanning cannot load packaged pages in the main frame of an incognito tab; local/sync storage is shared |
| [Current Chromium incognito manifest implementation](https://github.com/chromium/chromium/blob/main/extensions/common/manifest_handlers/incognito_info.cc)        | Read successfully; spanning/split remain distinct modes; no implicit substitution justified                                                                                |
| [Vue Movie Pass official page](https://www.vuecinemas.nl/subscription/details)                                                                                    | Proxy CONNECT 403; current contents not read                                                                                                                               |
| [Vue official terms index](https://www.vuecinemas.nl/voorwaarden/algemene-voorwaarden)                                                                            | Proxy CONNECT 403; current terms and linked pass conditions could not be reviewed                                                                                          |

**Result:** platform documentation/source review PASS for the precise facts above. Public Vue terms/help research **BLOCKED**, allowed live interaction boundary **INCONCLUSIVE**. No currently observed Vue origin/selector/account/checkout signal has been established. The ordinary public Vue hyperlink in the manual UI is a user-initiated navigation aid, not a permission grant or evidence that an observer is allowed. No production host or content script is enabled. The permitted implemented scope is local fictional DOM/SVG tests and user-authored manual planning; genuine logged-in observations need separate human permission/evidence. G0-02–08 live steps remain NOT_RUN except where explicitly scoped browser metadata evidence is added; no booking test was conducted.

**Correction / NO-GO:** opening packaged `fixture.html` as B inside incognito is incompatible with the documented spanning main-frame rule. This corrects the old S01 manual instruction. It is not NO-GO for all possible future spanning content-script coordination. Sprint 02 instead offers context-only metadata pairing in the ordinary panel and a complete manual workaround. [ADR-003](decisions/ADR-003-manual-first-context-pairing.md) records this decision without rewriting ADR-002.

## S02-LOCAL — manual companion and clean Windows test build

**Environment:** Linux cloud, Node.js 24.19.0, npm 11.9.0, system Chromium 154.0.8037.57. Branch `feat/issue-5-sprint-02` starts at Sprint 01 head `b2be53ee40d756da1a68b5455d5ab3f81fe36074`. Exact versions/integrity are locked. Scope: user-input manual workflow, genuine Chrome context API plumbing where permitted, synthetic adapter fixtures; no real accounts or production checkout.

| Executed command/check                                                    | Result                 | Evidence and limits                                                                                                                                                                 |
| ------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --cache /tmp/seatbuddy-npm`                                       | PASS                   | Actual frozen-lockfile installation, including the ZIP packaging dependency                                                                                                         |
| `npm run check`                                                           | PASS                   | Formatter, zero-warning lint, strict Vue/TypeScript, 81 unit/contract tests in 6 files, production build                                                                            |
| `npm run test:ui` with system Chromium and writable XDG dirs              | PASS                   | 4 browser tests: original simulation scenarios, usable no-runtime fallback, full manual A/B flow with real polling/keyboard/partial recovery/reset, and browser-API-denial fallback |
| `npm run test:e2e` with system Chromium                                   | BLOCKED (runner fails) | Both actual-extension tests cannot get a worker because managed policy denies installation. Incognito is also disabled; policy is not modified                                      |
| `npm run package`                                                         | PASS                   | Versioned Windows-compatible unpacked-runtime ZIP and SHA-256; archive round-trip bytes verified. This is not an actual Windows runtime test                                        |
| `npm audit --omit=dev`                                                    | PASS                   | 0 reported production vulnerabilities; not a complete security audit                                                                                                                |
| Genuine Windows Chrome install / interactive assistive-technology check   | NOT_RUN                | Human test required; detailed Dutch guide supplied                                                                                                                                  |
| Public Vue terms / genuine page / accounts / checkout / seat availability | BLOCKED / NOT_RUN      | As S02-RESEARCH; no production adapter activated                                                                                                                                    |

The expanded unit suite covers planning schema/date validation, unknown hall, ordered acknowledgements, independent completion/partial failure, plan/detail invalidation, self-report expiry, logout/mismatch/failure recovery, active-context validation and consent, navigation and privacy reduction (never returning Chrome title/URL fields), no false adjacency or confirmation, plus the unchanged Sprint 01 provenance/lifecycle regressions. The pure adapter recognizes only our synthetic public-screening/SVG fixture contract and cannot produce real-confirmation evidence.

The full manual browser test waits for actual repeated GET_STATE cycles before verifying that unsaved seat inputs survive. It exposed an over-eager Vue watcher; the implementation was corrected without weakening the assertion. Keyboard submission moves focus to the A/B section. Reset clears both worker state and visible fields. Screenshots contain only fictional data and were inspected locally. UI mocks still do not establish Chrome permission plumbing or real account isolation.

The actual-extension suite is retained and strengthened: real `sidePanel.open()` from a fixture click must create a separate browser target; fixture A binding must contain browser tab/window/document metadata; B normal-tab binding is rejected; manual mode and no-host privileges are checked. A second test explicitly grants/revokes incognito via Chrome's settings in its own disposable profile, uses only neutral `about:blank` contexts (closing its own incognito window if Chrome explicitly reports a deferred permission change), and stops/restarts the actual worker through test instrumentation. CI runs these tests headed under Xvfb, with no managed-policy or profile-file overrides. Their final runner status is recorded below, not inferred from S01 success.

Privacy inspection: only `sidePanel` permission; no optional/production host privileges, content scripts, cookies, storage, debugger or scripting. Chrome active tabs are queried only on an explicit user list/bind request, never background status polling. Metadata is reduced to tab/window/incognito before it reaches the UI. There are no automatic external requests, telemetry, clipboard reads or user identities. The only external navigation is a fixed official-homepage link after a human click. Plans and self-reports are temporary input, not website observations; worker restart forgets them, and reports expire after 15 minutes.

Packaging rejects unexpected package roots, symlinks and non-runtime file types, checks version/permissions/entry points, and verifies decompressed ZIP bytes against the build. The Actions download artifact contains only the runtime ZIP and checksum; no node_modules, caches, test reports or secrets. [Windows guide](windows-test-guide.md) explains both layers of ZIP extraction. [Manual plan](manual-test-plan.md) specifies actual acceptance observations without asserting they happened.

### Remaining evidence and risks

1. Actual desktop Windows Side Panel / incognito interaction and user window identification still need a human test; a Linux runner result cannot establish those.
2. Chrome context metadata is not an account/person identity or website observation. The user must verify each own login and final outcome independently.
3. Current Vue terms, permissible DOM scope, seat geometry and confirmation semantics remain unobserved/unknown. Production observation remains disabled.

Next minimum human check: on a permitted Windows Chrome profile load the versioned package, open the real panel, use fictional planning fields, verify A-only completion and B partial recovery, explicitly opt in/out of incognito with neutral tabs, and verify that closing/restarting clears evidence. For G0, first review current Vue terms/help and document the allowed read-only scope; no automated checkout step follows from this build.

## S02-CI — current branch validation

Pending the pushed branch's Actions run. Do not substitute S01 run 39389132288 or local UI mocks for the new Chrome smoke results. The final run URL, head SHA and conclusion will be recorded after observing them.
