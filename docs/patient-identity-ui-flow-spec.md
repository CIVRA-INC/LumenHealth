# Patient Identity UI Flow & Verification Specification

This document describes the user interface workflow, tab state navigation, and Stellar identity verification API contract for patient master records.

## UI Flow & Architecture
- **`PatientIdentityCard`**: Web UI component displaying patient master record headers.
- **`PatientIdentityUIState`**: Shared UI state schema for active tab navigation.
- **Stellar Verification Contract**: `verifyStellarPatientIdentity` endpoint for blockchain verification.
- **Contract Tests**: Verified in `patient-identity.contract.test.ts`.
