export type TimelineViewMode = 'chronological' | 'compact' | 'expanded';

export interface TimelineFilterState {
  searchQuery: string;
  selectedCategory?: string;
  viewMode: TimelineViewMode;
}

export interface InteractiveEventDetail {
  eventId: string;
  fullNotes: string;
  attachmentsCount: number;
}
