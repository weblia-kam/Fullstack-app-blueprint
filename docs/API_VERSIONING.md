# API Versioning Strategy

The Blueprint API is versioned using URI prefixes. All public endpoints are served under the `/api/v1` namespace and the platform only guarantees backwards-compatible changes inside a given major version.

## Versioning rules

- **Major versions** are encoded directly in the base path (for example `/api/v1`). Breaking changes to request/response contracts or behaviour require a new base path such as `/api/v2`.
- **Minor** and **patch** releases must not introduce breaking changes. New, backwards compatible fields or endpoints can be added under the existing `/api/v1` prefix.
- **Server discovery**: Client applications should read the base path from configuration (`API_BASE_PATH`) rather than hardcoding the version.

## Deprecation workflow

1. Introduce the replacement endpoint under the new version (for example `/api/v2`).
2. Announce the deprecation of the old endpoint and provide a grace period for consumers to migrate.
3. After the grace period, the legacy path (e.g. `/api/v1/...`) should begin returning HTTP `410 Gone` with a payload `{ "error": "API version required. Use /api/v1" }` to signal that the old contract is unavailable.
4. Remove legacy routing once all consumers have migrated.

## Contract management

- OpenAPI documentation is emitted to `packages/contracts/openapi.v1.json` and validated on every build.
- Any contract change must go through the automated SDK pipeline, which publishes a new patch version of `@org/contracts` when the OpenAPI hash changes.
- Client SDKs (`@org/sdk-web`, `@org/sdk-mobile`) re-export the generated helpers from the contracts package to make upgrades seamless.
