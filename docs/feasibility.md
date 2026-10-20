# Feasibility & evidence register — SeatBuddy / SeatMates

**Updated:** 2026-10-20  
**Overall state:** G0 **NOT_RUN** · G1 **NOT_RUN** · G2–G5 **NOT_RUN**

This file is the source of truth for observed practical feasibility. Design assumptions and tests using fixtures do not prove the Vue website or booking flow.

## Status vocabulary

`NOT_RUN`: test not performed · `PASS`: actual criterion met with evidence · `FAIL`: observed failure · `BLOCKED`: clear obstacle · `INCONCLUSIVE`: evidence insufficient.

Evidence levels: `DESIGN_REVIEW`, `STATIC_CHECK`, `MOCK_INTEGRATION`, `MANUAL_LIVE_OBSERVATION`, `LIVE_BOOKING_TEST`.

## G0 checklist — no live side effects

| ID | Subject | Status | Evidence |
| --- | --- | --- | --- |
| G0-01 | Review current Vue terms, authorization boundary and allowed interactions | NOT_RUN | — |
| G0-02 | Observe current Vue page flow without final checkout action | NOT_RUN | — |
| G0-03 | Identify exact allowed hostnames and page semantics | NOT_RUN | — |
| G0-04 | Determine DOM/SVG/canvas seat map representation | NOT_RUN | — |
| G0-05 | Separate account sessions (normal and incognito) | NOT_RUN | — |
| G0-06 | Test Chrome incognito opt-in / MV3 spanning metadata | NOT_RUN | — |
| G0-07 | Verify role A/B provenance and Side Panel behavior | NOT_RUN | — |
| G0-08 | Observe harmless selection vs actual confirmation signals | NOT_RUN | — |

## G1 engineering (local, fake data only)

| ID | Subject | Status | Evidence |
| --- | --- | --- | --- |
| G1-01 | Working MV3 build and Vue side panel | NOT_RUN | — |
| G1-02 | Build installable with Load unpacked | NOT_RUN | — |
| G1-03 | Local mocked A/B roles and statuses | NOT_RUN | — |
| G1-04 | Executed lint/typecheck/unit tests/build | NOT_RUN | — |
| G1-05 | Incognito spanning spike with real Chrome metadata | NOT_RUN | — |

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

None about live Vue checkout, multi-session capability, adjacency signals, seat holds, terms compliance or successful bookings. The repository documentation is design-stage only.
