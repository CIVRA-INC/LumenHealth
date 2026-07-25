# Patient Records Consent Web & API Test Fixtures Specification

This document details the test fixture specifications for web & API privacy preferences, opt-in/opt-out toggles, and test assertions in LumenHealth.

## Fixture Layout

1. **Web & API Test Fixtures**:
   - `apps/web/src/fixtures/patient-privacy-preferences.fixture.ts`: Web mock privacy preferences fixture.
   - `apps/api/src/fixtures/patient-privacy-audit-api.fixture.ts`: API seed data fixture.

2. **Validation Schemas & Interfaces**:
   - `mockPrivacyPreferencePayloadSchema` and `MockPrivacyPreferencePayload` defined in `@qyou/shared`.
