# Local Chrome verification — fictional data only

Use a desktop Chrome 116+ profile where unpacked extensions are permitted. Do not alter managed browser policy to run this test. These steps do not require or permit any real Vue account, production checkout or purchase.

1. Run `npm ci` and `npm run check`; load `dist/` through **Load unpacked**. Record OS, browser version, Git commit, extension ID/version and time with timezone.
2. Click the extension action. Confirm that the actual Side Panel opens, the disclaimer is visible and A/B initially show `UNKNOWN`.
3. Start the matching simulation. Confirm the five fictional showtime fields match and F10/F11 are marked **mock** neighbours. Advance A alone through review and simulated completion. B must remain unchanged, and neither session may show a real `CONFIRMED` state.
4. Run mismatch, aisle, partial-failure and stale scenarios. Confirm the separate statuses, conservative match/adjacency results and next-step guidance. Wait 60 seconds; expired evidence must become `UNKNOWN`.
5. Reset to manual mode. Tick A's checklist; B and both observed statuses must remain unchanged. Reload the panel; checklist entries must not persist.
6. Open the packaged fictional page. Bind A in a normal tab and send a fictional observation. Confirm only A updates. Reload/close that tab; A must become `UNKNOWN`.
7. Without incognito opt-in, attempt B binding in a normal tab: it must fail. If browser policy permits, explicitly opt in, open the packaged fixture URL in an incognito window, bind B and send a fictional observation. Record actual `tabId`, `windowId`, `incognito` and role provenance only; never record identity/account data. B cannot bind in a normal window and A cannot bind in incognito.
8. Inspect Side Panel behaviour separately in each window; record missing/unsupported placement honestly. Do not infer account isolation or live-site support from fictional events.
9. Revoke incognito permission and verify B evidence disappears; rebind explicitly if permission is later restored. Stop the extension worker through Chrome's extension service-worker tools, reopen the panel, and verify both statuses reset without any repeated action.
10. Inspect extension permissions, network activity and storage: only `sidePanel`, no external requests or persistent session/checklist data. Record actual outcomes and any browser limitation in `docs/feasibility.md`.

The smallest separate G0 step is a human review of current Vue terms and allowed interaction scope, followed only by expressly permitted, read-only manual observation. G1 mocks never establish G0, successful bookings, two-account isolation or actual seat availability.
