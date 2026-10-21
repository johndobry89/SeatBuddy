# ADR-005 — Temporary buddy names, narrow popup protocol and explicit B reset

**Status:** Accepted for Sprint 04, issue #10. **Date:** 2026-10-21.

## Context

SeatBuddies adds optional friendly nicknames to the existing manual A/B assistant. A nickname is not account identity, a verified subscription or permission to use another person's pass. The toolbar popup must share its selection with the panel without gaining the panel's browser-context/booking-state privileges. Worker loss must continue to forget temporary data.

## Decision

Keep at most twelve optional nickname records and one selected ID **only in coordinator memory**. Start empty. Fictional Sanne/Mark examples are loaded only by an explicit demo action and marked as such. Do not add Chrome storage or any other permission. Ask for short display nicknames only, never account names, email, pass identifiers, passwords or tickets. Normalize/validate at the trusted protocol boundary; Vue renders plain text. Explicit removal/clear and a worker reset delete the records. A complete assistant reset also clears client drafts through a reset-version signal; no nickname restore/replay exists.

Use an exact-origin/frame-checked **popup-only protocol** for nickname reads/mutations. Popup replies contain only nickname records, selection and ephemeral protocol counters/generation, never plans, role progress, tab/window metadata or incognito consent. Popup cannot send panel commands or bind a role. The packaged fictional widget can read only the selected nickname/demo flag; it receives no roster, IDs or other person's observations. The panel retains its existing privileged protocol.

Every nickname mutation includes the expected worker generation and monotonic nickname revision. Reject stale/replayed messages; a complete reset advances revision rather than returning to zero. Keep Sprint 03's synchronous reset barrier for messages awaiting Chrome. A stale client refreshes **only** the view; no mutation is retried.

Every privileged B manual command additionally carries the expected generation and B buddy epoch in a strict B_COMMAND envelope. Selected-buddy changes and full reset advance that epoch. Old/missing epochs and nested A/global commands are rejected, both on receipt and after asynchronous Chrome context/consent queries. An older panel therefore cannot attach an old acknowledgement or binding to a new buddy, even before its next poll. A commands remain independent. The epoch is never included in the popup/widget projection. Full RESET is executed once synchronously, avoiding a second late erase after Chrome's permission promise resolves.

Every change to the selected identity, including renaming or deleting it, requires an explicit confirmation. This rule applies consistently even when there is no plan; the popup need not receive a B-state-dependent signal. The coordinator enforces consent, then clears only B's manual inputs/context/checks and fictional observation. A is untouched. B's UI component remounts when the selected identity changes so unsaved inputs and a previously chosen context cannot survive under the next nickname. Adding/editing an unselected nickname does not reset independent booking tracks. Manual A/B assistance remains available without any nickname.

Configure `action.default_popup = popup.html` and disable automatic panel-on-action behaviour. The popup has an explicit **Open boekingsassistent** button. Resolve the current window before the click; call `sidePanel.open` directly in the user's gesture, before awaiting messaging or browser lookup. Unsupported/denied opening gives a useful normal-window/Chrome-side-panel-menu recovery instruction. No popup-to-page injection or account operation exists.

The companion card is a Vue component on our own packaged fictional page. Reactive fake step changes and `v-if` handle changes/removal without a MutationObserver. Scoped card styles, single mount and serial bounded reads prevent duplicates/leaks; unmount clears the timer and ignores pending replies. This does not demonstrate real-site injection or change G0.

## Consequences

Nicknames disappear on worker restart; this is visible, documented behaviour. They may be personally meaningful, so they are optional, short, deletable, absent from diagnostics/logs/telemetry and never persisted or uploaded. Incognito role state is not exported to the popup. A buddy change is bookkeeping, never account authorization, actual cancellation or booking confirmation.

The current minimum remains Chrome 116 for the shipped user-gesture Side Panel button. Native `action.openPopup()` is used **only by tests on a newer browser**, not by shipped code; ordinary toolbar opening works through the manifest. Native-popup/browser evidence and mocked renderer tests are recorded separately in feasibility. Only sidePanel is requested; all production-site permissions/observers remain disabled.
