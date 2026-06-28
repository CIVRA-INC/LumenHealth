import React, { useEffect, useState } from 'react';

interface Stats { active: number; revoked: number; archived: number; pending: number; }

export function DocumentStats({ patientId }: { patientId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    fetch(`/api/patients/${patientId}/documents/stats`)
      .then(r => r.json()).then(setStats).catch(() => {});
  }, [patientId]);
  if (!stats) return null;
  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      {Object.entries(stats).map(([k, v]) => (
        <div key={k} className="bg-white border rounded-lg p-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-800">{v}</p>
          <p className="text-xs text-gray-500 capitalize mt-1">{k}</p>
        </div>
      ))}
    </div>
  );
}
export default DocumentStats;
