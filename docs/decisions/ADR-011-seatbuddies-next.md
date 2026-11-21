# ADR-011 — SeatBuddies Next: small read-only popup, readable proposal

**Status:** Accepted for an experimental build (owner decision, 21 November 2026). G0 remains INCONCLUSIVE.
**Date:** 2026-11-21
**Supersedes for new work:** the 0.11.x experiment's duo-plan v1 protocol and its hard five-minute TTL. ADR-002 (normal + incognito dual session) is not pursued: incognito is not allowed at all.

## Context

The independent audit of 0.11.11-experimental (branch `fix/issue-48-duo-flow-ux`, `a7a96a3`) found a sound safety core but:

- legitimate film titles (for example "The Secret Garden", "Wild Card", "Lupin") were refused by a keyword list, with a misleading clipboard error;
- the byte-exact JSON plan broke on normal chat artefacts (trailing newline, CRLF, a leading space);
- without a proven screen direction, the list showed page order with overlapping options, and the user could not tell;
- the report could not distinguish "no map" from "map hidden" from "no showing";
- a non-button element next to a pair (possibly a wheelchair space) was not part of the one-seat buffer;
- the product value of the A→B handoff was small compared to one chat message.

The proposal message is only a pointer. B's verdict always comes from B's own live read, so strictness belongs in that read, not in the message's byte format.

## Decision

1. **New, separate app in `app/`.** Plain TypeScript, no runtime dependencies, no framework. Built with esbuild. The 0.11.x code is a knowledge source only.
2. **Minimal rights:** `activeTab` and `scripting` only. No host permissions, content scripts, service worker, storage, network (`connect-src 'none'`) or web-accessible resources. `incognito: "not_allowed"`. The build refuses a manifest that exceeds this.
3. **Separated layers:** `src/reader/vue-adapter.ts` holds every Vue selector and only reads. `src/core/*` holds pure seat, message and comparison logic. `src/popup/*` holds the Chrome calls, runtime validation and UI. The reader is injected as a file, then called in a second injection in the same document (checked via `documentId`).
4. **Readable proposal (protocol v2):** a single chat line, for example `SeatBuddies-voorstel: Ebenezer | Vue Enschede | 22-11-2026 18:40 | Zaal 6 | rij 1 | stoel 9 (verzender) + 10 (ontvanger) | Lux + Lux | gelezen 12:47`, plus one help line.
   - It is tolerant to chat formatting: a prefix, CRLF, NBSP, zero-width marks, letter case.
   - It is strict on content: 8 fields, valid date and time, a known hall pattern and categories, and adjacent numbers.
   - Labels are refused only on structure (URL, e-mail, ≥7-digit run, token-like strings, markup, separators), never on keywords.
5. **No hard expiry.** The age of the proposal is shown as an advisory hint after 10 minutes. Safety comes from B's live check, which is always fresh, not from the sender's clock.
6. **B outcomes** are factual and never a reservation:
   - `FREE`;
   - `PARTNER_SEAT_TAKEN` (B's seat free, partner seat taken; "ask your partner");
   - `MINE_TAKEN`, `MINE_ALREADY_SELECTED`, `PARTNER_SEAT_SELECTED_BY_YOU`;
   - `OTHER_SHOWING` (with the differing fields);
   - `UNSAFE` (with the reason);
   - `UNKNOWN`.
7. **Stricter buffer:** an element next to a pair member that has content, an icon, text or a special class is `MARKED` and rejects the pair. Only an empty spacer or a comment counts as a gap. Taken direct neighbours still reject the pair (deliberate over-exclusion, as in issue #42).
8. **Honest ranking:** "rear and middle first" only when the screen heading is measurably above all seats and covers the middle. Otherwise "order as on the map", said explicitly. Overlapping options are never shown.

## Consequences

- No automatic seat selection, hold, checkout, payment or account action. Product invariants in `AGENTS.md` are unchanged.
- The v1 duo-plan text is not accepted by Next. There is no migration: messages are short-lived.
- Without the extension, the receiver can still read the message and act manually. That is the manual fallback.

## Evidence (21 November 2026)

- `SYNTHETIC_FIXTURE`: 51 unit/UI tests (jsdom).
- Real Chromium (`MOCK_INTEGRATION`): 3 tests. The bundled reader runs on an invented, locally fulfilled page with real CSS geometry (CSS-only aisle, fade, buffer, ranking), and the built popup runs at 360 px within 600 px. Zero requests left the test.
- The unpacked extension loads in Chromium without errors.
- **NOT_RUN:** the native action popup with a real activeTab grant (this container's Chromium closes on opening an action popup), and any live Vue observation, two-person trial, time-saving measurement or booking.

## Failure path

If live observation shows that Vue's markup differs, the read is `UNKNOWN` and the user chooses manually. If the owner's timed trial shows no practical benefit over two tabs plus a chat message, stop building the handoff and keep only the seat finder, or nothing.

## Addendum: two windows on one computer (21 November 2026)

The owner's goal is speed. The fastest legitimate route is two Chrome profiles on one computer, each logged in to its own Vue account, with one Movie Pass booking per account.

- After choosing a pair, A can pick **Copy for the second window** (same computer, clipboard only) or **Copy to send** (chat).
- In the checking window, pasting starts the check immediately.
- Verdict texts are neutral ("this account" / "the other account"). The orange `PARTNER_SEAT_TAKEN` outcome covers the expected case where the first seat was just booked in the other window.

The extension still never asks for, stores or uses credentials, never logs in and never clicks on Vue. It does not work around any Vue restriction on combining Movie Passes. The `AGENTS.md` invariants are unchanged. Whether a single person may operate another person's Movie Pass account is governed by Vue's terms, which remain unverified (see `docs/vue-clarification-draft.md` on the 0.11.x branch).

## Addendum: four clicks with an incognito window (21 November 2026)

At the owner's request, to remove clicks. This changes decision 2 above.

- `incognito` is now `"spanning"` (was `"not_allowed"`). The extension works in an incognito window only after the user enables "Allow in Incognito" in Chrome. The extension stores nothing in any context.
- New permission `clipboardRead`. The clipboard is read only when the popup opens in an incognito window, or on "Gekozen stoelen controleren", and only text containing `SeatBuddies-voorstel:` is used. Other text is ignored and never displayed.
- A normal window searches as soon as the popup opens (read-only, after the icon click). Clicking a pair button chooses and copies in one step: no default choice, and buttons instead of radios, so arrow keys never trigger a copy.
- "Open tweede account (incognito)" calls `chrome.windows.create({ incognito: true })` with Vue's login entry `https://www.vuecinemas.nl/?redirect=%2Fmijn-account`. The owner checked this URL on 2026-11-21.
- Unchanged: no credentials, no login, no clicks or bookings on Vue, no storage or network. The build guard now enforces exactly `activeTab`, `scripting`, `clipboardRead` and `spanning`.
