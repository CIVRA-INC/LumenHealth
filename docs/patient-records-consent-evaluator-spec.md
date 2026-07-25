# Patient Records Consent Evaluator Specification

This document details the consent evaluation logic, validity check services, and web client helpers in LumenHealth.

## Components & Modules

1. **Evaluator Service**:
   - `apps/api/src/modules/consent/services/consent-evaluator.service.ts`: `ConsentEvaluatorService` performing expiration & permission checks.

2. **Web Client Helper**:
   - `apps/web/src/lib/patient-consent-evaluator-client.ts`: Utility function `isPatientConsentActive`.

3. **Validation Schemas & Interfaces**:
   - `privacyConsentPolicySchema` and `ConsentCheckResult` defined in `@qyou/shared`.
