# Klaarstaande draft-PR

Base: `feat/issue-23-sprint-10` · Head: `feat/issue-25-sprint-11` · **Create draft pull request**, niets mergen.

Titel: **fix: Sprint 11 Field Trial — reliable ZIP installation, first-run fallback and upgrade evidence**

Kopieer onderstaande body:

---

Implements #25 as a stacked draft on Sprint 10 / PR #24. Delivers **SeatBuddies 0.10.1-test**, a narrow runtime repair and tested owner handoff; no new live booking feature.

Popup recovery now offers the existing normal-window assistant when Side Panel opening is unavailable/rejected even while buddy storage works. Both reproduced missing-button regressions failed before and pass after; keyboard/320px and no false opening success asserted.

Native CI downloads the actual uploaded Actions wrapper, verifies its upload digest, exact two-file shape, inner checksum and reviewed runtime hash before extracting/installing it. Eight packaging regressions cover successful byte preservation and wrong-level/missing-manifest/corrupt/extra-file/oversized/checksum rejection. Existing native action-popup case now tests the short solo/buddy/A-preservation/self-test/diagnosis/ZERO EXTRA card and real normal-window recovery with controlled API-denial injection. New pinned Sprint 10→0.10.1 Chrome reload upgrade checks consent-only retention, no stale status/contexts, stale WORKFLOW refusal, TTL during delayed read and truthful deletion failure with real storage.

Validation: **322 unit/contract, 27 renderer UI, 174 adversarial subset PASS locally**; native local **BLOCKED** by managed policy, never bypassed. Both Linux full ten native and macOS Intel six smoke cases run from the real distributed package in CI. First CI found closed old document in the new upgrade actor; fixed by opening a new document and enabling the documented Chrome developer mode before re-registration, keeping all assertions. Implementation 657584ecfcd6a7860ec6e315d32de41981613e3b [CI 39807089743](https://github.com/johndobry89/SeatBuddy/actions/runs/39807089743) completed **SUCCESS**: Linux 322 unit/27 UI/10 native, macOS Intel 322 unit/27 UI/6 smoke. Both actually passed the upgrade/TTL/deletion-failure scenarios from the downloaded artifact. Later evidence-only head 5fbc282 passed Mac 27 UI/6 smoke but Linux timed out in combined Playwright installation before browser tests; official rerun API was Forbidden. CI now separates bounded system-dependency installation and browser download with one bounded idempotent retry, preserving the ten-minute job bound and all tests. No root cause inferred without raw logs. Only this installer guard and evidence/owner docs follow the tested runtime; the final documentation-head run is checked separately at delivery. Definitive per-commit/platform results: [Sprint 11 Actions](https://github.com/johndobry89/SeatBuddy/actions?query=branch%3Afeat%2Fissue-25-sprint-11) and [delivery evidence](https://github.com/johndobry89/SeatBuddy/blob/feat/issue-25-sprint-11/docs/field-trial-delivery.md). Use only a completed/success final-head run on both platforms; a pending run is not PASS.

Artifact **seatbuddies-chrome-test**, inner **seatbuddies-0.10.1-chrome-test.zip**, SHA256 **3becb7b39b9a0cd3a60ee5f2f71a92300264872024a2341ae22cf69da505d238**. Runtime 28 files/122273 bytes, deterministic rebuild verified; root MV3 manifest, icons/full MIT notices, exact sidePanel/storage and unchanged CSP, no Vue host or content script. [Mac 5–8 minute card](https://github.com/johndobry89/SeatBuddy/blob/feat/issue-25-sprint-11/docs/macos-test-guide.md) retains the detailed appendix and now has one minimal sanitized report, precise extraction/update/stop instructions.

Human Mac/Windows/arm64/VoiceOver/Chrome 116/Finder acceptance **NOT_RUN**. Automated Intel Mac is separate. G0 live Vue **NO-GO/INCONCLUSIVE**; no real accounts, pass data, checkout, reservations, payments or cancellation. Optional nicknames/concept-only retention boundaries unchanged. [Critical selfreview](https://github.com/johndobry89/SeatBuddy/blob/feat/issue-25-sprint-11/docs/security-review-sprint11.md) documents evidence and limitations; no independent audit claim.

**Leave DRAFT. Merge/deploy/release/Store/publication NOT_AUTHORIZED.** No existing PR retargeted or merged. After owner FAIL: fictional reproduction → focused regression issue → smallest patch → affected/full CI → repeat that human step. No telemetry or automatic issue creation.
