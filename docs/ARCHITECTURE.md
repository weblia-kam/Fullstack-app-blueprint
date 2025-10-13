# Architecture

## Layering
- Controller (NestJS/Next.js API route) → Domain Service (business logic) → Repository Interface (port) → Prisma Adapter (implements repository) → PostgreSQL database.
- Web and mobile clients use generated SDKs; shared DTOs live in `packages/contracts`.

## Login / Refresh Sequence
1. Client submits credentials to `/api/v1/auth/login`.
2. Controller validates payload, calls AuthService.
3. AuthService verifies user via UserRepository and issues tokens via TokenService.
4. Tokens stored in secure cookies (web) + refresh record persisted via Prisma.
5. Client uses access token for API requests.
6. On expiration, client calls `/api/v1/auth/refresh` with refresh cookie.
7. AuthService validates rotation, revokes old token, issues new pair.

## ADR References
- [docs/ADRS/0001-auth-model.md](ADRS/0001-auth-model.md)
- [docs/ADRS/0002-storage-choice.md](ADRS/0002-storage-choice.md)
