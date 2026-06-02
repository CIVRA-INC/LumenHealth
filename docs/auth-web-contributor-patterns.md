# Web Auth Contributor Patterns

Closes #524

## Adding a New Auth Route Handler

1. Add the route to `apps/api/src/auth/router.ts`.
2. Type the request/response with contracts from `@lumen/types` (`auth.ts`).
3. Return errors via `normalizeAuthError` and status via `authErrorStatus`.
4. Log with `authLogger` using the matching `AuthEventType`.
5. Increment metrics via `incrementMetric` for success/failure counters.

```ts
// Pattern: typed handler with normalized error path
router.post("/example", (req, res) => {
  const body = req.body as Partial<LoginRequest>;
  if (!body.email) {
    const err = { error: "AUTH_MISSING_CREDENTIALS" as const, message: "email required" };
    res.status(authErrorStatus(err.error)).json(err);
    return;
  }
  // ... business logic
  res.json(payload);
});
```

## Protecting a Route

Apply `resolveAuthContext` then check `req.auth`:

```ts
router.get("/protected", resolveAuthContext, (req, res) => {
  if (!req.auth) return unauthorized(res);
  if (req.auth.role !== "owner") return forbidden(res, "owner role required");
  res.json({ ok: true });
});
```

For role-gating across multiple roles, use `requirePermission(permission)` with a permission from `@lumen/types`.

## Adding a New Auth Page (Web)

Pages live under `apps/web/app/auth/<route>/page.tsx`. They:
- Import only `@lumen/types` and `@lumen/config`; never call `apps/api` code directly
- Post to `POST /api/v1/auth/<endpoint>` via `fetch`
- Redirect on success based on role using the role → landing map in `docs/auth-web-navigation-rules.md`
- Surface `AuthError.message` inline on failure

## Extension Points

| Concern | File | How to extend |
|---|---|---|
| Token signing strategy | `apps/api/src/auth/token-signer.ts` | Implement `AccessTokenSigner` interface; swap in `accessTokenSigner` |
| Session storage | `apps/api/src/auth/session-store.ts` | Replace in-memory store with a persistent adapter |
| Password policy | `apps/api/src/auth/password-policy.ts` | Adjust `validatePassword` rules |
| Rate limiting | `apps/api/src/auth/router.ts` `limited()` | Replace with a shared Redis-backed limiter |
| Role policy | `apps/api/src/auth/policy-catalog.ts` | Add permissions to roles |

## Verification Checklist

Before opening a PR touching auth:

- [ ] New routes typed with `@lumen/types` contracts
- [ ] Errors returned via `normalizeAuthError` / `authErrorStatus`
- [ ] Metrics incremented for observable paths
- [ ] `npm run check:boundaries` passes
- [ ] Test or validation note added for the changed surface
