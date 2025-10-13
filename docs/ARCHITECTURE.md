# Architecture Overview

The blueprint is organised as a pnpm monorepo containing the following top level projects:

- **apps/web** – Next.js front-end.
- **apps/mobile** – Flutter mobile client.
- **apps/api** – NestJS HTTP API.
- **packages/db** – Prisma schema and tooling for the PostgreSQL database.
- **packages/contracts** – Generated OpenAPI contracts and SDK sources.
- **packages/domain** – Pure TypeScript domain logic and interfaces.
- **packages/domain-adapters-prisma** – Prisma backed implementations of the domain repositories.

## Backend layering

The backend follows a hexagonal style layout. Controllers only depend on domain services and never talk to Prisma directly. Repositories are expressed as interfaces in the domain layer and resolved to specific persistence adapters at runtime.

```
Controller (NestJS)
        ↓
Domain Service (packages/domain)
        ↓
Repository Interface (packages/domain)
        ↓
Prisma Adapter (packages/domain-adapters-prisma)
        ↓
PostgreSQL (packages/db)
```

Benefits of this layout:

- **Testability** – domain services can be unit tested by mocking repository interfaces. API tests can stub the domain services without needing a database.
- **Swapability** – infrastructure concerns live in adapters, so a different datastore can be added by creating a new adapter that implements the same repository interface.
- **Consistency** – domain errors surface as `DomainError` instances and are translated to consistent HTTP responses via the global `DomainErrorInterceptor`.

## Domain services

`packages/domain` contains plain TypeScript classes and types:

- `DomainError` – a structured error with a code and optional metadata used by the API layer when mapping responses.
- `UsersService` – encapsulates user related use-cases such as profile lookup, registration and profile updates, operating purely on repository interfaces.
- `TokensService` – wraps token signing and verification logic behind an infrastructure-agnostic provider so that the API can switch token implementations without touching business rules.

All exports are aggregated from `packages/domain/src/index.ts` to keep import paths tidy (`import { UsersService } from "@org/domain"`).

## Persistence adapters

`packages/domain-adapters-prisma` provides Prisma-based implementations of the domain repositories. The adapter owns the Prisma client lifecycle (`getPrisma`) and performs mapping between Prisma models and the domain entities. This package is the only place where Prisma types and queries live.

An integration test spins up a temporary PostgreSQL instance using Testcontainers to verify the adapter behaviour against a real database.

## API integration

The NestJS API consumes the domain services by registering them as providers with custom factories. For example, `UsersModule` binds the `UsersService` from the domain to the Prisma-backed `UsersRepository` implementation, while the `AuthModule` exposes a `TokensService` backed by JWT utilities.

`DomainErrorInterceptor` is registered globally in `main.ts` so that any `DomainError` thrown from domain logic is converted into a consistent JSON payload with sensible status codes (404 for `USER_NOT_FOUND`, 409 for `DUPLICATE_RESOURCE`, etc.).

This separation keeps controllers thin, improves the ability to mock dependencies in tests, and ensures infrastructure details do not leak into the HTTP layer.
