import {
  timelineQueryFilterSchema,
  type TimelineEvent,
  type TimelineQueryFilterInput,
} from '@qyou/shared';

export class ChartTimelineService {
  private readonly events: Map<string, TimelineEvent[]> = new Map();

  public async getPatientTimeline(filter: TimelineQueryFilterInput): Promise<TimelineEvent[]> {
    const validated = timelineQueryFilterSchema.parse(filter);
    const list = this.events.get(validated.patientId) ?? [];
    return list
      .filter((e) => !validated.categories || validated.categories.includes(e.category))
      .slice(0, validated.limit);
  }
}
