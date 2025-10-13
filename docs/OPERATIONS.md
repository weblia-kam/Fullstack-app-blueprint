# Operations Runbook

## Database Backup and Rollback Strategy

To maintain data integrity across development, staging, and production, follow these steps for every deployment and potential rollback scenario.

### 1. Pre-deploy Backups

Always create a compressed backup of the database before applying new migrations:

```bash
pg_dump -Fc -f backup_$(date +%Y%m%d%H%M%S).dump
```

Store backups in a secure, access-controlled location that aligns with your organization's retention policies.

### 2. Rolling Back a Migration

If a migration introduces issues, mark it as applied or rolled back using Prisma's migration resolution commands. Replace the migration name with the identifier of the migration you need to adjust.

```bash
npx prisma migrate resolve --applied "20231012123000_init_audit_fields"
```

To explicitly mark a migration as reverted, use the `--rolled-back` flag instead:

```bash
npx prisma migrate resolve --rolled-back "20231012123000_init_audit_fields"
```

After resolving the migration status, synchronize the database state with your schema history:

```bash
npx prisma migrate deploy
```

### 3. Restoring Data from Backup

If the migration has corrupted or removed data, restore from the backup created earlier. Be sure to target the correct database.

```bash
pg_restore -d <dbname> backup_<timestamp>.dump
```

Verify data integrity post-restore and re-run the application test suite before resuming normal operations.
