# Auth Sequence Diagram

Closes #437

## Login Flow (Web and Mobile)

```
Client (web/mobile)          API                        Database
      |                       |                              |
      |-- POST /auth/login --> |                              |
      |   { email, password } |                              |
      |                       |-- SELECT user WHERE email -->|
      |                       |<-- user row (hash, role) ----|
      |                       |                              |
      |                       |-- bcrypt.compare(pw, hash)   |
      |                       |   [local, no DB call]        |
      |                       |                              |
      |                       |-- INSERT session ----------->|
      |                       |<-- sessionId ----------------|
      |                       |                              |
      |<-- 200 { session } ---|                              |
      |   accessToken (JWT)   |                              |
      |   userId, role        |                              |
```

## Authenticated Request Flow

```
Client                       API Middleware               Handler
  |                               |                          |
  |-- GET /api/v1/... ----------->|                          |
  |   Authorization: Bearer <jwt> |                          |
  |                               |-- jwt.verify(token)      |
  |                               |   [local, no DB call]    |
  |                               |                          |
  |                               |-- attach req.user        |
  |                               |                          |
  |                               |-- next() --------------->|
  |                               |                          |
  |<-- 200 { data } --------------|<-- res.json(data) -------|
```

## Logout Flow

```
Client                       API
  |                           |
  |-- POST /auth/logout ------>|
  |   Authorization: Bearer   |
  |                           |-- DELETE session (if persisted)
  |<-- 200 { ok: true } ------|
  |                           |
  |   [client clears token]   |
```

## Token Refresh Flow (future milestone)

```
Client                       API
  |                           |
  |-- POST /auth/refresh ----->|
  |   { refreshToken }        |
  |                           |-- validate refreshToken
  |                           |-- issue new accessToken
  |<-- 200 { accessToken } ---|
```

## Stellar Service Auth

```
Stellar Service              Horizon (Stellar network)
      |                              |
      |-- keypair.sign(tx) --------->|
      |   [no JWT, keypair auth]     |
      |<-- tx result ----------------|
```

The Stellar service authenticates directly with the Stellar network using keypair signing. It does not participate in the JWT session flow used by web and mobile clients.

## Error Cases

| Scenario | HTTP Status | Error Code |
|---|---|---|
| Missing credentials | 400 | `AUTH_MISSING_CREDENTIALS` |
| Invalid email/password | 401 | `AUTH_INVALID_CREDENTIALS` |
| Expired token | 401 | `AUTH_TOKEN_EXPIRED` |
| Invalid token | 401 | `AUTH_TOKEN_INVALID` |
| Insufficient role | 403 | `AUTH_FORBIDDEN` |
| Account locked | 403 | `AUTH_ACCOUNT_LOCKED` |
