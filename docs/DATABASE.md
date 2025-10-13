# Database Change Management

## Migrate deploy vs. db push
`prisma migrate deploy` applies versioned SQL migrations that have been reviewed and committed to the repository. This guarantees that every environment (local, CI, staging, production) shares an identical schema history and that rollbacks can be reasoned about from git. The command refuses to run when migrations are missing or diverge, which protects us from accidental drift.

`prisma db push` skips migrations and force-syncs the schema directly against the database. While convenient during early prototyping, it can drop columns or constraints without warning, produces no history, and offers no built-in rollback story. It is therefore disabled for CI and production workflows.

## Rollback procedure
1. Take a physical backup or snapshot before deploying (`pg_dump`, managed backup, etc.).
2. If a deployment must be reverted, restore the backup.
3. Inform Prisma about the rollback so that subsequent deployments remain in sync:
   ```bash
   npx prisma migrate resolve --rolled-back "20251013000000_init_audit_fields"
   ```
   Replace the migration name with the identifier that was reverted.
4. Re-run `npx prisma migrate deploy` to ensure the environment matches the target revision.

## Using audit fields in queries
Audit metadata enables filtering and ordering by change history. Example:
```sql
SELECT "email", "updatedAt", "updatedBy"
FROM "User"
WHERE "updatedAt" >= NOW() - INTERVAL '7 days'
ORDER BY "updatedAt" DESC;
```
This query returns recently modified users and lists who performed the update, making it straightforward to build activity feeds or compliance reports.
