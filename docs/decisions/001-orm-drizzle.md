# 001: ORM Choice - Drizzle ORM

## Status
Accepted

## Context
LumenHealth requires a robust, type-safe database layer capable of handling multi-tenancy via PostgreSQL Row Level Security (RLS) and supporting a strict, modular monolith architecture in NestJS. The BUILD_PLAN.md proposed either Drizzle or Prisma. We need to choose one and document the rationale.

## Decision
We will use **Drizzle ORM** for the database layer.

## Rationale
1. **Edge and Offline Consistency:** Drizzle is highly compatible with edge environments and SQLite (which will be used for the local-first mobile/web clients). While the server uses PostgreSQL, using Drizzle aligns the server ORM mental model with the local client ORM mental model, potentially allowing for shared schema definitions (via the `@lumenhealth/shared` package) between client and server.
2. **Raw SQL Performance & Transparency:** Drizzle provides a "SQL-like" API that compiles to highly performant queries without the heavy engine overhead of Prisma. This is beneficial for complex reporting queries and precise RLS configuration.
3. **Type Safety:** Drizzle offers best-in-class TypeScript inference directly from the schema definition without requiring a secondary generation step (like Prisma's `prisma generate`).
4. **Monorepo Friendliness:** Prisma can sometimes be tricky to configure in a `pnpm` monorepo workspace due to its generated client placement. Drizzle avoids this entirely.

## Consequences
- The team will need to write migrations using Drizzle Kit.
- Drizzle's integration with NestJS requires writing custom providers, whereas Prisma has slightly more mature community NestJS wrappers, but the transparency of Drizzle outweighs this minor setup cost.
