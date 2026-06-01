# Local Auth Setup

Closes #543

## Goal

Set up the local auth baseline for the current API, web, and mobile workspaces without guessing which environment variables each surface owns.

## Workspace Status

| Workspace | Current auth role | Local env variables | Notes |
| --- | --- | --- | --- |
| `apps/api` | Hosts the auth routes and token settings | `JWT_SECRET`, optional `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `BCRYPT_ROUNDS`, optional `API_PORT` | Required for any local auth flow. |
| `apps/web` | Calls the API from the browser | `NEXT_PUBLIC_API_BASE_URL` | Must point at the local API server. |
| `apps/mobile` | Scaffold only in the reset baseline | None yet | No auth env contract exists until the first mobile auth implementation lands. |

## 1. Create The Root Environment File

Copy the shared example from the repo root:

```bash
cp .env.example .env
```

Start from values like these for local work:

```dotenv
API_PORT=4000
JWT_SECRET=dev-local-jwt-secret-with-at-least-32-chars
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800
BCRYPT_ROUNDS=12
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
```

## 2. API Setup

The API reads auth settings from the root `.env` file through `@lumen/config`.

Required local minimum:

- `JWT_SECRET` must be present and at least 32 characters long.
- `API_PORT` defaults to `4000` when omitted.
- `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, and `BCRYPT_ROUNDS` can stay on their defaults unless a test needs different timings.

Start the API workspace:

```bash
npm run dev --workspace @lumen/api
```

Expected auth endpoints live under `/auth`, including:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`

## 3. Web Setup

The web app only needs the public API base URL:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Start the web workspace in a second terminal:

```bash
npm run dev --workspace @lumen/web
```

If the API is running on a different port, update `NEXT_PUBLIC_API_BASE_URL` to match before starting Next.js.

## 4. Mobile Setup

`apps/mobile` is still a scaffold in the current reset, so there is no mobile auth runtime or mobile-specific auth environment variable to configure yet.

For contributors working on auth docs or contracts now:

- keep mobile auth notes aligned with `packages/types`
- do not introduce a mobile-only auth secret in the root `.env`
- document future mobile env variables only in the issue or PR that adds the mobile auth runtime

## 5. Local Verification

After the API starts, verify the baseline with a simple register or login request:

```bash
curl -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@clinic.test","password":"StrongPass123!"}'
```

You should receive a JSON payload with a `session.accessToken`.

For a quick browser-side check, confirm the web app is pointing at the same `NEXT_PUBLIC_API_BASE_URL` value and can reach the API without changing any auth secrets in the client.

## 6. Validation Notes

- Run `npm run check:architecture` before opening a PR.
- Run `npm run check:boundaries` to confirm workspace imports still follow repo rules.
- If you change auth routes or contracts later, update this guide alongside `auth-env.md` and `auth-config.md`.
