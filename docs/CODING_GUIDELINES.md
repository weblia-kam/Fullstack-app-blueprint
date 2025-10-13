# Coding Guidelines

- Do not reference Prisma models or `PrismaClient` outside of the adapter layer (`packages/domain-adapters-prisma`). Controllers and services inside `apps/api` must depend on domain services and repository interfaces instead.
- Throw `DomainError` from domain logic when business rules fail so the global `DomainErrorInterceptor` can translate the error into a consistent HTTP response.
- Prefer injecting domain services into NestJS controllers with factory providers so the same code paths can be reused with mocked repositories in tests.
- Keep token signing and verification behind the `TokensService` abstraction. Infrastructure specific utilities (e.g. JWT) should implement the `TokensProvider` interface and be wired up at the module level.
