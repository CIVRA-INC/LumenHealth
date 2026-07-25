# Patient Records Data Model Specification

This document details the data model specifications for patient document storage policies, access control levels, and metadata schemas.

## Data Model & Repository

1. **Access Control & Storage Policies**:
   - `DocumentAccessControl`, `DocumentStoragePolicy`, and `AccessLevel` interfaces defined in `@qyou/shared`.
   - Zod schemas `documentAccessControlSchema` and `storagePolicySchema`.

2. **Repository & UI Components**:
   - `InMemoryDocumentRepository`: Manages in-memory storage of document access policies.
   - `DocumentMetadataCard`: React component displaying document retention and security attributes.
