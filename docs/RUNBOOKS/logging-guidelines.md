# Logging Guidelines

Follow these rules when writing or reviewing log statements for the Blueprint API.

## Do
- Use structured logging (`logger.info({ ... })`) instead of concatenated strings.
- Include `requestId` (available on `req.log` after middleware) when logging inside request handlers.
- Log at the appropriate level:
  - `debug` for detailed diagnostics in development.
  - `info` for lifecycle events (startup, shutdown, key business flows).
  - `warn` for recoverable anomalies that might need follow-up.
  - `error` for failures that impact the request or require alerting.
- Redact or hash tokens/identifiers before logging if they are not already masked by interceptors.
- Add contextual fields (user ID, tenant, route) to help correlation.

## Don't
- Log personally identifiable information (PII), passwords, tokens, secrets, or full cookies.
- Dump large payloads or binary data; truncate or summarize instead.
- Rely on console logging – always use the provided Pino logger.
- Log inside tight loops or performance-critical paths without sampling.
- Forget to handle errors; include stack traces for exceptions to aid debugging.

## Example

```ts
try {
  await this.service.handle(command);
  req.log.info({ requestId: req.requestId, userId: req.user.id }, "Handled command");
} catch (error) {
  req.log.error({ err: error, requestId: req.requestId }, "Command failed");
  throw error;
}
```
