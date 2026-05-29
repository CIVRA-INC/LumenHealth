# Auth Event Taxonomy

Closes #440

## Overview

Auth events are structured records emitted at key points in the authentication lifecycle. They provide a consistent vocabulary for logging, auditing, and observability across all workspaces.

## Event Types

| Event | Trigger |
|---|---|
| `auth.login.success` | Credentials validated, session issued |
| `auth.login.failure` | Invalid credentials or locked account |
| `auth.logout` | Explicit logout by user or system |
| `auth.token.refreshed` | Access token renewed via refresh token |
| `auth.token.expired` | Token TTL exceeded on a protected request |
| `auth.recovery.requested` | Password reset or recovery flow initiated |
| `auth.recovery.completed` | Recovery flow completed successfully |
| `auth.account.locked` | Account locked after repeated failures |

## Shape

```ts
type AuthEvent = {
  type: AuthEventType;
  userId?: string;    // absent on pre-auth failures
  clinicId?: string;
  timestamp: string;  // ISO-8601
  meta?: Record<string, unknown>;
};
```

`meta` carries event-specific context (e.g., `{ reason: "too_many_attempts" }` for `auth.account.locked`).

## Ownership

- `apps/api` emits events at the service layer, not the router layer.
- Clients (web, mobile) do not emit auth events directly; they observe session state.
- Events are not persisted in this milestone — they are structured log entries only.

## Flow Coverage

```
Login flow:    auth.login.success | auth.login.failure
Refresh flow:  auth.token.refreshed | auth.token.expired
Logout flow:   auth.logout
Recovery flow: auth.recovery.requested → auth.recovery.completed
Lock flow:     auth.login.failure (repeated) → auth.account.locked
```
