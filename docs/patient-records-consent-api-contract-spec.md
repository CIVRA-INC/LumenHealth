# Patient Records Consent API Contract Specification

This document specifies the contract endpoints, envelope formats, and client parsers for patient consent & privacy status APIs in LumenHealth.

## Components & Contracts

1. **Controller & Web Client**:
   - `apps/api/src/modules/consent/controllers/patient-consent.controller.ts`: Endpoint serving consent status envelope.
   - `apps/web/src/lib/patient-consent-api-client.ts`: Web client helper parsing consent API envelopes.

2. **Validation Schemas & Interfaces**:
   - `consentApiEnvelopeSchema` and `ConsentStatusApiResponse` defined in `@qyou/shared`.
