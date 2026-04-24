# Contributor Architecture Handbook

This handbook is the maintainer-facing guide for extending LumenHealth safely.

## System Context

LumenHealth is a monorepo with explicit runtime boundaries:

- `apps/api`: Express modular monolith for clinical, administrative, AI, and payment APIs
- `apps/web`: Next.js clinic dashboard
- `apps/stellar-service`: isolated Stellar network operations
- `packages/config`: shared runtime configuration, feature flags, and architecture tooling
- `packages/types`: shared schemas and cross-app contracts

## Preferred Backend Patterns

### Controllers

- keep controllers thin
- validate input through `validateRequest`
- read actor, clinic, and correlation metadata through request context helpers
- throw `ApiProblem` instances for expected failures instead of handcrafting inconsistent error payloads

### Middleware

- request-scoped metadata must be initialized in one place
- authorization and subscription gates should rely on shared request context instead of reparsing tokens independently
- mutating routes should remain auditable

### Composition Root

- app creation belongs in a composition root (`createApp`)
- runtime-only side effects such as database connection and worker startup stay in the entrypoint
- tests should be able to create the app without opening sockets or background workers

## Shared Contracts

- public contract changes must follow `CONTRACT_VERSIONING.md`
- compatibility-sensitive or breaking changes need a changelog entry
- shared packages should expose stable entrypoints and avoid app-to-app imports

## Review Heuristics

Reviewers should check:

- tenancy and clinic scoping
- auditability of mutating behavior
- privacy-safe logging and fixtures
- backward compatibility of shared contracts
- architecture checks and relevant route or middleware tests

## When to Escalate to ADR or RFC

Create or update an ADR/RFC when work changes:

- workspace boundaries
- public API or shared package contracts in a breaking way
- data retention or PHI handling rules
- authentication, authorization, or billing guarantees across modules
