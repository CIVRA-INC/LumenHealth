# Patient Records Consent & Privacy Test Fixtures Specification

This document details the test fixture specifications for patient consent records, privacy preference scopes, and expiration rules in LumenHealth.

## Fixture Layout

1. **Web & API Seeds**:
   - `apps/web/src/fixtures/patient-consent.fixture.ts`: Web consent test fixture.
   - `apps/api/src/fixtures/patient-consent-api.fixture.ts`: API seed data fixture.

2. **Validation Schemas & Interfaces**:
   - `patientConsentRecordSchema` and `PatientConsentRecord` defined in `@qyou/shared`.
