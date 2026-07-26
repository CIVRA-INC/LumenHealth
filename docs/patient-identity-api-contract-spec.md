# Patient Identity API Contract Specification

This specification defines the HTTP API contract, payload schemas, and response validation for patient identity endpoints across web and mobile.

## API Endpoints & Contracts
- **`GET /api/patient-identity/:id`**: Returns `PatientIdentityContractResponse`.
- **`PatientIdentityContractResponse`**: Validated by `patientIdentityContractResponseSchema`.
- **Clients**: `fetchPatientIdentityApi` (web) and `mobileFetchPatientIdentity` (mobile).
- **Service Tests**: Tested via `patient-identity.service.test.ts`.
