# ADR 0002: Shared contracts as zod schemas

**Status:** accepted · **Date:** 2026-10-23

## Decision

`packages/contracts` holds zod schemas for every request body/query, the permission catalogue and
role map, the appointment and encounter state machines, and response view types. The API validates
untrusted input with `parse(schema, input)`; the web app reuses the same schemas for form validation
(React Hook Form) and for deciding which actions to offer. OpenAPI request bodies are generated from
the schemas (`z.toJSONSchema`).

Contracts build with `tsup` to ESM + CJS so Node (CJS API), Vite and Vitest all consume the same artefact. `pnpm dev`, `typecheck` and `test` build it first.

## Consequences

No duplicated DTO classes; validation rules cannot drift between client and server. The server remains authoritative: client validation is a convenience. `nestjs-zod` was not used (peer ranges exclude Nest 12); a 20-line pipe/helper replaces it.
