# API Auth Module Entrypoints

> This document describes the authentication module entrypoints in the LumenHealth API, their request/response formats, and contributor extension rules.

## Overview

The auth module handles user authentication, session management, and access control. It's located in `apps/api/src/` and follows a modular architecture.

## Current Entrypoints

### POST /api/v1/auth/login

**Purpose**: Authenticate user and create session

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response** (200 OK):
```json
{
  "session": {
    "userId": "starter-user",
    "clinicId": "starter-clinic",
    "role": "owner",
    "accessToken": "replace-in-milestone-1"
  }
}
```

**Error Responses**:
- 400: Missing email or password
- 401: Invalid credentials (planned)
- 429: Rate limited (planned)

**Implementation**: `apps/api/src/index.ts:17-37`

### GET /api/v1/auth/roadmap

**Purpose**: Display authentication feature roadmap

**Response** (200 OK):
```json
{
  "next": [
    "registration",
    "session persistence",
    "role-based access control",
    "password reset",
    "audit logging"
  ]
}
```

**Implementation**: `apps/api/src/index.ts:39-49`

## Planned Entrypoints (Auth MVP)

### POST /api/v1/auth/register
- Create new user account
- Requires: email, password, role, clinicId
- Returns: user profile + session

### POST /api/v1/auth/refresh
- Refresh access token using refresh token
- Requires: refreshToken in cookie/header
- Returns: new accessToken + refreshToken

### POST /api/v1/auth/logout
- Invalidate current session
- Requires: valid accessToken
- Returns: success confirmation

### POST /api/v1/auth/forgot-password
- Initiate password reset flow
- Requires: email
- Returns: success message (always, to prevent enumeration)

### POST /api/v1/auth/reset-password
- Complete password reset with token
- Requires: token, newPassword
- Returns: success confirmation

### GET /api/v1/auth/me
- Get current user profile
- Requires: valid accessToken
- Returns: user profile with role and permissions

## Architecture

```
apps/api/src/
├── index.ts                    # Main entry, route registration
├── middleware/
│   ├── auth.ts                 # JWT validation middleware (planned)
│   ├── role.ts                 # Role-based access control (planned)
│   └── rateLimit.ts            # Rate limiting (planned)
├── controllers/
│   └── auth.ts                 # Auth business logic (planned)
├── services/
│   ├── token.ts                # JWT signing/verification (planned)
│   └── session.ts              # Session management (planned)
└── types/
    └── auth.ts                 # Auth-specific types (planned)
```

## Extension Rules for Contributors

### Adding New Auth Endpoints

1. **Create controller** in `controllers/auth.ts`
2. **Add route** in `index.ts` with appropriate middleware chain
3. **Update this document** with endpoint specification
4. **Add tests** in `tests/auth/` directory
5. **Update types** in `@lumen/types` if new request/response shapes

### Middleware Chain Pattern

```typescript
// Standard auth endpoint pattern
app.post("/api/v1/auth/new-endpoint",
  rateLimitMiddleware,        // Rate limiting
  authGuardMiddleware,        // JWT validation (if authenticated)
  roleGuardMiddleware(["owner", "admin"]),  // Role check (if needed)
  authController.newEndpoint  // Business logic
);
```

### Security Requirements

- All endpoints must validate input
- All endpoints must return consistent error formats
- All endpoints must log security events
- All endpoints must handle rate limiting
- All endpoints must use HTTPS in production

### Testing Requirements

- Unit tests for controller logic
- Integration tests for middleware chain
- Security tests for auth bypass attempts
- Rate limiting tests

---

*Last updated: 2026-05-27*
*Next review: Auth MVP milestone*
