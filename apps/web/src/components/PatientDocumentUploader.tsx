import React from 'react';
import type { DocumentCategory } from '@qyou/shared';

interface PatientDocumentUploaderProps {
  patientId: string;
  onUploadSuccess?: (docId: string) => void;
}

export function PatientDocumentUploader({ patientId, onUploadSuccess }: PatientDocumentUploaderProps) {
  return (
    <div style={{ padding: '16px', border: '1px dashed #cbd5e1', borderRadius: '8px', background: '#f8fafc' }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b' }}>Upload Patient Document</h4>
      <input type="text" placeholder="Document Title" style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
      <select style={{ width: '100%', padding: '8px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
        <option value="lab_report">Lab Report</option>
        <option value="prescription">Prescription</option>
        <option value="imaging">Imaging</option>
        <option value="discharge_summary">Discharge Summary</option>
      </select>
      <button style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Attach File
      </button>
    </div>
  );
}
