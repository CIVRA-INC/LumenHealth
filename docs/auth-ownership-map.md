# Auth Ownership Map

Closes #559

## Purpose

This document tells contributors where auth behavior belongs across the reset monorepo.
It is the quick-reference companion to the deeper auth docs already in `docs/`.

## Workspace Ownership

| Workspace | Owns | Uses Shared Contracts For |
|---|---|---|
| `apps/api` | Credential checks, token issuance, refresh rotation, session validation, audit signals | Request/response envelopes, auth errors, session payloads |
| `apps/web` | Login UI, route protection, session bootstrap, UX notices | Auth session shape, auth notices, role-based navigation rules |
| `apps/mobile` | Login UI, secure storage, protected navigation shell, bootstrap recovery | Auth session shape, validation outcomes, offline-safe session state |
| `apps/stellar-service` | Stellar link setup and verification boundaries | Shared auth session handoff data |
| `packages/types` | Stable auth contracts, error codes, response envelopes | All runtime workspaces |
| `packages/config` | Environment access and workspace-wide configuration helpers | Shared auth config values |

## Practical Rules

- API owns anything that mutates or validates auth state on the server.
- Web and mobile own presentation, storage, and route orchestration only.
- Shared types stay framework-free and runtime-free.
- If a flow crosses workspaces, its data shape belongs in `packages/types` first.

## Review Checklist

- Does the change keep the contract in one shared location?
- Does the app layer avoid duplicating server logic?
- Can another contributor find the correct owner without reading implementation code first?

