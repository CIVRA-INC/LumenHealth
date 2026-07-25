export interface EventAttachmentRef {
  attachmentId: string;
  label: string;
  url: string;
}

export interface ClinicalEventNode {
  nodeId: string;
  patientId: string;
  eventType: string;
  heading: string;
  recordedAt: string;
  attachments?: EventAttachmentRef[];
}

export interface TimelineChronologyConfig {
  sortOrder: 'asc' | 'desc';
  groupByMonth: boolean;
}
