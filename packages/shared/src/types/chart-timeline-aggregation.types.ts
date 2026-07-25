export type EventSeverityLevel = 'routine' | 'important' | 'critical';

export interface CategorySummaryCount {
  category: string;
  count: number;
}

export interface TimelineAggregationResult {
  patientId: string;
  totalEventsCount: number;
  categoryBreakdown: CategorySummaryCount[];
  hasCriticalEvents: boolean;
}
