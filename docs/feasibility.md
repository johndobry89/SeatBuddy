# Feasibility & evidence register — SeatBuddy / SeatMates

**Updated:** 2026-10-20  
**Overall state:** G0 **NOT_RUN** · G1 implementation built, gate **BLOCKED** on actual Chrome installation · G2–G5 **NOT_RUN**

This file is the source of truth for observed practical feasibility. Design assumptions and tests using fixtures do not prove the Vue website or booking flow.

## Status vocabulary

`NOT_RUN`: test not performed · `PASS`: actual criterion met with evidence · `FAIL`: observed failure · `BLOCKED`: clear obstacle · `INCONCLUSIVE`: evidence insufficient.

Evidence levels: `DESIGN_REVIEW`, `STATIC_CHECK`, `MOCK_INTEGRATION`, `MANUAL_LIVE_OBSERVATION`, `LIVE_BOOKING_TEST`.

## G0 checklist — no live side effects

| ID    | Subject                                                                   | Status  | Evidence |
| ----- | ------------------------------------------------------------------------- | ------- | -------- |
| G0-01 | Review current Vue terms, authorization boundary and allowed interactions | NOT_RUN | —        |
| G0-02 | Observe current Vue page flow without final checkout action               | NOT_RUN | —        |
| G0-03 | Identify exact allowed hostnames and page semantics                       | NOT_RUN | —        |
| G0-04 | Determine DOM/SVG/canvas seat map representation                          | NOT_RUN | —        |
| G0-05 | Separate account sessions (normal and incognito)                          | NOT_RUN | —        |
| G0-06 | Test Chrome incognito opt-in / MV3 spanning metadata                      | NOT_RUN | —        |
| G0-07 | Verify role A/B provenance and Side Panel behavior                        | NOT_RUN | —        |
| G0-08 | Observe harmless selection vs actual confirmation signals                 | NOT_RUN | —        |

## G1 engineering (local, fake data only)

| ID    | Subject                                            | Status                        | Evidence                                                             |
| ----- | -------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------- |
| G1-01 | Working MV3 build and Vue side panel               | PASS (build and UI mock only) | S01-LOCAL; browser placement BLOCKED                                 |
| G1-02 | Build installable with Load unpacked               | BLOCKED                       | Managed Chromium denies unpacked installation; dist package produced |
| G1-03 | Local mocked A/B roles and statuses                | PASS (MOCK_INTEGRATION)       | S01-LOCAL; not real accounts                                         |
| G1-04 | Executed lint/typecheck/unit tests/build           | PASS                          | S01-LOCAL                                                            |
| G1-05 | Incognito spanning spike with real Chrome metadata | BLOCKED                       | Host policy disables incognito; mocked contract tests only           |

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
