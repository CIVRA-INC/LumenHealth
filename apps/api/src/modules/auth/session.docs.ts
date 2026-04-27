// Issue #415 – Identity and Sessions: rollout, migration, and contribution patterns
// Machine-readable documentation for the identity-and-sessions workstream.

export const SESSION_ROLLOUT_CHECKLIST = [
  "Set JWT_ACCESS_TOKEN_SECRET and JWT_REFRESH_TOKEN_SECRET in .env before first deploy.",
  "Access tokens expire in 15 min; refresh tokens in 7 days – adjust via TOKEN_TTL_* env vars if needed.",
  "No schema migration required: user documents gain no new required fields in this sprint.",
  "Rotate secrets with a rolling restart; old tokens are invalidated immediately on secret change.",
  "Enable session.metrics logs in your log aggregator to track login_failure spikes.",
] as const;

export const SESSION_EXTENSION_PATTERNS = {
  addOAuthProvider:
    "Create a new controller in modules/auth, reuse token.service.ts for token issuance, emit session.metrics events.",
  addMFAStep:
    "Insert a pre-token middleware that checks a pending_mfa flag on the User document before calling signAccessToken.",
  revokeAllSessions:
    "Store a jti blocklist in Redis or a MongoDB collection; validate in the auth middleware before accepting a token.",
} as const;

export const SESSION_OPEN_FOLLOWUPS = [
  "Refresh-token rotation (issue each refresh only once, invalidate on reuse).",
  "Per-device session tracking for mobile clients.",
  "Idle-timeout enforcement via last_active timestamp on User.",
] as const;

export type SessionExtensionKey = keyof typeof SESSION_EXTENSION_PATTERNS;
