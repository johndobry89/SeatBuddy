# ADR-001 — Chrome MV3 extension first

**Status:** Accepted as design direction (runtime feasibility NOT_RUN)  
**Date:** 2026-10-20

## Context

Two independent, logged-in Vue Movie Pass sessions may need coordinated guidance in the browser. A standalone PWA cannot directly access the foreign-origin logged-in Vue page's DOM or Chrome tab/session metadata.

## Decision

Start with a **Chrome desktop Manifest V3 extension** using a Vue 3 + TypeScript **Side Panel** and minimal permissions. Treat a future PWA as informational companion rather than a booking engine.

## Consequences

- The extension can implement permission-limited read-only content observation where feasible; exact hosts and selectors remain to be established by G0.
- Side Panel state must be bounded, provenanced and resilient to MV3 service worker suspension.
- Public deployment, a working seatmap adapter and live two-account support are not established by the architecture choice.
- If G0 fails, ship a useful manual-checklist variant.
