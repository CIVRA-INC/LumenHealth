# Patient Records API Fixtures & Test Foundation

This document outlines the API test fixture structure, mock document attachment seeds, and validation rules for patient records integration tests.

## API Test Fixtures & Validation

1. **API Seed Data & Validator**:
   - `apps/api/src/fixtures/patient-documents-api.fixture.ts`: Mock API attachment seeds.
   - `apps/api/src/modules/documents/validators/document-fixture.validator.ts`: Safe parsing for test fixture payloads.

2. **Validation Schemas & Interfaces**:
   - `apiDocumentFixtureSchema` and `MockAttachmentResponse` defined in `@qyou/shared`.
