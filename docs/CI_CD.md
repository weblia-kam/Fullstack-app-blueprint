# CI/CD Workflows

The project uses GitHub Actions to enforce consistent quality checks on every push and pull request. Three core workflows are required to pass before changes can merge into `main`:

## Workflows Overview
- **Lint & Format (`.github/workflows/lint.yml`)**
  - Runs ESLint and Prettier checks across all JavaScript/TypeScript sources.
  - Validates Dart formatting for the mobile app.
  - Executes on every `push` and `pull_request` event.
- **Build Verification (`.github/workflows/build.yml`)**
  - Installs dependencies and builds the API, web app, shared domain packages, and mobile app.
  - Publishes build artifacts (API dist, Next.js output, and domain package dist) for inspection or download.
  - Executes on every `push` and `pull_request` event.
- **Test All (`.github/workflows/test-all.yml`)**
  - Runs unit, contract, and end-to-end tests across the stack.
  - Uploads coverage and Playwright reports for auditing.
  - Executes on every `push` and `pull_request` event.

## Caching Strategy
Each workflow uses the GitHub Actions cache to speed up dependency installation:
- **pnpm dependencies**: Caches `~/.pnpm-store` and `node_modules` keyed by the hash of all `pnpm-lock.yaml` files.
- **Flutter/Dart dependencies**: Caches `~/.pub-cache` keyed by the `pubspec.lock` hash.
- Restoring caches significantly reduces CI execution time for incremental runs (targeting under three minutes).

## Build Artifacts
The Build Verification workflow publishes a `dist-artifacts` archive containing:
- `apps/api/dist`
- `apps/web/.next`
- `packages/domain/dist`

Artifacts can be downloaded directly from the workflow run summary under the **Artifacts** section for validation or deployment.

## Branch Protection
To enforce repository policy:
1. Protect the `main` branch via **Settings → Branches → main → Protect**.
2. Require pull requests with at least one approving review.
3. Require status checks to pass before merging and select `Lint & Format`, `Build Verification`, and `Test All`.
4. Enforce up-to-date branches and squash merges. Signed commits are recommended.

Detailed policy requirements are documented in `docs/REPO_RULES.md`.

## Running CI Checks Locally
Developers can rehearse GitHub Actions locally using the [`act`](https://github.com/nektos/act) CLI:
1. Install `act` (e.g., `brew install act` or download from the releases page).
2. From the repository root, run commands such as:
   - `act pull_request -j lint`
   - `act pull_request -j build`
   - `act pull_request -j unit`
3. Provide necessary secrets or service containers as needed for end-to-end tests.

Running these commands before pushing changes ensures parity with the GitHub Actions environment.
