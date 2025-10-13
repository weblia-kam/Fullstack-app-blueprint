# ADR 0001: Authentication Model

## Status
Accepted

## Context
- Web clients require CSRF protection and seamless refresh handling.
- Mobile clients cannot rely on browser cookies and need bearer tokens for API calls.

## Decision
- Use cookie-based authentication (HttpOnly, Secure) for web to leverage same-site protections and refresh rotation.
- Expose bearer token endpoints for mobile apps with secure storage of tokens.
- Maintain shared token issuance logic with rotation and revocation across channels.

## Consequences
- CSRF middleware required for cookie sessions; mobile clients bypass via Authorization header.
- Logout must clear cookies and revoke refresh tokens.
- Documentation must highlight different storage strategies (see [docs/SECURITY.md](../SECURITY.md)).
