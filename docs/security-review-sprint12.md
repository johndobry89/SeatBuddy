# Sprint 12 — defect review and privacy/security boundaries

Review date22 October2026. Scope: S11 `764234ca94fbaafbeaa96281add7182ea704c728` → Operation Reboot. No formal independent security audit or human Mac acceptance implied. Owner report is **USER_REPORTED installed/rendered, UX FAIL**. New version human acceptance NOT_RUN.

## 1. Reproduced polling flicker — repaired at source

S11 `SimulationPanel.vue` used one `busy` flag for its two-second GET_STATE timer and real commands. Every delayed read disabled Start simulatie; the shared stylesheet legitimately made disabled buttons opacity0.6. This also removed keyboard focus. App/useCompanion and popup/useBuddies already separated background reads from mutating busy; the simulation's duplicate client did not.

Executed deterministic Playwright regression on the old implementation, then on the fix. **Before FAIL:** ten delayed poll samples were disabled=true, opacity0.6, focused=false. **After PASS:** all ten disabled=false, opacity1, focused=true. Clock progressed10×2000ms; reads individually withheld then released. Twenty seconds **virtual**, not wall-clock/human Mac. Live-region observer saw0 repeated writes. Follow-up holds a read and actual DEMO reply: actual user submission still disables/dims, then becomes SELECTED, and releasing the older read cannot overwrite it. Test remains exercised behind developer tools, so hiding the simulation is not the repair.

Simulation now reuses `useCompanion`'s validated protocol, bounded four-second transport and latest-operation guard. `isRefreshing` is separate from `isSubmitting`; no CSS masking. Popup/client stale refreshes also recheck operation identity. Vue scope disposal invalidates pending replies and blocks new commands; two added unit regressions stop scopes during reads and verify no late state mutation/retry. Timer cleanup prevents late mount callbacks from re-registering a timer after unmount.

## 2. Default shell and data-preserving optional tools

No runtime command, storage call, form, buddy inference or forced consent in the default shell. Header/one anchor/help/developer disclosure are local resources. Anchor exact HTTPS official homepage, noopener+noreferrer; no user-data query or invented deep link. New tab is **not** a new login context. Help says each person uses own session/profile. No source/status/booking success fabricated.

Developer components lazy mount on first explicit open; closing pauses polling but preserves mounted unsaved fields. Reopening refreshes current worker state, so B epoch/generation guards remain active. Scope/operation guards ignore late responses after unmount. Opening/closing never calls RESET, changes retention consent or promotes a review. Hiding is not an access-control mechanism: unchanged worker sender/projection/normal-context checks remain authoritative. Previous saved data can still be managed/wiped in the developer section, with the existing guarded/error-aware controls.

## 3. Packaging audit caught a build incompatibility — repaired without allowing variable imports

The first actual package failed **Unbounded module import in popup.js**. Lazy Vite8 output uses a **static backtick literal** for its local module import, which TypeScript represents as NoSubstitutionTemplateLiteral, not StringLiteral. The audit now accepts `isStringLiteralLike` at the existing local-path/exact-file checks. It still rejects expressions/interpolation, remote imports, escaping/missing paths. The forbidden-primitive scan now also examines backtick literals (e.g. computed `fetch`). Seven regression cases cover legitimate static target and six forbidden variants. No exception for generated filenames, audit skip, remote code or network primitive.

## 4. Fictional prototype and unchanged hard boundaries

Tiny isolated preset flow reuses strict ZERO EXTRA matcher. No new worker message, storage, external reader, accounts, payment, cancellation or new engine. A and B acknowledgements are independent and labeled fictional; expiry/clock reversal clears both. No candidate equals real availability or fee guarantee. Old negative maps/strict sender/provenance/B isolation/restart/retention tests remain explicitly developer regressions; their clicks are not current product utility metrics.

Manifest stays exactly sidePanel/storage, spanning, no hosts/optional permissions/content scripts/externally connectable/web accessible resources. CSP unchanged: local script, no objects/connections/base. No new dependency or OSS source/assets copied. Notes/clipboard remain allowlisted; no personal owner screenshots/data committed. Fresh package includes original own license and five complete runtime notices. Dependency audit is a tool result, not a complete supply-chain assurance.

