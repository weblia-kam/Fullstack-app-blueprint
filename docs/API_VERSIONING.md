# API Versioning

## Strategy
- All public endpoints live under `/api/v1`.
- Contract changes update `packages/contracts/openapi.v1.json` and regenerate SDKs (`pnpm sdk:all`).

## Deprecation
- Mark endpoints as deprecated in OpenAPI and responses before removal.
- When removing, return `410 Gone` with remediation instructions.
- Maintain timeline in release notes and notify SDK consumers.

## Breaking Changes
- Introduce `/api/v2` when breaking fields or semantics are required.
- Maintain v1 and v2 in parallel until clients confirm migration.
- Publish new SDK versions with semantic version bump (major) and migration guide.
