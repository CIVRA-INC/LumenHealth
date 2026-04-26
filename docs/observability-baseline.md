# Observability Stack Baseline

This document defines the three pillars of observability for LumenHealth and the tool choices for each layer.

## Pillar 1: Logs

**Tool:** `pino` (Node.js services) or `winston` (where pino is unavailable)

- All logs must be structured **JSON** — no plain-text log lines.
- Required fields per log entry: `timestamp`, `level`, `service`, `traceId`, `message`.
- Log levels: `fatal`, `error`, `warn`, `info`, `debug`, `trace`.
- Logs are shipped to a central aggregator (e.g., Loki or CloudWatch Logs) for querying.

### Alert Thresholds (Logs)
| Condition                        | Threshold         | Severity |
|----------------------------------|-------------------|----------|
| Error rate spike                 | > 5% of requests  | P1       |
| Fatal log emitted                | Any occurrence    | P0       |
| Repeated 5xx within 1 min       | > 10 occurrences  | P1       |

## Pillar 2: Metrics

**Tools:** `Prometheus` (collection) + `Grafana` (visualization)

- All services expose a `/metrics` endpoint in Prometheus exposition format.
- Use the official Prometheus client library for Node.js (`prom-client`).
- Key metrics to instrument: request rate, error rate, latency (p50/p95/p99), queue depth, DB connection pool usage.

### Alert Threshold Examples
| Metric                     | Threshold        | Severity |
|----------------------------|------------------|----------|
| HTTP p99 latency           | > 2000 ms        | P1       |
| Error rate                 | > 1% over 5 min  | P1       |
| DB pool exhaustion         | > 90% utilised   | P2       |
| Memory usage               | > 85% of limit   | P2       |

### Dashboard Naming Conventions
- Format: `[Team] – [Service] – [Category]`
- Examples:
  - `Platform – API Gateway – Traffic`
  - `Platform – Auth Service – Errors`
  - `Data – MongoDB – Performance`
- Dashboards must be version-controlled as JSON in `infra/grafana/dashboards/`.

## Pillar 3: Traces

**Tool:** `OpenTelemetry` (OTel SDK for Node.js) + compatible backend (Jaeger or Tempo)

- All inbound HTTP requests and outbound calls (DB, external APIs, message queue) must be instrumented with spans.
- Trace context is propagated via W3C `traceparent` headers.
- The `traceId` field from the active span must be injected into every log entry for correlation.
- Sampling strategy: 100% in development/staging; 10% in production (head-based), with tail-based sampling for errors.

### Alert Threshold Examples
| Condition                         | Threshold        | Severity |
|-----------------------------------|------------------|----------|
| Span error rate                   | > 2% over 5 min  | P1       |
| Trace duration (critical path)    | > 5 s end-to-end | P2       |
