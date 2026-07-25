# Patient Records Chart Timeline Service Specification

This document details the service layer architecture for aggregating and displaying patient health chart timeline events in LumenHealth.

## Components & Modules

1. **Timeline Service**:
   - `apps/api/src/modules/records/services/chart-timeline.service.ts`: `ChartTimelineService` handling category filtering and event limit slicing.

2. **Web Timeline Feed Component**:
   - `ChartTimelineFeed`: React UI feed component rendering chronological health event cards.

3. **Validation Schemas & Interfaces**:
   - `timelineQueryFilterSchema` and `TimelineEvent` defined in `@qyou/shared`.
