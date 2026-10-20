# CODEX BUILD BRIEF — SeatBuddy / SeatMates — Sprint 01

**Status:** READY FOR IMPLEMENTATION  
**Date:** 2026-10-20  
**Target:** `main` in `johndobry89/SeatBuddy`, preferably work on a feature branch and open a PR for review.  
**Goal:** Build and verify a **locally installable, fixture-driven Chrome Manifest V3 Side Panel extension skeleton**. This is the G1 engineering scaffold and a mock-only dual-session coordinator, **not** a production-ready Vue booking integration.

## Codex: execute, don't merely propose

Read these files completely, in order, before editing:

1. `AGENTS.md` — binding repository development contract and invariant rules.
2. `SEATMATES_MASTERPLAN.md` — product specification, gates, privacy and assumptions.
3. `docs/feasibility.md` — factual evidence statuses.
4. `docs/decisions/ADR-001-extension-first.md` and `ADR-002-dual-session.md`.

Inspect the actual repository and its current scripts/structure. Preserve all user work. **Implement, test, and open a draft or reviewable PR** if your environment permits. Do not claim any live Vue functionality.

### Deliverables — Sprint 01, in order

**A. Scaffold (G1):** Create a minimal, working Chrome **MV3** extension (Chrome desktop, strict TypeScript) with a **Vue 3 Side Panel**, bundling through a proven Vite-compatible MV3 approach. Prefer a maintained minimal toolchain over unnecessary frameworks. Create normal source files, manifest, dependencies, lockfile and consistent scripts only after assessing the repo. The build must output a folder installable using Chrome `chrome://extensions` → `Load unpacked`. Do not publish or deploy it.

**B. Two-role mock coordinator:** Implement typed per-person `A`/`B` state with distinct tab bindings, separate booking status, a strict comparison contract for showtime identity, and explicitly marked evidence type. Use a simple typed state machine (or plain well-tested reducer) instead of overengineering. Keep module boundaries for coordinator, session registry, domain matcher, content adapter and privacy normalization. *A mock observation is never live checkout evidence.* Never set `CONFIRMED` from user input, guesswork or a fixture interpreted as a live response.

**C. Side Panel UI:** Compact, keyboard-usable and accessible interface displaying **A / B** separately, each status and evidence source, showtime match/mismatch/unknown, desired seats and a single practical next step. Supply a **mock demo mode** and a useful **manual checklist fallback** when live detection is unavailable. Keep colors and wording honest: a green completion signal cannot imply a finished booking. Display the independent-tool disclaimer.

**D. Session isolation experiment:** Add the smallest non-destructive technical spike to explore Chrome normal+incognito session metadata and the `spanning` hypothesis. Only user-chosen tabs; do not infer identity from emails, account information or cookies. Check incognito access using Chrome's supported API. Don't persist incognito session state to `storage.local` or `storage.sync`. Treat uniform Side Panel presentation across windows as **unproven**. It is acceptable to leave this experiment behind a manual action or mocked interface until Chrome can actually be tested. Record anything untested as `NOT_RUN` in feasibility.

**E. Tests and verification:** Unit tests for matcher/state/provenance with positive and negative outcomes. Include misleading DOM signals, mismatched showtimes, spoofed sender or tab IDs, stale observations, role swap, absent incognito access, partial success and worker restarts where applicable. A smoke/integration test against **local fictional pages only** may be added with Playwright. Add lint, formatting, typecheck and build scripts, and a small GitHub Actions workflow that runs the verified commands. Run checks; do not fabricate PASS states if Chrome/CI is unavailable.

**F. Docs:** Update README with prerequisites, commands, unpacked installation, security/privacy scope and limitations. Update `docs/feasibility.md` using real evidence types and records. If architecture departs from the two ADRs, write a new ADR rather than silently rewriting assumptions.

### Explicitly OUT OF SCOPE for this sprint

- No access to real Vue user accounts, private credentials, email, ticket QR, payment data or production checkout.
- No live website scraping, DOM automation, auto-clicking seats, checkout submission or final booking.
- No CAPTCHA/anti-bot evasion, rate-limit bypass, Vue private endpoint reverse engineering, forced seat holds, automated confirmation or retry of uncertain writes.
- No persistent storage of sensitive booking/account/incognito state, no backend, no telemetry.
- No commitment to mobile PWA, other cinema chains or a Chrome Web Store publication.
- Do not change repository visibility, licenses, security policy or the source masterplan just to satisfy code style.

### Technical acceptance criteria

- `Load unpacked` extension output is produced by an actual local build (and manually verified in Chrome if Chrome is available).
- Side Panel shows A and B with **separate** independent statuses, including `UNKNOWN` and partial completion.
- Matching enforces cinema + movie + date + showtime + hall or strong verified showtime key; never silently matches missing fields.
- State cannot become `CONFIRMED` without trusted external evidence in a future live integration; fixture demo must be labeled **SIMULATION** and not be conflated with actual Vue success.
- All content/worker message shapes validated at runtime; reject untrusted claimed tab IDs and unknown origins. Never trust DOM/page fields as privileged instructions.
- On reload/worker restart, live-evidence-derived state is invalidated/reobserved; no automatic transaction retries.
- No broad `<all_urls>` permissions, cookies, debugger, remote code or secrets.
- Real tests performed and results reported precisely; mock tests are never labeled real Vue tests.

### Suggested boundaries (adjust if a simpler verified setup fits)

```text
src/
  background/           # coordinator, tab bindings, message validation
  core/                 # types, independent booking state, showtime matcher
  content/              # minimal, read-only future observer interface
  adapters/vue-cinemas/ # site-specific adapter placeholders ONLY until G0
  privacy/              # bounded/sanitized message payloads
  sidepanel/            # Vue 3 app + explanatory manual fallback
tests/                  # fictional mock fixtures and unit/integration tests
docs/feasibility.md     # evidence log, NOT_RUN until measured
```

### Evidence / stop rules

- G0 (actual Vue page, terms and dual-session capability) is currently **NOT_RUN**. Do not mark G0 as passed because tests against mocks pass.
- If tools, browsers or network are unavailable, implement the parts you can fully verify and clearly mark the rest `BLOCKED` or `NOT_RUN`.
- If `spanning` or a future adapter fails, retain the manual checklist MVP rather than introducing risky tricks.
- Keep booking finalization entirely under user control on Vue; there is **no** "Book both" action.
- Do not imply actual paired seats are held or simultaneously reservable.

## Report back

Provide:
1. Files/paths created or modified.
2. Exact scripts and checks run, with `PASS`/`FAIL`/`NOT_RUN`/`BLOCKED`.
3. What can be used with mock fixtures now.
4. What **cannot** yet be claimed about Vue or dual-account sessions.
5. Link to PR/commit if you made one, and the next smallest actual manual G0 test.

**Definition of success:** An honest, installable Chrome side-panel prototype with independent A/B mock flows, tested core rules and clear manual fallback. Not a flashy fake booking demo.
