# Security Operations

## Required Secrets
- `JWT_SECRET`: HMAC signing key for access tokens.
- `COOKIE_SECRET`: Encryption/signature for session cookies.
- `ENCRYPTION_KEY`: 32-byte key for at-rest sensitive fields.
- `COOKIE_DOMAIN`: Shared domain for web cookies (prod uses apex domain).
- `API_CORS_ORIGINS`: Comma-separated list of allowed origins.

## Cookie Policy
- Authentication cookies are `HttpOnly`, `Secure`, `SameSite=Strict` (fallback `Lax` for OAuth redirect flows).
- Path: `/`; Domain uses `COOKIE_DOMAIN` env.
- Non-HttpOnly CSRF cookie: `SameSite=Lax`, `Secure` in prod.

## CSRF Flow
- API sets `XSRF-TOKEN` non-HttpOnly cookie.
- Clients send matching `x-csrf-token` header on state-changing requests.
- Native/mobile apps bypass CSRF by using `Authorization: Bearer <token>` headers only.

## CORS Configuration
- API reads `API_CORS_ORIGINS` and rejects requests whose `Origin` is missing from the allowlist.
- Update the env var during deployments to add/remove origins.

## Token Handling
- Access tokens short-lived; refresh tokens rotated on each refresh call.
- Refresh token rotation persists last valid token hash; revoked tokens are denied on reuse.
- Web stores tokens in secure cookies; mobile stores tokens in platform secure storage (Keychain/Keystore).

## Incident Response Checklist
1. Rotate `JWT_SECRET`, `COOKIE_SECRET`, and `ENCRYPTION_KEY`.
2. Trigger forced logout by clearing refresh token table or versioning session secrets.
3. Revoke active tokens and invalidate caches.
4. Update `API_CORS_ORIGINS` if origin compromise suspected.
5. Redeploy services with new secrets.
6. Document incident and follow [docs/RUNBOOKS/incident-response.md](RUNBOOKS/incident-response.md).
