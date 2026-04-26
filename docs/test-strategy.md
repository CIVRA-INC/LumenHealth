# Test Strategy

## Testing Pyramid

The project follows a layered testing pyramid:

1. **Unit Tests** — Fast, isolated tests for individual functions and modules.
2. **Integration Tests** — Tests verifying interactions between components (e.g., API + database).
3. **End-to-End (E2E) Tests** — Full-flow tests simulating real user behaviour across the stack.

## Tooling

| Layer       | Tool        | Purpose                                 |
|-------------|-------------|-----------------------------------------|
| Unit        | Vitest      | Fast unit testing for TS/JS modules     |
| API Integration | Supertest | HTTP-level integration tests for NestJS |
| E2E         | Playwright  | Browser-based end-to-end testing        |

## Coverage Targets

- **Unit tests**: minimum 80% line and branch coverage enforced in CI.
- **Integration tests**: all critical API paths must have at least one integration test.
- **E2E tests**: core user journeys (auth, key workflows) must be covered.

## Folder Conventions

- Unit tests: placed alongside source files as `*.spec.ts`
- Integration tests: placed in `tests/` subdirectories as `*.integration.ts`
- E2E tests: placed in `e2e/` at the app root as `*.e2e.ts`

## CI Enforcement

- Unit and integration tests run on every pull request via GitHub Actions.
- Coverage reports are uploaded as artifacts and checked against thresholds.
- E2E tests run on merges to `main` and release branches.
- Failing coverage thresholds or test failures block merges.
