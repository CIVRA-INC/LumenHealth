# Auth Error Normalization

Closes #442

## Overview

All auth errors across the API and clients share a single shape defined in `@lumen/types`. The API normalizes any thrown value into this shape before responding.

## Error Shape

```ts
type AuthError = {
  error: AuthErrorCode;
  message: string;
};
```

## Error Codes and HTTP Status

| Code | HTTP | Meaning |
|---|---|---|
| `AUTH_MISSING_CREDENTIALS` | 400 | Required fields absent from request |
| `AUTH_INVALID_CREDENTIALS` | 401 | Email/password mismatch |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT TTL exceeded |
| `AUTH_TOKEN_INVALID` | 401 | Malformed or unverifiable token |
| `AUTH_FORBIDDEN` | 403 | Authenticated but insufficient role |
| `AUTH_ACCOUNT_LOCKED` | 423 | Account locked after repeated failures |

## API Normalization

`apps/api/src/auth/errors.ts` exports two utilities:

- `authErrorStatus(code)` — maps an `AuthErrorCode` to its HTTP status.
- `normalizeAuthError(err)` — converts any thrown value to an `AuthError`. Unknown errors fall back to `AUTH_TOKEN_INVALID`.

The auth router's error handler calls `normalizeAuthError` so no raw stack traces or untyped error objects reach the client.

## Client Handling

Web and mobile clients should:

1. Check `response.ok` before parsing the body.
2. On failure, parse the body as `AuthError`.
3. Branch on `error` code for user-facing messages — never display `message` directly to end users.

```ts
const data = await res.json();
if (!res.ok) {
  const err = data as AuthError;
  // handle err.error
}
```

## Staff, Invitation, and Clinic Error Codes

Shared error unions are defined in `@lumen/types`:

- `StaffErrorCode` / `StaffError` (`packages/types/src/staff.ts`)
- `InvitationErrorCode` / `InvitationError` (`packages/types/src/staff.ts`)
- `ClinicErrorCode` / `ClinicError` (`packages/types/src/clinic.ts`)

### Staff

| Code | HTTP | Meaning |
|---|---|---|
| `STAFF_NOT_FOUND` | 404 | Staff member missing or outside caller clinic |
| `STAFF_CANNOT_SELF_UPDATE` | 403 | Caller attempted to change own staff role |
| `STAFF_LAST_OWNER` | 400 | Operation would leave clinic without active owner |
| `STAFF_ALREADY_EXISTS` | 409 | Staff identity already exists |
| `STAFF_ACCESS_DENIED` | 403 | Caller lacks staff access |
| `STAFF_ROLE_INVALID` | 400 | Invalid staff role |
| `VALIDATION_FAILED` | 400 | Request validation failed |

### Invitation

| Code | HTTP | Meaning |
|---|---|---|
| `INVITATION_NOT_FOUND` | 404 | Invitation missing or outside caller clinic |
| `INVITATION_EXPIRED` | 410 | Invitation expired |
| `INVITATION_ALREADY_PENDING` | 409 | Pending invitation already exists |
| `INVITATION_ALREADY_ACCEPTED` | 409 | Invitation already accepted |
| `INVITATION_REVOKED` | 409 | Invitation revoked |
| `INVITATION_INVALID_INPUT` | 400 | Invitation request validation failed |
| `STAFF_ALREADY_EXISTS` | 409 | Email already registered as staff |
| `STAFF_ACCESS_DENIED` | 403 | Caller lacks invitation access |
| `VALIDATION_FAILED` | 400 | Request validation failed |

### Clinic

| Code | HTTP | Meaning |
|---|---|---|
| `CLINIC_NOT_FOUND` | 404 | Clinic missing or outside caller scope |
| `CLINIC_INVALID_INPUT` | 400 | Clinic request validation failed |

Clinic-scope/role authorization failures may return `AUTH_FORBIDDEN` from auth/guard layers.
