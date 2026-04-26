# Deployment Environments

LumenHealth uses three distinct deployment environments for the API, web, and mobile applications.

---

## 1. Development (Local)

**Purpose:** Day-to-day local development and testing.

**Setup:**
- API: run locally via `npm run dev` or Docker Compose
- Web: `npm run dev` in the `web/` package
- Mobile: Expo Go via `npx expo start`

**Environment Variables:**
- Stored in `.env.local` at each package root (never committed to version control)
- Copy `.env.example` to `.env.local` and fill in local values

| Variable | Description |
|----------|-------------|
| `API_URL` | `http://localhost:3001` |
| `DATABASE_URL` | Local Postgres connection string |
| `JWT_SECRET` | Any local secret value |
| `EXPO_PUBLIC_API_URL` | `http://localhost:3001` |

---

## 2. Preview (Branch Deploys)

**Purpose:** Per-PR preview environments for review and QA before merging.

**Setup:**
- Web: Automatically deployed to **Vercel** on each PR — a unique preview URL is generated per branch
- Mobile: Built and distributed via **Expo EAS** (`eas build --profile preview`) — triggered on PR open/update
- API: Preview API instance deployed via Vercel Serverless or Railway per PR (if configured)

**Environment Variables:**
- Managed via Vercel project environment settings (scoped to "Preview")
- Mobile vars stored in `eas.json` under the `preview` build profile and in Expo EAS secrets
- Secrets are never stored in source code

| Variable | Source |
|----------|--------|
| `API_URL` | Vercel env (Preview scope) |
| `DATABASE_URL` | Preview database URL (Vercel / Railway) |
| `JWT_SECRET` | Vercel secret (Preview scope) |
| `EXPO_PUBLIC_API_URL` | EAS secret |

---

## 3. Production

**Purpose:** Live environment serving real users.

**Promotion Process:**
1. PR is merged to `main` after all quality gates pass
2. Deployment to production is **not automatic** — it requires a manual promotion step
3. A designated team member must approve the production deployment in Vercel / EAS dashboard
4. API deployments require an additional approval gate in the CI/CD pipeline

**Environment Variables:**
- Managed via Vercel project environment settings (scoped to "Production")
- Mobile production secrets stored in Expo EAS (production profile)
- All production secrets are rotated periodically and stored only in the respective platforms — never in `.env` files or source code

| Variable | Source |
|----------|--------|
| `API_URL` | Vercel env (Production scope) |
| `DATABASE_URL` | Production database URL (managed service) |
| `JWT_SECRET` | Vercel secret (Production scope) |
| `EXPO_PUBLIC_API_URL` | EAS secret (production profile) |

---

## General Guidelines

- Never commit `.env`, `.env.local`, or any file containing real secrets to version control
- Use `.env.example` files with placeholder values as templates
- Rotate secrets immediately if they are accidentally exposed
- All three environments should use separate database instances
