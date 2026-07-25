# Patient Records Timeline Aggregation Specification

This document details the aggregation logic, category breakdowns, and filter UI components for patient timeline events in LumenHealth.

## Components & Modules

1. **Aggregation Service**:
   - `apps/api/src/modules/records/services/chart-timeline-aggregation.service.ts`: `ChartTimelineAggregationService` generating event breakdown metrics.

2. **Web Filter Bar**:
   - `ChartTimelineFilterBar`: React UI component enabling filter toggles for event categories.

3. **Validation Schemas & Interfaces**:
   - `timelineAggregationResultSchema` and `TimelineAggregationResult` defined in `@qyou/shared`.
