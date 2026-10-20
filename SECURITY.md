# Security Policy

**Pre-release / feasibility stage.** No live Vue integration is currently shipped and there are no confirmed supported versions.

## Reporting

Please avoid posting exploit details, credential material, ticket QR codes, real account identifiers or sensitive logs in public issues. Contact the repository owner privately using GitHub's available contact/security reporting facilities before public disclosure. A dedicated disclosure channel can be added before public release.

## Security boundaries

- Do not store, collect, log or transmit passwords, pass numbers, account emails, authentication cookies, tokens, payment details, ticket QR codes or incognito history.
- Do not bypass authentication, ticket/pass restrictions, CAPTCHAs, rate limits or anti-bot measures.
- Explicit, minimal site access only. Verify message senders and tab origin from browser metadata.
- On mismatched, stale or missing evidence, fail closed to `UNKNOWN` and retain a manual path.
- Never trigger a final booking, payment, cancellation or retry automatically.

See [AGENTS.md](AGENTS.md) for the full development contract.
