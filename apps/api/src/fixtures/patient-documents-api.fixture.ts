import type { ApiDocumentFixture } from '@qyou/shared';

export const mockApiDocumentFixtures: ApiDocumentFixture[] = [
  {
    fixtureId: 'fix_lab_001',
    description: 'Valid Lab Report Attachment Seed',
    mockAttachment: {
      attachmentId: 'att_9910',
      originalFileName: 'blood_test_results.pdf',
      storagePath: '/mock/storage/att_9910.pdf',
      status: 'valid',
    },
  },
  {
    fixtureId: 'fix_imaging_002',
    description: 'Chest X-Ray DICOM Attachment Seed',
    mockAttachment: {
      attachmentId: 'att_9911',
      originalFileName: 'chest_xray.dcm',
      storagePath: '/mock/storage/att_9911.dcm',
      status: 'valid',
    },
  },
];