## 5. Real packaged Chrome caught intrinsic popup width — repaired, not waived

Initial Linux CI [39860781659](https://github.com/johndobry89/SeatBuddy/actions/runs/39860781659) on5269c77 passed31renderer/9 native but failed2 native cases. The new real action-popup test measured871px document height against600px available: the `width:360px; max-width:100vw` body can feed Chrome's initial tiny popup viewport back into its intrinsic-size calculation. Fixed the popup body's minimum intrinsic width to320px, preserving responsive320/360/420 behavior. Same no-scroll assertion retained; bounds diagnostics strengthened. The mock renderer had a fixed viewport, so it did not expose this browser-owned sizing defect.

The older incognito normal-window recovery test expected the old planner immediately after opening the recovered document. It now explicitly opens Ontwikkelaarstests before asserting the preserved legacy planner/privacy behavior. The new compact default itself was correct in that path. No sender/storage assertion removed. HTML titles also now describe the actual default. Subsequent runtime hash differs; only the current reviewed hash in delivery is installable evidence.

Second Linux CI [39861828658](https://github.com/johndobry89/SeatBuddy/actions/runs/39861828658) confirmed the width fix (335px) but caught fractional auto-height rounding:541px document versus540px native viewport. The compact home's line heights/paragraph margins and the developer summary now use a rem rhythm that produces whole default CSS-pixel layout heights. No overflow hiding, geometry tolerance or removed assertion. Relative sizing still follows the root font.

That run also surfaced an intermittent Playwright “Response object not bound” error during the pinned upgrade test. The test previously navigated an old extension document while runtime.reload tore it down. It now closes only the test panel before reload, waits for a new serviceworker for the exact extension ID, verifies its manifest, then opens a fresh panel. The bound fixture stays open until Chrome reload closes it, so the upgrade's binding-clear assertions remain meaningful. All original consent/storage/generation/replay assertions remain. This repairs the test actor's lifecycle race, not a fabricated production data bug. Subsequent CI establishes whether these corrections pass.

Actual Mac Intel validation on4d01137 now **PASS:31 UI/7 native**, including strict no-scroll popup and lifecycle-based upgrade (run39863097649). Linux stopped before browser tests because the system dependency step exceeded3minutes. CI now pins Ubuntu 24.04, allows5minutes for that one install and15minutes overall; browser-download retry remains bounded and no uncertain apt mutation is replayed. GitHub reported an ubuntu-latest migration, but its relation to the timeout is INCONCLUSIVE. This is an evidence-based runner/time-budget correction, not a guessed package root cause or policy bypass. Final-head CI is checked separately.

**Completed joint validation:** ebfdae8 / [39864149479](https://github.com/johndobry89/SeatBuddy/actions/runs/39864149479) SUCCESS 6m27s. Linux 331 unit / 31 UI / 11 native; Mac Intel 331 unit / 31 UI / 7 native smoke. Both real distributed ZIP checks compare the current fixed 5b4e69b… inner hash, independent of the changed outer wrapper 85eb7945…. Strict popup bounds and fresh-worker upgrade pass on both platforms. No browser policies changed, test removed, geometry tolerance or overflow hiding added. Final documentation-head CI is separately checked at delivery.

## Verification and residual risk

Actual commands, counts, checksum, source SHA and CI conclusions are recorded in [delivery](reboot-delivery.md), not inferred from static review. Local native extension install remains BLOCKED by managed policy; no bypass. Native CI uses its own disposable profile and distributed digest-verified artifact; intercepted official-link intent never fetches live Vue. Mac Intel is the smoke subset, not Apple Silicon/VoiceOver/Finder or real Chrome 116 proof.

**PRODUCT_VALUE NO-GO** despite technical tests: official data/read-only permission absent, real-task comparison HUMAN_NOT_RUN, owner previously rejected administration. G0 remains NO-GO/INCONCLUSIVE. Remaining principal risk is building an unnecessary companion. Stop feature growth pending a lawful useful source. No merges, releases, publication or emails.
