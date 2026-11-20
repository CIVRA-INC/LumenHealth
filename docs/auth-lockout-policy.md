# Account Lockout Policy

Covers: #475, #1574

## Trigger
- Lock account after 5 consecutive failed login attempts within a rolling 15-minute window.

## Lock Duration
- Default lockout duration: 15 minutes.
- Failed attempts reset to zero after a successful login.

## Response Behavior

A login for an account that is **locked, suspended or pending activation** is answered exactly like
an unknown email or a wrong password:

- HTTP status: `401`
- Body: `{ "error": "AUTH_INVALID_CREDENTIALS", "message": "invalid email or password" }`
- The server also spends the same time as a real password comparison, so timing does not leak the
  account state either (see `docs/auth-threat-model.md`).

There is no intentional exception: a locked account is not distinguishable by the caller. The
`AUTH_ACCOUNT_LOCKED` code and its `423` mapping still exist in the shared error catalogue, but the
login endpoint no longer returns them.

The specific reason is recorded only in the server log entry `auth.login.failure`, in `meta.reason`:
`ACCOUNT_LOCKED`, `ACCOUNT_SUSPENDED` or `ACCOUNT_PENDING` (with the account's `userId` and
`clinicId`). `AUTH_INVALID_CREDENTIALS` is logged for unknown emails and wrong passwords.

## Minimal Test Expectations
- 5 failed attempts triggers lock.
- A login during the lock returns the same response as an unknown email (asserted in
  `auth.controller.test.ts`).
- Login succeeds after the lock window expires (with correct credentials).
