# Patient Records Chart Timeline UI Flow Specification

This document details the UI interaction flows, view mode state management, and detailed event expansion features in LumenHealth.

## Components & Modules

1. **Web Viewer Component**:
   - `ChartTimelineInteractiveViewer`: React component managing timeline view mode state.

2. **API Flow Controller**:
   - `apps/api/src/modules/records/controllers/chart-timeline-flow.controller.ts`: Controller returning expanded event details.

3. **Validation Schemas & Interfaces**:
   - `timelineFilterStateSchema` and `TimelineViewMode` defined in `@qyou/shared`.
