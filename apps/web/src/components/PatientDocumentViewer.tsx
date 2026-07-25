import React from 'react';

interface PatientDocumentViewerProps {
  documentId?: string;
  documentTitle?: string;
  fileName?: string;
}

export function PatientDocumentViewer({
  documentId = 'doc_101',
  documentTitle = 'Sample Health Report',
  fileName = 'report.pdf',
}: PatientDocumentViewerProps) {
  return (
    <div style={{ padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>{documentTitle}</h3>
        <span style={{ fontSize: '12px', color: '#64748b' }}>{fileName}</span>
      </div>
      <div style={{ marginTop: '12px', padding: '24px', background: '#f8fafc', textAlignment: 'center', borderRadius: '4px', color: '#94a3b8' }}>
        Document Preview Container ({documentId})
      </div>
    </div>
  );
}
