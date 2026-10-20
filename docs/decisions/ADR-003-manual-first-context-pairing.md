# ADR-003 — Manual-first assistance and context-only Chrome pairing

**Status:** Accepted for Sprint 02; real account/site observation remains gated

**Date:** 2026-10-20

## Context

Sprint 01's actual unpacked-extension smoke passed on GitHub Actions, while this managed cloud browser forbids extension installation and incognito. These are separate environments. Neither establishes a two-account Vue flow.

The official Chrome documentation source states that a `spanning` extension cannot load packaged extension pages into the main frame of an incognito tab. Thus the old instruction to open `fixture.html` as B in incognito is **NO-GO for that particular test route**. This does not establish that a future allowed content-script event flow or normal-panel observation of Chrome incognito metadata is impossible. We do not substitute `split` or bypass browser policy.

Sources read on 2026-10-20:

- [Official archived incognito documentation source](https://github.com/GoogleChrome/developer.chrome.com/blob/main/site/en/docs/extensions/mv3/manifest/incognito/index.md), including the spanning main-frame restriction and shared `storage.local` / `storage.sync` warning. This is a documentation source, not a runtime test.
- [Current Chromium incognito manifest implementation](https://github.com/chromium/chromium/blob/main/extensions/common/manifest_handlers/incognito_info.cc).
- [Official Side Panel documentation source](https://github.com/GoogleChrome/developer.chrome.com/blob/main/site/en/docs/extensions/reference/sidePanel/index.md): `sidePanel.open()` requires Chrome 116+ and a user gesture.
- [Current Chromium Side Panel API schema](https://github.com/chromium/chromium/blob/main/chrome/common/extensions/api/side_panel.idl): local package path, permission API boundary and explicit user-action opening.

The current rendered Chrome/Vue documentation sites were blocked by this environment's egress proxy. Archived docs and Chromium source establish the cited platform contracts only, not current Vue terms or live DOM permission.

## Decision

Make the Dutch manual planner and independent user acknowledgements the default. They use `MANUAL` provenance, never `CONFIRMED`, and never count as website evidence. A complete five-field match may be shown only as a comparison of explicit user input. Consecutive manual seat numbers are always unverified; no seat hold or actual adjacency is inferred.

Use `chrome.tabs.query({active: true})` only after an explicit list-refresh or binding request (never ordinary status polling) to list minimal browser-supplied tab ID, window ID and incognito flag. A privileged panel may explicitly select one active context per role; the worker rechecks the selection against a fresh Chrome query. No tab titles, URLs, account identity, cookies or page document are read. A normal context can bind A; B requires a Chrome-allowed incognito context. This is **context bookkeeping**, not account binding, origin authorization or a live DOM observer. Since no document is observed, no document identity or live evidence is fabricated.

Actual fictional observations retain their separate exact packaged-origin/frame/document-bound route. Public/seat-map adapter fixtures expose a pure data interface with synthetic selectors only. No production host, guessed Vue selector, live observation state or content script is activated before G0.

Planning fields and progress remain memory-only. Input changes, navigation/closure/replacement/movement of a linked tab, permission revocation, worker restart and 15-minute acknowledgement expiry invalidate the relevant progress. There is no transaction executor or replay mechanism. If browser APIs are unavailable, a separate local manual state provides the same user-input assistance without Chrome contexts; reloading it clears everything.

## Consequences

- Only the existing `sidePanel` permission is required. No new host, tabs, scripting, storage or debugger permission is added.
- The real Chrome test actor can explicitly grant/revoke incognito through Chrome settings in its own disposable profile and inspect a neutral `about:blank` context. It does not alter managed policy or touch accounts.
- Real extension/Side Panel/context tests and renderer transport-double tests remain distinct, with actual outcomes recorded separately.
- Neither this ADR nor a public Vue hyperlink authorizes production-site observation, confirms accounts, or completes G0. An excellent manual assistant is the shipping scope until that evidence exists.
