# Runbook: Incident Response

## Triage
1. Page on-call and establish incident channel.
2. Gather context: alerts, dashboards, recent deploys.
3. Assign incident commander and scribe.

## Containment
1. If auth breach, disable login endpoints via feature flag.
2. Rotate secrets as per [rotate-secrets.md](rotate-secrets.md).
3. Invalidate refresh tokens and enforce logout.

## Investigation
1. Inspect logs filtered by `x-request-id` and error codes.
2. Review traces for failing spans.
3. Check DB integrity (`pnpm prisma migrate status`, `select count(*) from critical tables`).

## Recovery
1. Apply fix or rollback deployment (see [rollback-migration.md](rollback-migration.md)).
2. Redeploy and monitor metrics until stable.
3. Communicate resolution to stakeholders.

## Post-Incident
1. Capture timeline, root cause, and action items.
2. Create follow-up tickets with owners and due dates.
3. Schedule postmortem review.
