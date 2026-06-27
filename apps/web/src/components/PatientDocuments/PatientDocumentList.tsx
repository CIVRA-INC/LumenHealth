import React, { useEffect, useState } from 'react';

interface PatientDocument {
  id: string;
  fileName: string;
  documentType: string;
  status: string;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: string;
  description?: string;
}

interface PatientDocumentListProps {
  patientId: string;
  onUpload?: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  active:   'bg-green-100 text-green-800',
  revoked:  'bg-red-100   text-red-800',
  archived: 'bg-gray-100  text-gray-600',
  pending:  'bg-yellow-100 text-yellow-800',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function PatientDocumentList({ patientId, onUpload }: PatientDocumentListProps) {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/patients/${patientId}/documents`)
      .then(r => r.json())
      .then(data => { setDocuments(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [patientId]);

  if (loading) return <div className="p-4 text-gray-500 text-sm">Loading documents...</div>;
  if (error)   return <div className="p-4 text-red-500 text-sm">Error: {error}</div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 text-sm">Documents ({documents.length})</h3>
        {onUpload && (
          <button onClick={onUpload}
            className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            + Upload
          </button>
        )}
      </div>

      {documents.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">No documents found</p>
      ) : (
        <ul className="divide-y border rounded-lg overflow-hidden">
          {documents.map(doc => (
            <li key={doc.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.fileName}</p>
                <p className="text-xs text-gray-400">
                  {doc.documentType.replace(/_/g, ' ')} · {formatBytes(doc.fileSizeBytes)} · {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[doc.status] || 'bg-gray-100'}` }>
                {doc.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PatientDocumentList;
