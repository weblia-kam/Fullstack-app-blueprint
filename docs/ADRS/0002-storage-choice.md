# ADR 0002: Storage Choice

## Status
Accepted

## Context
- Need relational schema with transactional guarantees for auth, billing, and audit logs.
- Prisma integrates with TypeScript monorepo and provides migrations.
- Hosted Postgres aligns with existing infrastructure and monitoring.

## Decision
- Use PostgreSQL as primary database managed via cloud provider.
- Use Prisma ORM for schema management, migrations, and typed access across services.

## Consequences
- Requires maintaining Prisma migrations in repo and running `prisma migrate deploy` in CI/CD.
- Developers must understand Prisma data model and limitations (e.g., raw SQL for advanced queries).
- Enables reuse of typed client across NestJS and Next.js services.
