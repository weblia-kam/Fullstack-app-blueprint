# Observability Baseline

Blueprint API ships with structured logging, Prometheus metrics, and OpenTelemetry tracing.
This document explains how to enable each capability locally, which environment variables control them, and how to correlate data across signals using the shared `x-request-id`.

## Environment variables

The API uses the following variables (all available in `env.example`):

| Variable | Purpose |
| --- | --- |
| `LOG_LEVEL` | Pino log level (`info` by default). |
| `METRICS_ALLOWLIST` | Comma-separated IP/CIDR ranges allowed to access `/metrics`. |
| `METRICS_USER` / `METRICS_PASS` | Optional Basic Auth credentials for `/metrics`. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP HTTP endpoint for traces (default `http://localhost:4318/v1/traces`). |
| `OTEL_SERVICE_NAME` / `OTEL_SERVICE_NAMESPACE` | Service identity published with spans. |
| `APP_VERSION` | Version attribute added to traces and logs. |
| `OTEL_TRACES_SAMPLER` / `OTEL_TRACES_SAMPLER_ARG` | Sampling strategy and rate (`traceidratio` with `1.0` in dev). |

> Production should typically run with `LOG_LEVEL=warn` or `LOG_LEVEL=info` and reduce `OTEL_TRACES_SAMPLER_ARG` (for example `0.1`).

## Structured logging

- The API uses [Pino](https://getpino.io/) with HTTP middleware.
- Log lines always include:
  - `requestId` generated from the `x-request-id` header (or server generated UUID).
  - Standard fields (`level`, `time`, `msg`, etc.).
  - User and route context when available.
- Sensitive fields are redacted automatically:
  - Authorization headers, cookies, tokens, passwords, refresh tokens, and Set-Cookie response headers.
  - Bodies larger than 1 KB are replaced with `[Truncated]`.
- Use pretty-printing (`pino-pretty`) locally; JSON output is kept in production.

### Searching by request ID

Every response contains an `x-request-id` header. You can grep logs by this ID to follow a single request end-to-end:

```bash
pnpm --filter ./apps/api logs | rg "<request-id>"
```

When you copy the same ID into tracing tools (Tempo/Jaeger/etc.) you will see the correlated span attribute (`request_id`).

## Metrics

- Prometheus metrics are exposed on `GET /metrics` and include:
  - Default Node.js metrics (heap size, event loop lag, etc.).
  - `http_requests_total{method,route,status}` counter.
  - `http_request_duration_seconds_bucket{method,route,status}` histogram (with sum and count).
- Access control:
  - Requests from IPs/CIDRs in `METRICS_ALLOWLIST` are allowed without authentication.
  - Otherwise valid Basic Auth credentials (`METRICS_USER` / `METRICS_PASS`) are required.
  - Requests failing both checks return `401` (missing/invalid credentials) or `403` (blocked IP).
- Metrics middleware automatically skips `/metrics` to avoid recursion and records both successful and failed requests.

## Tracing

- OpenTelemetry NodeSDK exports spans over OTLP/HTTP.
- Auto-instrumentation covers HTTP clients/servers (except `/metrics` to reduce noise).
- Resource attributes include service name, namespace, and version.
- The active span records the `request_id` attribute so you can join traces with logs/metrics.
- Sampling is controlled via the OTEL environment variables listed above.

## Local observability stack

A Docker Compose stack is available under `infra/docker-compose.observability.yml`:

```bash
cd infra
docker compose -f docker-compose.observability.yml up --build
```

Services:

- **OpenTelemetry Collector** (`otel-collector`): receives spans from the API and logs them to stdout.
- **Prometheus**: scrapes `http://host.docker.internal:4000/metrics` every 5 seconds.
- **Grafana**: available at `http://localhost:3001` with default credentials `admin/admin` and a pre-provisioned Prometheus datasource.

Point the API at the collector by setting `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces` (already the default for local development).

## Adding custom metrics

Use the Prometheus providers exported by `MetricsModule`:

```ts
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import type { Counter } from "prom-client";

@Injectable()
class MyService {
  constructor(@InjectMetric("my_counter") private readonly counter: Counter<string>) {}

  handleEvent() {
    this.counter.inc({ event: "foo" });
  }
}
```

Histograms, gauges, and summaries follow the same pattern. Keep label cardinality low, prefer bounded enums, and avoid user-controlled strings.

## Troubleshooting

1. **Missing logs** – ensure `LOG_LEVEL` is not set above the desired verbosity.
2. **Metrics unavailable** – verify your IP matches `METRICS_ALLOWLIST` or supply Basic Auth credentials.
3. **No traces** – confirm the collector is reachable and `OTEL_EXPORTER_OTLP_ENDPOINT` matches the collector URL. Check the API startup log for the configured endpoint.
