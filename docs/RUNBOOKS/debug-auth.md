# Runbook: Debug Authentication Issues

## 401 / Invalid Credentials
1. Confirm user exists: `pnpm prisma user:find --email <email>` (or DB query).
2. Check password hashing version; trigger reset if mismatch.
3. Inspect logs for `AuthService` errors with matching `x-request-id`.

## CSRF Failures
1. Verify browser has `XSRF-TOKEN` cookie set.
2. Ensure client sends `x-csrf-token` header that matches cookie.
3. Confirm request origin is allowlisted via `API_CORS_ORIGINS`.
4. For mobile clients, ensure requests use Bearer tokens only (no cookies).

## CORS Errors
1. Reproduce via curl: `curl -H "Origin: https://app.localhost" -I https://api.localhost/api/v1/...`.
2. Check Traefik headers for `access-control-allow-origin`.
3. Update `API_CORS_ORIGINS` and redeploy if origin missing.
4. Inspect browser console for preflight failure details.

## Token Rotation Issues
1. Query refresh token table for user to ensure rotation updated.
2. If multiple active tokens, revoke by deleting entries and forcing logout.
3. Regenerate cookies by logging in and verifying new `Set-Cookie` headers.
