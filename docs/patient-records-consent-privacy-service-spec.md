# Patient Records Consent & Privacy Service Specification

This document outlines the service layer implementation for granting and revoking patient consents and auditing privacy setting changes in LumenHealth.

## Components & Modules

1. **Consent Service**:
   - `apps/api/src/modules/consent/services/patient-consent.service.ts`: `PatientConsentService` handling grant and revocation logic.

2. **Web UI Status Badge**:
   - `PatientConsentStatusBadge`: React UI component for privacy status badges.

3. **Validation Schemas & Interfaces**:
   - `consentGrantPayloadSchema` and `ConsentGrantPayload` defined in `@qyou/shared`.
