# Environment Variables

Every variable the code reads is listed here and in `.env.example`. "Owner" is the workspace
that reads it. Source of truth: `packages/config/index.ts`, `packages/config/public.ts`,
`apps/stellar-service/src/config.ts` and the API modules named below.

## Variable Reference

### API (`apps/api`)

| Variable | Required | Description |
|---|---|---|
| `API_PORT` | No (default `4000`) | Port the API listens on. |
| `JWT_SECRET` | Yes | Secret read by `authConfig` (`@lumen/config`); startup fails without it. |
| `JWT_ACCESS_TTL` | No (default `900`) | Access token TTL in seconds. |
| `JWT_REFRESH_TTL` | No (default `604800`) | Refresh token TTL in seconds. |
| `BCRYPT_ROUNDS` | No (default `12`) | bcrypt cost factor. |
| `AUTH_ACCESS_TOKEN_KEY` | Yes | Key the access-token signer actually uses (`token.service.ts`); must pass the strength check. |
| `AUTH_ACCESS_TOKEN_KEY_PREVIOUS` | No | Previous access-token key, accepted for verification during rotation. |
| `MONGODB_URI` | No | MongoDB connection string; the API uses in-memory repositories when unset. |
| `MONGODB_DB` | No (default `lumenhealth`) | MongoDB database name (API and the migration CLI). |
| `PII_KEYS` | With field encryption | Comma-separated `keyId:key` pairs for PII field encryption. |
| `PII_ACTIVE_KEY_ID` | With field encryption | Key id used for new writes. |
| `PII_BLIND_INDEX_KEY` | With field encryption | Base64 key for blind indexes. |
| `AUDIT_ARCHIVE_DIR` | No | Directory for the JSON-file audit archive sink. |
| `AUDIT_RETENTION_INTERVAL_MS` | No | How often audit retention runs. |
| `AUDIT_INTEGRITY_SAMPLE_SIZE` | No | Entries sampled per audit integrity check. |
| `AUDIT_INTEGRITY_INTERVAL_MS` | No | How often the audit integrity sampler runs. |

### Shared by API and Stellar service (`@lumen/config`)

| Variable | Required | Description |
|---|---|---|
| `INTERNAL_SERVICE_SECRETS` | No (dev fallback) | Comma-separated `keyId:secret` pairs for signed service-to-service requests; the first signs, all verify. |
| `INTERNAL_SERVICE_TOKEN` | No | Deprecated static token; no longer used for authentication. |
| `STELLAR_NETWORK` | No (default `testnet`) | `testnet` or `mainnet`. |
| `STELLAR_HORIZON_URL` | No | Horizon endpoint; default is the testnet URL. |
| `STELLAR_SERVICE_URL` | No (default `http://localhost:4100`) | Base URL the API uses to reach the Stellar service. |
| `STELLAR_SERVICE_PORT` | No (default `4100`) | Port the Stellar service listens on. |
| `ANCHOR_INTERVAL_MS` | No (default `60000`) | How often the anchoring job runs a batch. |
| `ANCHOR_RECONCILE_STALE_THRESHOLD_MS` | No (default `900000`) | Age of the oldest unanchored entry after which reconciliation forces a batch. |

### Stellar service (`apps/stellar-service`)

| Variable | Required | Description |
|---|---|---|
| `STELLAR_ANCHOR_ACCOUNT_PUBLIC_KEY` | Yes | Public key of the shared multisig anchor account. |
| `STELLAR_ANCHOR_COSIGNER_SECRETS` | Yes | Comma-separated secret seeds of the cosigners this deployment holds. |
| `STELLAR_ANCHOR_REQUIRED_WEIGHT` | No | Combined cosigner weight required to submit; defaults to all cosigners. |
| `STELLAR_EXPORT_SIGNING_SECRET` | Yes | Signing key for compliance-export manifests; must differ from every cosigner key. |
| `STELLAR_SIGNING_KEY_REGISTRY_JSON` | No | Export-signing key rotation log (see `stellar-key-rotation.md`). |

### Web (`apps/web`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Yes (production) | Base URL for browser API calls (default `http://localhost:4000`). |

`STELLAR_KEYPAIR_SECRET`, which this document used to describe, is not read by any code and
was removed.

## Ownership Rules

- Variables prefixed `NEXT_PUBLIC_` are exposed to the browser; all others are server-only.
- Secrets (`JWT_SECRET`, `AUTH_ACCESS_TOKEN_KEY*`, `STELLAR_ANCHOR_COSIGNER_SECRETS`,
  `STELLAR_EXPORT_SIGNING_SECRET`, `PII_*`, `INTERNAL_SERVICE_SECRETS`) must never be committed.
- `packages/config` (`serverConfig`, `authConfig`, `getPublicRuntimeConfig`) provides typed
  accessors for the shared variables. Some modules still read `process.env` directly: the API's
  token service, field encryption, database connection, migration CLI and audit services, and the
  Stellar service's own `config.ts`. This is current behaviour, not a goal; new variables should
  go through `@lumen/config`.

## Local Setup

```bash
cp .env.example .env
```

Fill in the required values. For production, inject secrets through your platform's secret
manager. Do not commit `.env`.
