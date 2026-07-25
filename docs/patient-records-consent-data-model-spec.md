# Patient Records Consent Data Model Specification

This document details the data models, repository abstractions, and Zod schemas for patient consent rules and data-sharing preferences in LumenHealth.

## Data Models & Repositories

1. **Repository & UI Card**:
   - `apps/api/src/modules/consent/repositories/in-memory-consent.repository.ts`: Repository managing in-memory storage of privacy rules.
   - `ConsentPrivacyPolicyCard`: React component displaying policy versioning and data sharing toggles.

2. **Validation Schemas & Interfaces**:
   - `privacySettingRuleSchema` and `PrivacySettingRule` defined in `@qyou/shared`.
