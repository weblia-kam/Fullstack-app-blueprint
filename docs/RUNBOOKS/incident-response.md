# Incident Response Runbook

Use this checklist when investigating production incidents for the Blueprint API.

## 1. Capture context
- Record the time of the incident, impact, and affected endpoints/users.
- Determine the `x-request-id` if the issue was triggered by a specific call (grab from client logs, API response headers, or load balancer traces).

## 2. Collect logs
- Retrieve Pino logs from the logging platform (or application host) for the relevant time window.
- Filter by `requestId=<value>` to scope to the failing request.
- Confirm that sensitive details remain redacted; escalate if raw secrets are observed.

## 3. Check metrics
- Query Prometheus for HTTP status spikes:
  - `sum(rate(http_requests_total{status=~"5.."}[5m]))` for errors.
  - `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))` for latency.
- Review Node.js process metrics (memory, event loop lag) to identify resource exhaustion.

## 4. Inspect traces
- Search the tracing UI for the captured `request_id` attribute.
- Validate span timing (database calls, downstream services) and note any long or failed spans.
- Ensure OTLP exporter is connected (collector logs should show received spans).

## 5. Correlate and mitigate
- Use the intersection of logs, metrics, and traces to identify the failing component.
- Roll back recent deployments or disable problematic features if needed.
- Communicate with stakeholders and update the incident channel.

## 6. Post-incident
- File a detailed incident report including timeline, root cause, and action items.
- Add detection/alerting improvements based on the gaps observed.
- Schedule follow-up tasks in the backlog.
