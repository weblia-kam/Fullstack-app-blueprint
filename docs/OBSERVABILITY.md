# Observability

## Logging
- API and web use Pino with JSON output.
- Default levels: `info` in prod, `debug` in dev.
- Sensitive fields redacted via `pino.redact` (`password`, `token`, `authorization`).
- Each request logs `x-request-id`; propagate header from Traefik.

## Metrics
- Prometheus scrapes `/metrics` on API and web via Traefik allowlist.
- Protect endpoint with basic auth in Traefik middleware (`METRICS_USER/METRICS_PASS`).
- Standard exporters expose `http_requests_total`, latency histograms, DB pool stats.

## Tracing
- OTLP endpoint configured via `OTEL_EXPORTER_OTLP_ENDPOINT` and auth headers.
- Sampling: `1.0` in dev, `0.1` in prod unless incident debugging.
- Inspect traces via Tempo/Jaeger UI; filter by `service.name` (api, web, worker).

## Local Stack
1. Launch observability services: `docker compose -f infra/compose-observability.yml up -d`.
2. Expected dashboards: Grafana (http://localhost:3000), Loki logs, Tempo traces.
3. Point API env to local OTLP/Prometheus endpoints when debugging.
