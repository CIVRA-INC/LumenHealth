# LumenHealth

LumenHealth is being reset as a clean open source hackathon monorepo. The new baseline is intentionally small: an Express API, a Next.js web app, a mobile workspace, and a Stellar service scaffold that contributors can build on milestone by milestone.

## Stack

- `apps/api`: Express + TypeScript
- `apps/web`: Next.js App Router + TypeScript
- `apps/mobile`: mobile product workspace scaffold
- `apps/stellar-service`: Stellar service starter
- `packages/config`: shared environment and workspace rules
- `packages/types`: shared contracts for the MVP

## Why The Reset Exists

The previous repository had grown into a specific product implementation. For the hackathon, we want a cleaner contributor experience:

- smaller surface area
- clearer architecture boundaries
- public-friendly documentation
- milestone-driven delivery
- issue-ready scaffolding for a 625-issue MVP backlog

## MVP Direction

We are rebuilding from first principles in this order:

1. Authentication
2. Clinic and staff management
3. Patient records
4. Encounters and clinical workflows
5. Billing and Stellar integration
6. Mobile offline and sync basics
7. Demo hardening for hackathon launch

## Getting Started

```bash
npm install
npm run check:architecture
npm run dev
```

Create a root `.env` from `.env.example` before starting local services.

## Workspace Rules

- Apps may import only `@lumen/config` and `@lumen/types`.
- Apps must not import from other app workspaces.
- Shared packages must not depend on app code.
- Public issue work should stay within a milestone boundary.

Run the boundary check before opening a PR:

```bash
npm run check:boundaries
```

## Docs

- [Architecture](./docs/architecture.md)
- [MVP Scope](./docs/mvp-scope.md)
- [Contributor Guide](./CONTRIBUTING.md)
- [Reset Roadmap](./docs/reset-roadmap.md)
- [Local Auth Setup](./docs/auth-local-setup.md)

## Current Baseline

This reset is a starting point, not the finished product. The current codebase includes:

- API boot scaffold with auth placeholder routes
- Web shell with hackathon positioning
- Mobile workspace placeholder
- Stellar diagnostics starter
- shared config and shared types packages
- contributor and issue-management documents
