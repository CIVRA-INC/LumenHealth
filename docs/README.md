# Documentation index

Every document in `docs/`, grouped by audience. Architecture decisions are in [`adr/`](adr/); the contract policy is in [`../CONTRACT_VERSIONING.md`](../CONTRACT_VERSIONING.md), and the contributor guide is [`../CONTRIBUTING.md`](../CONTRIBUTING.md).

## API and security

- [`auth-abuse-checklist.md`](auth-abuse-checklist.md) — Auth Abuse-Case Checklist
- [`auth-api-entrypoints.md`](auth-api-entrypoints.md) — API Auth Entrypoints and Contributor Extension Rules
- [`auth-config.md`](auth-config.md) — Auth Configuration Loading Strategy
- [`auth-domain.md`](auth-domain.md) — Auth Domain Module Boundary
- [`auth-env.md`](auth-env.md) — Auth Environment Variables
- [`auth-errors.md`](auth-errors.md) — Auth Error Normalization
- [`auth-events.md`](auth-events.md) — Auth Event Taxonomy
- [`auth-lockout-policy.md`](auth-lockout-policy.md) — Account Lockout Policy
- [`auth-observability.md`](auth-observability.md) — Auth Observability Baseline
- [`auth-rbac.md`](auth-rbac.md) — Auth RBAC Baseline (rougepandaq)
- [`auth-role-catalog.md`](auth-role-catalog.md) — Auth Role Catalog
- [`auth-secret-rotation.md`](auth-secret-rotation.md) — Auth Secret Rotation Procedure
- [`auth-security-assumptions.md`](auth-security-assumptions.md) — Auth Security Assumptions and Residual Risks
- [`auth-sequence.md`](auth-sequence.md) — Auth Sequence Diagram
- [`auth-session-hardening.md`](auth-session-hardening.md) — Auth Session Hardening (Batch-1)
- [`auth-threat-model.md`](auth-threat-model.md) — Authentication Threat Model
- [`audit-coverage-matrix.md`](audit-coverage-matrix.md) — Audit coverage matrix — every mutating route in apps/api
- [`audit-indexes.md`](audit-indexes.md) — Audit collection indexes
- [`audit-retention-policy.md`](audit-retention-policy.md) — Audit Retention and Legal-Hold Policy
- [`field-encryption.md`](field-encryption.md) — Field-level encryption for PII
- [`migrations.md`](migrations.md) — Migrations
- [`nestjs-migration-inventory.md`](nestjs-migration-inventory.md) — Express → NestJS Migration Inventory
- [`nestjs-module-format.md`](nestjs-module-format.md) — Module format and build toolchain for @lumen/api

## Web

- [`auth-web-contributor-patterns.md`](auth-web-contributor-patterns.md) — Web Auth Contributor Patterns
- [`auth-web-navigation-rules.md`](auth-web-navigation-rules.md) — Auth Web Navigation Rules

## Mobile

- [`auth-mobile-architecture.md`](auth-mobile-architecture.md) — Mobile Auth Architecture Decision
- [`auth-mobile-visibility-rules.md`](auth-mobile-visibility-rules.md) — Auth Mobile Visibility Rules

## Stellar operations

- [`stellar-anchoring-concurrency.md`](stellar-anchoring-concurrency.md) — Anchoring Transaction Concurrency Model
- [`stellar-key-rotation.md`](stellar-key-rotation.md) — Stellar Signing Key Rotation Procedure

## Architecture decision records

- [`adr/0001-nestjs-module-boundaries.md`](adr/0001-nestjs-module-boundaries.md) — ADR 0001: NestJS Module Boundaries for apps/api
- [`adr/0002-critical-audit-actions.md`](adr/0002-critical-audit-actions.md) — ADR 0002: Which audit actions are governance-critical (immediate anchoring)
- [`adr/0003-persistence-strategy.md`](adr/0003-persistence-strategy.md) — ADR 0003: Persistence strategy for the API
