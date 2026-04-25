# Request Tracing Strategy

> Version: 1.0.0 — CHORD-017
> Owner: Backend Platform
> Review trigger: new transport layer (WebSocket, queue, gRPC), change to correlation ID format, or observability tooling swap

---

## Purpose

This document defines how correlation IDs are generated, attached, and propagated across HTTP requests, server-sent events (SSE), and background jobs in LumenHealth. Consistent tracing makes it possible to reconstruct the full lifecycle of any operation across logs, audit records, and error reports.

---

## Correlation ID

### Format

A correlation ID is a UUID v4 string, e.g. `3f2504e0-4f89-11d3-9a0c-0305e82c3301`.

- Generated fresh for every inbound HTTP request that does not already carry one.
- Accepted from the client via the `X-Correlation-Id` request header (optional).
- Returned to the client on every response via the `X-Correlation-Id` response header.

### Generation Rules

1. If the inbound request includes a valid `X-Correlation-Id` header (UUID v4 format), use it as-is.
2. Otherwise, generate a new UUID v4 at the middleware layer.
3. Never trust a client-supplied ID for security decisions — it is for tracing only.

---

## HTTP Layer

### Middleware (`apps/api`)

A single `correlationId` middleware must run before all route handlers and after the body parser. It is registered in `apps/api/src/app.ts`.

```ts
// apps/api/src/middleware/correlation-id.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers['x-correlation-id'];
  const correlationId =
    typeof incoming === 'string' && uuidValidate(incoming) ? incoming : uuidv4();

  req.context = { ...req.context, correlationId };
  res.setHeader('X-Correlation-Id', correlationId);
  next();
}
```

### Request Context

`req.context` is the single object that carries per-request metadata. It is initialized by the correlation ID middleware and extended by the auth middleware.

```ts
// packages/types/src/request-context.ts
export interface RequestContext {
  correlationId: string;
  userId?: string;
  clinicId?: string;
  role?: string;
}
```

All controllers and services receive `correlationId` through `req.context` — never through function arguments or module-level state.

### Logging

Every log line emitted during a request must include `correlationId`. Use a request-scoped logger created from the base logger:

```ts
const log = logger.child({ correlationId: req.context.correlationId });
log.info('encounter.create.start', { patientId });
```

The global error handler must log `correlationId` alongside every error.

---

## Server-Sent Events (SSE)

SSE connections are long-lived. The correlation ID for an SSE stream is established at connection time and remains constant for the lifetime of the stream.

- The client must pass `X-Correlation-Id` as a query parameter (`?correlationId=<uuid>`) when SSE does not support custom headers in the browser.
- The server validates the format and falls back to a new UUID if invalid.
- All events emitted on the stream include `correlationId` in the event `data` payload.

```ts
// SSE event payload shape
{
  "event": "queue.updated",
  "correlationId": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  "data": { ... }
}
```

---

## Background Jobs

Background jobs (e.g., payment polling, audit log flush, CDS worker) must carry a correlation ID for every unit of work.

- Jobs triggered by an HTTP request inherit the originating `correlationId`.
- Scheduled jobs (cron) generate a new UUID at the start of each execution.
- The correlation ID is included in every log line and any audit log entry the job produces.

```ts
// Scheduled job pattern
async function runPaymentPoller() {
  const correlationId = uuidv4();
  const log = logger.child({ correlationId, job: 'payment-poller' });
  log.info('job.start');
  // ... work ...
  log.info('job.complete');
}
```

---

## Propagation to Downstream Services

When `apps/api` calls `apps/stellar-service` over HTTP, it must forward the correlation ID:

```ts
await axios.post(`${STELLAR_SERVICE_URL}/confirm`, payload, {
  headers: { 'X-Correlation-Id': req.context.correlationId },
});
```

`apps/stellar-service` must accept and log the forwarded ID using the same middleware pattern.

---

## Audit Log Integration

Every audit log entry must include `correlationId`:

```ts
await auditLog({
  action: 'encounter.create',
  clinicId,
  resourceId: encounter.id,
  correlationId: req.context.correlationId,
});
```

This allows a full audit trail to be reconstructed from a single correlation ID across all log sinks.

---

## Observability Checklist

- [ ] `correlationId` middleware registered before all routes in `apps/api/src/app.ts`
- [ ] `X-Correlation-Id` returned on every HTTP response
- [ ] All log lines include `correlationId`
- [ ] SSE events include `correlationId` in payload
- [ ] Background jobs generate or inherit a `correlationId`
- [ ] Downstream HTTP calls forward `X-Correlation-Id`
- [ ] Audit log entries include `correlationId`
- [ ] Global error handler logs `correlationId`

---

## Review Checklist

When adding a new transport or job type:

- [ ] Confirm correlation ID is generated or inherited at entry point
- [ ] Confirm it is propagated to all downstream calls
- [ ] Confirm it appears in all log lines for that transport
- [ ] Update this document if the propagation pattern changes
