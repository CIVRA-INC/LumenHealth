# Mobile Auth Architecture Decision

Closes #526

## Decisions

### Navigation
- Auth stack and app stack are **separate navigators**; the root navigator switches between them based on session state.
- Unauthenticated: render `AuthStack` (login screen only at this milestone).
- Authenticated: render `AppStack` (role-gated home per `docs/auth-mobile-visibility-rules.md`).
- Navigation is driven by session state — never by route manipulation.

### Session State
- Session is held in a top-level context (`AuthContext`) exposed via `useAuth()`.
- On mount, the context reads persisted tokens from secure storage and calls `GET /api/v1/auth/me` to rehydrate.
- If `me` returns `AUTH_TOKEN_INVALID` or `AUTH_TOKEN_EXPIRED`, context clears storage and lands on login.
- Session shape matches `AuthSession` from `@lumen/types`.

### Token Storage
- Access token: in-memory only (lost on app kill, refreshed on next `me` check).
- Refresh token: secure device storage (platform keychain/keystore via Expo SecureStore or React Native Keychain).
- No tokens in AsyncStorage or plain device storage.

### API Access
- All API calls go through a thin `apiClient` that attaches `Authorization: Bearer <accessToken>`.
- On `401`, `apiClient` attempts one silent refresh via `POST /api/v1/auth/refresh`, stores the new tokens, and retries the original request.
- On second `401`, clears session and navigates to login.

## Module Layout

```
apps/mobile/
  auth/
    AuthContext.tsx      # session state, login(), logout(), rehydrate()
    useAuth.ts           # typed hook wrapping AuthContext
    loginApi.ts          # fetch wrappers for /auth/login, /auth/refresh, /auth/me
    LoginScreen.tsx      # login form UI
    tokenStorage.ts      # secure storage read/write for refresh token
```

## Contracts

All request/response types come from `@lumen/types`:
- `LoginRequest`, `LoginResponse`, `AuthSession` for login
- `RefreshRequest`, `RefreshResponse` for token rotation
- `MeResponse` for session rehydration
- `AuthError`, `AuthErrorCode` for error handling

## Constraints

- `apps/mobile` must not import from `apps/api`, `apps/web`, or `apps/stellar-service`.
- Auth business logic (hashing, token signing) stays in `apps/api`.
- Mobile owns token storage and navigation gating only.
