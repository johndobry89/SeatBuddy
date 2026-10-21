# ADR-004 — Explicit reconnection and temporary diagnostics

**Status:** Accepted for Sprint 03. **Date:** 2026-10-21.

## Context

The memory-only coordinator intentionally loses claims on worker restart. Sprint 02's panel stayed in local fallback after a failed browser call, without an explicit reconnect path. A delayed response or an old worker still holding state must not silently resurrect earlier self-reports. Temporary state may be shared by more than one panel.

## Decision

Each coordinator instance has a random, ephemeral generation identifier. The strict snapshot protocol carries it solely to detect worker replacement; it is not account identity, persistent tracking or live evidence. A changed generation replaces the snapshot and explains that the user must review the plan/roles again.

Bound transport waits to four seconds. A timeout or invalid reply clears displayed remote claims and enters the independent local manual fallback. No command queue or transaction executor exists. At the worker boundary, an authenticated, schema-valid RESET synchronously advances a reset epoch; earlier requests still awaiting Chrome APIs are rejected before they can mutate state or refill context choices. A foreign/fixture reset cannot advance this barrier. Late replies cannot restore the snapshot. Explicit **reconnect and clear temporary data** sends only RESET, discarding remote and local drafts rather than merging uncertain states. This resets all panels using the shared coordinator, as explained in the UI/guide. Failed reconnection preserves the current local draft.

Diagnostics are an explicit user-triggered, strict allowlist projection: version, capability booleans, permission-scope classification, consent, mode and evidence classes. No manifest dump, generation identifier, plan, tab/window ID, URL/title, account data or Error contents enter the report. It is displayed temporarily, not logged, persisted or uploaded.

## Consequences

User-authored drafts may need re-entry after a failure; safety and comprehensible recovery take precedence over persistence. Ordinary worker wake-up with the same in-memory instance is not misreported as a reset. No new Chrome permission, live adapter or change to spanning is introduced. Unit tests cover late/hung replies, explicit reconnect/reset, failed reconnect, malformed replies and worker generations; UI and real-extension tests cover the corresponding visible recovery where the browser permits it. Exact results remain in the evidence register.
