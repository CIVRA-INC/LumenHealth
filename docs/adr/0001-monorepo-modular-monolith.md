# ADR 0001: Monorepo and modular monolith

**Status:** accepted · **Date:** 2026-10-23

## Context

One developer must deliver and operate a healthcare product with cloud-first deployment and a later
facility-local mode. Operational complexity is the main threat.

## Decision

- A pnpm workspace with `apps/api` (NestJS), `apps/web` (React + Vite), and packages for contracts, UI and config.
- The API is a **modular monolith**: one deployable, with domain modules (identity, organizations, patients, scheduling, encounters, audit, dashboard) that own their rules. Controllers call their own module's service; cross-module reads go through exported mappers/services, never through another module's tables.
- The workspace application is a Vite SPA (not Next.js): it is a workflow-heavy authenticated tool whose offline requirements favour a deliberately designed application shell.

## Consequences

One build, one deploy, one database, easy local runs. Module boundaries are conventions backed by review and tests rather than process boundaries; extract a service only with a demonstrated need.
