import React, { useState } from 'react';
import { PatientDocumentList } from '../components/PatientDocuments/PatientDocumentList';
import { DocumentUploadForm } from '../components/PatientDocuments/DocumentUploadForm';

export function PatientDocumentsPage({ patientId }: { patientId: string }) {
  const [showUpload, setShowUpload] = useState(false);
  const [refresh, setRefresh] = useState(0);
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Patient Documents</h1>
      {showUpload ? (
        <div className="mb-6 bg-white border rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 text-sm mb-3">Upload Document</h2>
          <DocumentUploadForm
            patientId={patientId}
            onSuccess={() => { setShowUpload(false); setRefresh(r => r + 1); }}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      ) : null}
      <PatientDocumentList
        key={refresh}
        patientId={patientId}
        onUpload={() => setShowUpload(true)}
      />
    </div>
  );
}
export default PatientDocumentsPage;
