# Testing strategy

This blueprint ships with a multi-layer test regime that exercises the platform across API, web, and mobile surfaces. The suite is organised so that every layer can be executed in isolation, runs deterministically in CI, and produces actionable coverage reports.

## Test types and locations

| Layer | Technology | Location | Notes |
| --- | --- | --- | --- |
| API unit | Jest (`ts-jest`) | `apps/api/test/unit` | Mocks persistence and token providers to cover domain logic, including registration, credential validation, and token refresh flows. Enforces ≥80% coverage. |
| API contract | Jest + `jest-openapi` | `apps/api/test/contract` | Spins up a lightweight NestJS instance, stubs external dependencies, and validates responses against `packages/contracts/openapi.v1.json`. |
| Web E2E | Playwright | `apps/web/tests/e2e` | Browser tests for login and CSRF protection with mocked backend responses. Target ≥60% coverage of critical journeys. |
| Mobile | Flutter widget & integration tests | `apps/mobile/test` | Widget driver test for the login flow and API client refresh logic, plus secure storage unit coverage. |

CI runs all four layers via `pnpm` and uploads coverage artefacts for auditing.

## Running tests locally

```bash
# API unit tests with coverage
pnpm test:unit

# API contract validation
pnpm test:contract

# Web end-to-end tests (spins up Next.js automatically)
pnpm --filter web test:e2e

# Mobile tests
cd apps/mobile
flutter test
```

Unit tests emit coverage reports to `apps/api/coverage/unit` (text summary + LCOV). The Playwright run writes HTML results to `apps/web/playwright-report`; open with `npx playwright show-report apps/web/playwright-report` to inspect run coverage.

## How contract tests work

The contract suite boots NestJS in-memory, overrides Prisma, JWT, and domain services with deterministic stubs, and asserts that `/auth/login`, `/auth/refresh`, and `/me` responses satisfy the OpenAPI schema. `jest-openapi` provides the `toSatisfyApiSpec` matcher so any schema drift is caught immediately. The workflow makes the spec available via `packages/contracts/openapi.v1.json` and injects it into the matcher before each run.

## Adding tests for new functionality

1. **Unit** – place new service tests under `apps/api/test/unit`. Mock external collaborators (repositories, mailers, token providers) and keep expectations focused on domain behaviour. Extend coverage thresholds if you add new critical modules.
2. **Contract** – update `apps/api/test/contract/openapi-contract.spec.ts` when new endpoints land. Import the OpenAPI schema, issue `supertest` calls against the bootstrapped app, and assert `toSatisfyApiSpec()`.
3. **Web E2E** – create Playwright specs under `apps/web/tests/e2e`. Use `browserContext.route` to stub backend calls, keep tests idempotent, and assert both network and UI outcomes. Add routes to the Playwright config if additional services need to be spawned.
4. **Mobile** – add widget or driver tests beside `auth_test.dart` for new flows. Prefer fake `HttpClientAdapter`/`SecureKeyValueStore` implementations over hitting the network, and assert navigation plus storage effects.

Follow these conventions to ensure new modules maintain the 80% (unit) and 60% (E2E) coverage baselines and remain CI friendly.
