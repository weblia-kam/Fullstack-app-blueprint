# Runbook: Rotate Secrets

1. Inventory secrets to rotate: `JWT_SECRET`, `COOKIE_SECRET`, `ENCRYPTION_KEY`, `COOKIE_DOMAIN`, third-party creds.
2. Generate replacements using organization-approved secret manager (`smctl generate --length 64`).
3. Update platform secret store (GitHub, cloud runtime) with new values, keeping old ones until deploy.
4. Create `.env` updates for local/prod-sim and distribute securely.
5. Deploy API/web services with new secrets (staged rollout).
6. Validate login flow, cookie issuance, and API calls.
7. Purge old secrets from secret manager and audit logs.
8. Record rotation date, operator, and validation steps in incident log.
