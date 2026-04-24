# Contract Versioning Policy

LumenHealth treats shared contracts as compatibility surfaces between `apps/api`, `apps/web`, `apps/stellar-service`, and any future mobile client. Contributors must classify contract changes before merging.

## Scope

This policy applies to:

- `@lumen/types`
- public exports from `@lumen/config`
- HTTP request and response contracts exposed by the API
- persisted payloads consumed by background workers or external tools

## Change Types

### Additive

Safe to ship in the next minor release:

- adding optional response fields
- adding optional request fields
- exporting new helper types or schemas
- adding new feature-flag keys with documented defaults

### Compatibility-sensitive

Requires an explicit rollout note and deprecation window:

- tightening validation on existing inputs
- renaming status values while still accepting the old values temporarily
- changing default behavior behind a feature flag
- making formerly optional fields required in new write paths

### Breaking

Requires coordinated release notes and a sunset plan:

- removing request or response fields
- removing exported schemas or helpers from shared packages
- changing enum values without fallback support
- changing auth, queue, patient, payment, or audit payload shapes incompatibly

## Required Contributor Workflow

1. Identify whether the change is additive, compatibility-sensitive, or breaking.
2. If the change affects a shared package or public API, complete the contract change section in the PR template.
3. For compatibility-sensitive or breaking changes, add a changelog entry from `CONTRACT_CHANGELOG_TEMPLATE.md`.
4. If the change alters architectural boundaries or long-lived public contracts, open or link an ADR/RFC before merge.

## Deprecation Windows

- Additive changes may ship immediately once downstream clients tolerate them.
- Compatibility-sensitive changes require at least one release window where old and new behavior coexist.
- Breaking changes require maintainer approval, release notes, and a removal target.

## Review Checklist

- Does the change alter a public API request or response?
- Does the change alter a shared package export?
- Can current web, API, worker, and future mobile consumers continue to function?
- Is a feature flag or deprecation window required?
- Has the changelog template been completed when compatibility is affected?
