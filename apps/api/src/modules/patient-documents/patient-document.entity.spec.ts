import { DocumentType, DocumentStatus } from './entities/patient-document.entity';

describe('PatientDocument enums', () => {
  it('DocumentType has all expected values', () => {
    expect(DocumentType.LAB_RESULT).toBe('lab_result');
    expect(DocumentType.PRESCRIPTION).toBe('prescription');
    expect(DocumentType.IMAGING).toBe('imaging');
    expect(DocumentType.DISCHARGE).toBe('discharge_summary');
    expect(DocumentType.CONSENT_FORM).toBe('consent_form');
    expect(DocumentType.OTHER).toBe('other');
  });
  it('DocumentStatus has all expected values', () => {
    expect(DocumentStatus.PENDING).toBe('pending');
    expect(DocumentStatus.ACTIVE).toBe('active');
    expect(DocumentStatus.REVOKED).toBe('revoked');
    expect(DocumentStatus.ARCHIVED).toBe('archived');
  });
  it('has 6 document types', () => {
    expect(Object.keys(DocumentType)).toHaveLength(6);
  });
  it('has 4 statuses', () => {
    expect(Object.keys(DocumentStatus)).toHaveLength(4);
  });
});
