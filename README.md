# SeatBuddy 🎬

**SeatMates** (working product name) is an independent Chrome desktop companion prototype for two separate Movie Pass holders.

**Sprint 01: local simulations only.** The repository contains a Vue 3 / strict TypeScript Manifest V3 extension, two independent fictional A/B sessions, conservative matching and a manual checklist. There is no live Vue Cinemas adapter, account access, booking integration, payment or seat hold. `SIMULATED_COMPLETE` is never a real `CONFIRMED` booking.

## Build and load locally

Prerequisites: Node.js 24 LTS (see `.nvmrc`), npm and desktop Chrome 116+ allowing unpacked extensions. No credentials or environment variables are required.

```sh
npm ci
npm run check
```

The build produces `dist/manifest.json`, `dist/background.js`, `dist/sidepanel.html`, `dist/fixture.html` and their local bundled assets.

1. Open `chrome://extensions` in a browser/profile where local extension installation is allowed.
2. Enable **Developer mode**, choose **Load unpacked** and select the generated `dist/` directory.
3. Pin SeatMates and click its toolbar action to open the Side Panel.
4. Choose **Start simulatie**. Advance A or B independently using **Volgende simulatiestap A/B**, or select a mismatch, partial failure, aisle or expired-observation scenario.
5. Choose **Wis sessies / handmatig** to discard both sessions and use the independent checklists. Checklist ticks never change booking status.

`npm run dev` rebuilds `dist/` when files change. Reload the extension in `chrome://extensions` and reopen the panel after rebuilding. It does not start a production website or a live integration.

In a cloud sandbox with an unwritable default npm cache, use `npm ci --cache /tmp/seatbuddy-npm`. Use the existing checkout: each cloud task is already isolated; no extra Git worktree is needed.

## Fictional browser-session experiment

The panel's **Open fictieve testpagina** opens a packaged, fictional page. Explicitly bind A there in a normal window. To try B, personally enable **Allow in incognito** in the extension's details, open the same extension fixture URL in an incognito window, and explicitly bind B there. Then send observations from each page. Role, tab, window, document and incognito provenance are checked by the worker; no identity is inferred from a login or cookies.

This experiment sends only synthetic showtime/seat data and minimal browser metadata. It is not proof of independent real accounts or a uniform Side Panel experience across normal/incognito windows. If browser policy or consent prevents it, retain the demo and manual fallback. See [the manual test plan](docs/manual-test-plan.md).

## Verification commands

| Command            | Purpose                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `npm run check`    | Prettier check, ESLint, strict typecheck, unit/contract tests, production build            |
| `npm test`         | Matcher, geometry, state, sender/privacy and worker lifecycle tests with fake data         |
| `npm run test:ui`  | Built Vue UI in Chromium with a simulated browser transport to the real router/coordinator |
| `npm run test:e2e` | Actual unpacked-extension smoke test; requires a browser permitting extension installation |
| `npm run format`   | Format maintained implementation files and docs                                            |

For browser tests, install Playwright Chromium with `npm exec playwright install -- --with-deps chromium`, or point `CHROMIUM_PATH` to an existing compatible Chromium binary. In this sandbox the installed binary is `/usr/bin/chromium`; use writable `XDG_CONFIG_HOME` and `XDG_CACHE_HOME` locations under `/tmp` when needed. The CI workflow installs Playwright Chromium and runs both browser suites. CI results remain unverified until GitHub Actions runs.

**Current evidence:** unit/contract tests, lint, formatting, strict types, build and the browser UI mock checks passed locally; see [the exact evidence and limitations](docs/feasibility.md). Actual unpacked installation is **BLOCKED in this cloud instance** by managed browser policy (`ExtensionInstallBlocklist: ["*"]`); incognito is disabled by policy too. The actual-extension test is retained and fails on this restriction; it is not silently skipped or replaced by the UI mock tests. G0 remains **NOT_RUN**.

## Architecture and privacy

- Plain Vite multi-entry build: the Side Panel, packaged fictional page and module service worker have local entry points. No extension builder plugin or development server is needed at runtime.
- Pure core modules compare all five showtime fields, reject incomplete matches and require explicit fictional geometry (same hall, row, section, category and neighbouring positions) for mock adjacency. Seat numbers alone are insufficient.
- The worker owns two independent states. Strict runtime schemas reject unknown commands/fields, oversized messages, claimed tab IDs and real-confirmation claims. Only exact packaged pages and browser-supplied sender metadata are accepted. There is no page-to-extension bridge or external content script.
- Observations expire after 60 seconds; navigation, tab closure, rebind, revoked consent and worker restart invalidate evidence. A service worker restart starts in manual mode. Nothing retries a transaction.
- Only `sidePanel` permission is requested. There are **no host permissions**, cookies, storage permission, broad tab permission, external backend, tracking, remote code or network requests. The incognito `spanning` setting remains an experiment.
- Booking/session data and checklist entries stay in memory, disappear on lifecycle reset, and are not written to `storage.local`, `storage.sync`, logs or a server. No real names, credentials, tickets, account identifiers or payment data belong in fixtures.

## Project documents

Read [AGENTS.md](AGENTS.md), [SEATMATES_MASTERPLAN.md](SEATMATES_MASTERPLAN.md), [CODEX_BUILD_BRIEF.md](CODEX_BUILD_BRIEF.md), [feasibility](docs/feasibility.md), [ADR-001](docs/decisions/ADR-001-extension-first.md) and [ADR-002](docs/decisions/ADR-002-dual-session.md). This implementation addresses [issue #3](https://github.com/johndobry89/SeatBuddy/issues/3). Contributing and security guidance remain in [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

Independent third-party tool. Not affiliated with or endorsed by Vue Cinemas. Reservations remain separate and are only final when independently confirmed by Vue.
