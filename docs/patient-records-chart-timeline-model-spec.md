# Patient Records Chart Timeline Model Specification

This document outlines the data model structures, repository storage abstractions, and node schemas for patient chart timeline events in LumenHealth.

## Components & Modules

1. **Repository & UI Component**:
   - `apps/api/src/modules/records/repositories/in-memory-timeline.repository.ts`: Repository storing clinical event nodes.
   - `ChartTimelineNodeCard`: React UI card rendering clinical event node attributes.

2. **Validation Schemas & Interfaces**:
   - `clinicalEventNodeSchema` and `ClinicalEventNode` defined in `@qyou/shared`.
