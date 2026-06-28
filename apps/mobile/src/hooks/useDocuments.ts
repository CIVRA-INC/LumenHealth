import { useState, useEffect } from 'react';

interface Doc { id: string; fileName: string; documentType: string; status: string; }

export function useDocuments(patientId: string) {
  const [docs, setDocs]       = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchDocs = () => {
    setLoading(true);
    fetch(`/api/patients/${patientId}/documents`)
      .then(r => r.json())
      .then(data => { setDocs(Array.isArray(data) ? data : data.items ?? []); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDocs(); }, [patientId]);
  return { docs, loading, error, refetch: fetchDocs };
}
