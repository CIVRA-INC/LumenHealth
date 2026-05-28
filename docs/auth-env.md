# Auth Environment Variables

Closes #439

## Variable Reference

| Variable | Owner | Required | Description |
|---|---|---|---|
| `JWT_SECRET` | `apps/api` | Yes (prod) | Secret used to sign and verify JWTs. Min 32 chars. |
| `JWT_ACCESS_TTL` | `apps/api` | No | Access token TTL in seconds. Default: `900` (15 min). |
| `JWT_REFRESH_TTL` | `apps/api` | No | Refresh token TTL in seconds. Default: `604800` (7 days). |
| `BCRYPT_ROUNDS` | `apps/api` | No | bcrypt cost factor. Default: `12`. |
| `NEXT_PUBLIC_API_BASE_URL` | `apps/web` | Yes | Base URL for API calls from the browser. |
| `STELLAR_KEYPAIR_SECRET` | `apps/stellar-service` | Yes (prod) | Stellar secret key for signing transactions. Never expose to clients. |
| `API_PORT` | `apps/api` | No | Port the API listens on. Default: `4000`. |
| `STELLAR_NETWORK` | `apps/stellar-service` | No | `testnet` or `mainnet`. Default: `testnet`. |
| `STELLAR_HORIZON_URL` | `apps/stellar-service` | No | Horizon endpoint. Default: testnet URL. |

## Ownership Rules

- Variables prefixed `NEXT_PUBLIC_` are safe to expose to the browser. All others are server-only.
- `JWT_SECRET` and `STELLAR_KEYPAIR_SECRET` must never be committed to source control.
- Each workspace reads only the variables it owns. `apps/api` must not read `STELLAR_KEYPAIR_SECRET`.
- `packages/config` provides typed accessors for all variables. Apps must not call `process.env` directly.

## Local Setup

Copy `.env.example` to `.env` at the repo root and fill in the required values:

```bash
cp .env.example .env
```

For production, inject secrets via your deployment platform's secret manager (e.g., AWS Secrets Manager, GitHub Actions secrets). Do not commit `.env` to source control — it is listed in `.gitignore`.
