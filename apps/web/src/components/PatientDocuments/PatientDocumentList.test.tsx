import React from 'react';
import { render, screen } from '@testing-library/react';
import { PatientDocumentList } from './PatientDocumentList';

global.fetch = jest.fn();

describe('PatientDocumentList', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve([{
        id: '1', fileName: 'test.pdf',
        documentType: 'lab_result', status: 'active',
        mimeType: 'application/pdf', fileSizeBytes: 1024,
        createdAt: '2026-06-01T00:00:00Z',
      }]),
    });
  });
  it('renders loading state initially', () => {
    render(<PatientDocumentList patientId="p1" />);
    expect(screen.getByText(/loading/i)).toBeTruthy();
  });
});
