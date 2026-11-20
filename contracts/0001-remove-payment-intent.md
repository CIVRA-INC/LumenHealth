# Contract Change Log: remove `PaymentIntent` from `@lumen/types`

## Summary

- Contract surface: `@lumen/types` barrel (`packages/types/src/index.ts`)
- Change classification: breaking (removal of an exported type), no known consumers
- Affected workspaces: none found (`apps`, `packages`); confirm nothing outside this repository imports it

## Current Behavior

- Existing request/response/export shape: `PaymentIntent` (`id`, `amount`, `assetCode`, `memo`, `status`) was declared inline in `index.ts`.
- Existing consumers: none (a repository-wide search finds no other reference).

## Proposed Behavior

- New request/response/export shape: the type is removed. `index.ts` contains only `export * from` lines.
- Fallback or compatibility layer: none. Billing is a future milestone and must not be partially implemented in advance (CONTRIBUTING.md); billing types arrive in `packages/types/src/billing.ts` with their own review.

## Rollout Plan

1. Remove the type from the barrel (this change).
2. Add `packages/types/src/billing.ts` when the billing milestone starts.

## Deprecation / Sunset

- Deprecated field(s) or value(s): `PaymentIntent`
- Sunset target: removed immediately (no consumers)
- Feature flag involved: none

## Validation

- Contract tests updated: not applicable
- Web/API compatibility verified: repository-wide search for `PaymentIntent` returns nothing
- Release note required: no
