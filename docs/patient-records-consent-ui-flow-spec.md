# Patient Records Consent UI Flow Specification

This document outlines the UI modal flow, digital signature submission, and backend controller endpoints for patient consent in LumenHealth.

## Components & Modules

1. **Web Consent Form Modal**:
   - `PatientConsentFormModal`: React component rendering consent terms and signature action triggers.

2. **API Signature Controller**:
   - `apps/api/src/modules/consent/controllers/patient-consent-flow.controller.ts`: Controller accepting digital signature payloads.

3. **Validation Schemas & Interfaces**:
   - `consentSignaturePayloadSchema` and `ConsentFormStep` defined in `@qyou/shared`.
