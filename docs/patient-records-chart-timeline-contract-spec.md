# Patient Records Chart Timeline API Contract Specification

This document specifies the contract endpoints, envelope schemas, and client validation for patient chart timeline APIs in LumenHealth.

## Components & Contracts

1. **Controller & Web Client**:
   - `apps/api/src/modules/records/controllers/chart-timeline.controller.ts`: API endpoint handler serving timeline event envelopes.
   - `apps/web/src/lib/chart-timeline-api-client.ts`: Client fetcher validating timeline response envelopes.

2. **Validation Schemas & Interfaces**:
   - `timelineApiResponseEnvelopeSchema` and `TimelineEventContract` defined in `@qyou/shared`.
