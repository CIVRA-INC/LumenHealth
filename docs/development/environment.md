# Environment variables

Loaded from the repository-level `.env` (git-ignored) and validated at start-up by `apps/api/src/config/env.ts`; an invalid or missing value stops the API with a message naming the variable.

| Variable                                            | Default                          | Purpose                                                                                                   |
| --------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                          | `development`                    | `production` requires `SESSION_COOKIE_SECURE=true`                                                        |
| `DATABASE_URL`                                      | required                         | API runtime connection as `lumen_app` (RLS applies)                                                       |
| `MIGRATION_DATABASE_URL`                            | falls back to `DATABASE_URL`     | Prisma CLI, seed: schema owner                                                                            |
| `TEST_DATABASE_URL` / `TEST_MIGRATION_DATABASE_URL` | local defaults                   | Integration-test database (`lumenhealth_test`)                                                            |
| `E2E_DATABASE_URL` / `E2E_MIGRATION_DATABASE_URL`   | local defaults                   | Disposable Playwright database (`lumenhealth_e2e`; the prepare script refuses any name not ending `_e2e`) |
| `API_HOST` / `API_PORT`                             | `127.0.0.1` / `4000`             | Listen address                                                                                            |
| `LOG_LEVEL`                                         | `info`                           | pino level (`silent` in tests)                                                                            |
| `WEB_ORIGINS`                                       | `http://localhost:5173`          | Comma-separated origins allowed to send state-changing requests                                           |
| `SESSION_COOKIE_NAME`                               | `lh_session`                     |                                                                                                           |
| `SESSION_COOKIE_SECURE`                             | `false`                          | **Must be `true` over HTTPS / in production**                                                             |
| `SESSION_IDLE_TIMEOUT_MINUTES`                      | `60`                             | Inactivity limit                                                                                          |
| `SESSION_ABSOLUTE_TIMEOUT_HOURS`                    | `12`                             | Hard session lifetime                                                                                     |
| `TRUST_PROXY`                                       | `false`                          | Set when behind a reverse proxy so client IPs (audit, throttling) come from `X-Forwarded-For`             |
| `RATE_LIMIT_ENABLED`                                | `true`                           | Disable only in automated tests                                                                           |
| `SWAGGER_ENABLED`                                   | `true`                           | Set `false` in production                                                                                 |
| `WEB_PORT` / `VITE_API_PROXY_TARGET`                | `5173` / `http://127.0.0.1:4000` | Vite dev server                                                                                           |

Rules: never commit `.env`; never put a secret in anything prefixed `VITE_` (it ships to the browser); production secrets come from the platform's secret store.
