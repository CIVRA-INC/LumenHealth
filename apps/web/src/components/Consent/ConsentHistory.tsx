import React, { useEffect, useState } from 'react';

interface ConsentRecord {
  id: string; consentType: string; status: string;
  grantedAt?: string; revokedAt?: string; expiresAt?: string;
}

export function ConsentHistory({ patientId }: { patientId: string }) {
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`/api/patients/${patientId}/consents`)
      .then(r => r.json()).then(setRecords).finally(() => setLoading(false));
  }, [patientId]);
  if (loading) return <div className="text-sm text-gray-400 p-4">Loading consent history...</div>;
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-gray-700 text-sm">Consent History</h3>
      {records.length === 0 ? <p className="text-gray-400 text-sm">No consent records</p> : (
        <table className="w-full text-sm border rounded-lg overflow-hidden">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Granted</th><th className="px-3 py-2 text-left">Expires</th></tr>
          </thead>
          <tbody className="divide-y">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 capitalize">{r.consentType.replace(/_/g,' ')}</td>
                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status==='granted'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{r.status}</span></td>
                <td className="px-3 py-2 text-gray-500">{r.grantedAt ? new Date(r.grantedAt).toLocaleDateString() : '—'}</td>
                <td className="px-3 py-2 text-gray-500">{r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : 'Never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
export default ConsentHistory;
