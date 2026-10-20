# ADR-002 — Investigate normal + incognito dual sessions

**Status:** Hypothesis requiring G0 testing (NOT_RUN)  
**Date:** 2026-10-20

## Context

Normal Chrome tabs generally share the same cookie jar, making independent logins difficult in a single profile. Chrome incognito separates session cookies, but extension access requires explicit opt-in and spanning/split modes have different lifecycles and communication.

## Candidate decision

Experiment with **one normal tab (A), one incognito tab (B), and `incognito: "spanning"`**. Use only browser-supplied `tabId`/`windowId`/`incognito` provenance and explicit user role choice. Do not read credentials, cookies, identifying account details or payment data. Do not persist incognito booking state to Chrome shared storage.

## Validation criteria

Verify actual Chrome opt-in, A/B tab identity, per-tab messages and sender validation, service worker restart recovery, and whether a practical Side Panel UX can coordinate both contexts. Record reproducible environment and evidence in `docs/feasibility.md`.

## Failure path

If isolation, consent or status provenance cannot be safely proven, do not fake multi-login support; fall back to separate guided/checklist operation. `split` is not silently substituted for `spanning`.
