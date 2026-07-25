# Patient Records UI Flow & API Controller Guide

This document specifies the UI flow for viewing and managing patient health document attachments in LumenHealth.

## Components & Modules

1. **API Controller**:
   - `apps/api/src/modules/documents/controllers/patient-document.controller.ts`: Endpoint handler serving document previews.

2. **Web Viewer Component**:
   - `PatientDocumentViewer`: React UI component for interactive patient document previews.

3. **Validation Schemas & Interfaces**:
   - `documentPreviewRequestSchema` and `DocumentViewerState` defined in `@qyou/shared`.
