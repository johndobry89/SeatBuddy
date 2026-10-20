# SeatBuddy 🎬

**SeatMates** (working product name) — *One movie. Multiple passes. Two independent bookings. No false promises.*

An independent, privacy-first, open-source **Chrome desktop companion** concept for two legitimate Vue Movie Pass holders. Its goal is to help users navigate separate sessions for the same screening and, when verifiable, adjacent seats, while keeping each booking independent and under the user's control.

> **Status: DESIGN / PRE-FEASIBILITY.** No working extension, live Vue integration, tested two-account flow or booking guarantees currently exist. The GitHub repository is named `SeatBuddy`; the supplied product specification uses the working name `SeatMates`. Branding is still undecided.

## Start here

1. **[AGENTS.md](AGENTS.md)** — mandatory engineering and safety rules for Codex and other contributors.
2. **[SEATMATES_MASTERPLAN.md](SEATMATES_MASTERPLAN.md)** — authoritative product specification, safety invariants, architecture and G0–G5 gates.
3. **[CODEX_BUILD_BRIEF.md](CODEX_BUILD_BRIEF.md)** — first actionable Codex assignment (local mock-driven Chrome extension skeleton).
4. **[docs/feasibility.md](docs/feasibility.md)** — evidence log: no live Vue account or checkout testing yet.
5. **[docs/decisions/ADR-001-extension-first.md](docs/decisions/ADR-001-extension-first.md)** and **[ADR-002-dual-session.md](docs/decisions/ADR-002-dual-session.md)** — architecture decisions and outstanding assumptions.

## Planned technology

Chrome desktop, Manifest V3, Side Panel, Vue 3, strict TypeScript, Vite or a compatible MV3 toolchain, Vitest and local Playwright mock tests. **The actual implementation and dependency versions have not been selected or installed yet.**

## Non-negotiable boundaries

- Two people and two valid, independent accounts; never share or bypass subscription credentials.
- **No autonomous booking, payment, cancellation, CAPTCHA bypass, private Vue API imitation or seat-hold manipulation.**
- Real confirmation states must be evidenced separately by Vue for A and B. Missing or stale data means `UNKNOWN`, not success.
- No backend, analytics, credentials, cookies, personal identities or ticket data stored or transmitted by this project.
- User-initiated Chrome permissions, minimal host permissions, fail-closed behavior and a usable manual fallback.
- No claims of Vue Cinemas endorsement or affiliation.

## Contributing and safety

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) and [LICENSE](LICENSE). Before a public release, check brand conflicts, actual Vue terms, Chrome Web Store policy and third-party assets/dependencies.

## Important disclaimer

*Independent third-party tool. Not affiliated with or endorsed by Vue Cinemas. Reservations remain separate and are only final when independently confirmed by Vue.*
