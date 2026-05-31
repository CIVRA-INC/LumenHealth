# Account Lockout Policy

Covers: #475

## Trigger
- Lock account after 5 consecutive failed login attempts within a rolling 15-minute window.

## Lock Duration
- Default lockout duration: 15 minutes.
- Failed attempts reset to zero after a successful login.

## Response Behavior
- Return generic auth failure messaging to avoid account enumeration signals.
- Include audit log entry with reason `ACCOUNT_LOCKED`.

## Minimal Test Expectations
- 5 failed attempts triggers lock.
- Login during lock returns lockout response.
- Login succeeds after lock window expires (with correct credentials).
