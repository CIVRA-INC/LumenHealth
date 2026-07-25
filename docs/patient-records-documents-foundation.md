# Patient Records Foundation — Documents & Attachments

This document outlines the foundation specifications for patient document attachments, test fixtures, and validation schemas in LumenHealth.

## Architecture

1. **Document Attachment Types & Validation**:
   - Interfaces `PatientDocument`, `AttachmentMetadata`, and `DocumentCategory` defined in `@qyou/shared`.
   - Zod validation via `uploadPatientDocumentSchema`.

2. **Web Component & Fixtures**:
   - `PatientDocumentUploader`: React UI component for attaching and organizing patient health files.
   - `mockPatientDocumentsFixture`: Standardized test data fixture for document management.
