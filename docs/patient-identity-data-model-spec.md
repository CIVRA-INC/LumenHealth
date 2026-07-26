# Patient Identity Data Model Specification

This specification defines the core data model schema for patient master records, identity attributes, and record status.

## Data Model & Schemas
- **`PatientIdentityModel`**: Defines national ID, full name, DOB, gender, blood group, emergency contact details.
- **`PatientRecordHeader`**: Defines record status (`active`, `archived`, `pending_verification`) and primary clinic linkage.
- **Zod Schemas**: Validated via `patientIdentityModelSchema` and `patientRecordHeaderSchema` in `@qyou/shared`.
