# Auth Issue Writeup Examples

Closes #558

## Purpose

These examples show the level of detail expected for future auth milestone issues.

## Example 1: API Contract Issue

**Good issue title**

`AUTH-101 Define a typed session refresh contract for API and clients`

**Good issue body**

- Summary: define the shared refresh payload and the failure modes.
- Scope: update `packages/types`, `apps/api`, and the client docs.
- Acceptance: include one happy path, one invalid-token path, and a note for future rotation work.

## Example 2: Web or Mobile Shell Issue

**Good issue title**

`AUTH-102 Harden the protected navigation shell`

**Good issue body**

- Summary: describe where the protected shell owns bootstrap, redirects, and session restoration.
- Scope: keep UI behavior in the app workspace and contracts in `packages/types`.
- Acceptance: document the fallback state, loading state, and invalid session state.

## Example 3: Docs or QA Issue

**Good issue title**

`AUTH-103 Document auth test fixtures and cleanup rules`

**Good issue body**

- Summary: explain how contributors should prepare auth fixtures and clean them up.
- Scope: update the docs and any test notes that need to match.
- Acceptance: include a reusable fixture pattern and a cleanup checklist.

## Writing Checklist

- State the owner workspace first.
- State the shared contract or route involved.
- Include at least one validation note.
- Keep the issue small enough for one reviewable PR.

