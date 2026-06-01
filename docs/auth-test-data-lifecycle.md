# Auth Test Data Lifecycle

Closes #557

## Purpose

This document explains how auth test data should be created, reused, and cleaned up in contributor-run environments.

## Lifecycle Rules

1. Prefer deterministic fixtures over ad-hoc inline objects.
2. Keep per-test data local to the test file unless a shared fixture is explicitly documented.
3. Clean up any persisted auth state after each test or test suite run.
4. Never rely on state created by a previous test run unless the fixture itself resets it.

## Workspace Guidance

- `apps/api`: reset session/token stores between integration tests.
- `apps/web`: clear browser storage or mocked session state after each auth test.
- `apps/mobile`: clear secure-storage mocks and any bootstrap cache between runs.
- `packages/types`: keep fixtures shape-only and free of runtime setup.

## Verification Notes

- If a test writes auth state, the test should also prove the cleanup path.
- If a test uses a shared fixture, document the fixture source and reset behavior.
- If a suite depends on order, it needs to be refactored before milestone closeout.

