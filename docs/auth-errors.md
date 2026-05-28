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
