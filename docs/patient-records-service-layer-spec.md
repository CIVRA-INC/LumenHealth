# Patient Records Service Layer Specification

This document details the service layer architecture for processing patient document uploads, virus scans, and storage URL generation in LumenHealth.

## Architecture

1. **Service Component**:
   - `apps/api/src/modules/documents/services/patient-document.service.ts`: `PatientDocumentService` validating checksums and handling storage uploads.

2. **Web API Client**:
   - `apps/web/src/lib/patient-document-api.ts`: API client function `submitDocumentProcessing`.

3. **Validation Schemas & Interfaces**:
   - `documentProcessingRequestSchema` and `DocumentUploadResult` defined in `@qyou/shared`.
