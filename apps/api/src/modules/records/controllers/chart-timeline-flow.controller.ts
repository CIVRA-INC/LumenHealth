import {
  interactiveEventDetailSchema,
  type InteractiveEventDetail,
} from '@qyou/shared';

export class ChartTimelineFlowController {
  public async getEventDetails(eventId: string): Promise<InteractiveEventDetail> {
    const detail: InteractiveEventDetail = {
      eventId,
      fullNotes: 'Detailed clinical notes recorded during consultation session.',
      attachmentsCount: 2,
    };
    return interactiveEventDetailSchema.parse(detail);
  }
}
