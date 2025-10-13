# Runbook: Rollback Migration

## Preconditions
- Identify migration ID: `pnpm prisma migrate status`.
- Confirm backup availability (managed backup timestamp or manual `pg_dump`).

## Steps
1. Put app in maintenance (Traefik middleware or feature flag).
2. Restore DB: `psql $DATABASE_URL < backup.sql` (or use cloud restore workflow).
3. Mark migration rolled back: `pnpm prisma migrate resolve --rolled-back "<migration_id>"`.
4. Deploy previous application image/tag.
5. Run smoke tests: `curl -k https://api.localhost/health` and key user flows.
6. Re-enable traffic and monitor metrics/logs.

## Post-Rollback
1. Create incident report with root cause.
2. Plan forward fix before redeploying new migrations.
