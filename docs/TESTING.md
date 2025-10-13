# Testing

## Test Types
- Unit: Jest for API/web packages (`pnpm test:unit`).
- Contract: Validate API responses vs `packages/contracts/openapi.v1.json`.
- Web E2E: Playwright flows under `apps/web/tests`.
- Mobile: Flutter widget/driver tests in `apps/mobile`.

## Local Execution
1. Install deps: `pnpm install` and `flutter pub get` in `apps/mobile`.
2. Unit tests: `pnpm test:unit` (watch mode: `pnpm test:unit -- --watch`).
3. Contract tests: `pnpm test:contracts` after regenerating SDKs.
4. Web E2E: `pnpm test:e2e` (requires dev stack running).
5. Mobile tests: `cd apps/mobile && flutter test` (widget) or `flutter drive --target=test_driver/main.dart`.

## CI Usage
- GitHub Actions workflow **Test All** runs unit + contract + e2e.
- Trigger manual re-run via **Actions → Test All → Run workflow**.
- Mobile driver tests run on dedicated **Mobile Tests** workflow.

## Coverage Targets
- Unit tests: ≥80% statements per package (enforced via Jest config).
- E2E tests: ≥60% critical path coverage (monitored via reports uploaded to CI).
- Investigate regressions if coverage falls below thresholds before merging.
