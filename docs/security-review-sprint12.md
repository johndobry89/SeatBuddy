# Sprint12 — defect review and privacy/security boundaries

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

## Verification and residual risk

Actual commands, counts, checksum, source SHA and CI conclusions are recorded in [delivery](reboot-delivery.md), not inferred from static review. Local native extension install remains BLOCKED by managed policy; no bypass. Native CI uses its own disposable profile and distributed digest-verified artifact; intercepted official-link intent never fetches live Vue. Mac Intel is the smoke subset, not Apple Silicon/VoiceOver/Finder or real Chrome116 proof.

**PRODUCT_VALUE NO-GO** despite technical tests: official data/read-only permission absent, real-task comparison HUMAN_NOT_RUN, owner previously rejected administration. G0 remains NO-GO/INCONCLUSIVE. Remaining principal risk is building an unnecessary companion. Stop feature growth pending a lawful useful source. No merges, releases, publication or emails.
