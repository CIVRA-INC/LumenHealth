# Authentication MVP Closeout Criteria

Closes #560

## Purpose

Use this checklist when deciding whether the authentication milestone is ready for a closeout review.

## Closeout Criteria

- The shared auth contracts in `packages/types` are the source of truth.
- API, web, and mobile each have a documented ownership boundary.
- The main login, logout, refresh, and protected-session flows are covered by tests or verification notes.
- Error states and recovery paths are documented for contributors.
- Workspace boundary checks pass without cross-app imports.
- Security-sensitive values are documented in one place and not scattered across workspace READMEs.

## Recommended Review Evidence

- A short list of the implemented auth routes or screens.
- The tests that cover the happy path and one meaningful failure path.
- A note on any deferred follow-up work that must happen after the MVP slice.

## What Not To Do

- Do not close the milestone based on docs alone.
- Do not count duplicated app-local types as coverage.
- Do not hide missing validation behind UI-only behavior.

