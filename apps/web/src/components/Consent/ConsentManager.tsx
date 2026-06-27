import React, { useEffect, useState } from 'react';

interface Consent {
  id: string;
  consentType: string;
  status: string;
  grantedAt?: string;
  revokedAt?: string;
  expiresAt?: string;
}

const STATUS_COLOR: Record<string, string> = {
  granted:  'text-green-700 bg-green-50 border-green-200',
  revoked:  'text-red-700   bg-red-50   border-red-200',
  expired:  'text-gray-500  bg-gray-50  border-gray-200',
  pending:  'text-yellow-700 bg-yellow-50 border-yellow-200',
};

export function ConsentManager({ patientId }: { patientId: string }) {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/patients/${patientId}/consents`)
      .then(r => r.json())
      .then(data => { setConsents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [patientId]);

  const revoke = async (id: string) => {
    await fetch(`/api/patients/${patientId}/consents/${id}/revoke`, { method: 'PATCH' });
    setConsents(prev => prev.map(c => c.id === id ? { ...c, status: 'revoked' } : c));
  };

  if (loading) return <div className="text-sm text-gray-400 p-4">Loading consents...</div>;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-700 text-sm">Consent Management</h3>
      {consents.length === 0 ? (
        <p className="text-gray-400 text-sm">No consent records found</p>
      ) : (
        consents.map(consent => (
          <div key={consent.id} className={`border rounded-lg p-3 text-sm ${STATUS_COLOR[consent.status]}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium capitalize">{consent.consentType.replace(/_/g, ' ')} Consent</span>
              <span className="text-xs uppercase font-semibold">{consent.status}</span>
            </div>
            {consent.status === 'granted' && (
              <button onClick={() => revoke(consent.id)}
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline">
                Revoke consent
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default ConsentManager;
