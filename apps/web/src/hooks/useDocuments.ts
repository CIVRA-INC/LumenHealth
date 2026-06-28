import { useState, useEffect, useCallback } from 'react';

interface Doc { id: string; fileName: string; documentType: string; status: string; mimeType: string; fileSizeBytes: number; createdAt: string; }
interface UseDocumentsResult { docs: Doc[]; total: number; loading: boolean; error: string|null; refetch: () => void; }

export function useDocuments(patientId: string, params?: Record<string, string>): UseDocumentsResult {
  const [docs, setDocs]     = useState<Doc[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string|null>(null);
  const [tick, setTick]     = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    setLoading(true);
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    fetch(`/api/patients/${patientId}/documents${qs}`)
      .then(r => r.json())
      .then(data => {
        setDocs(Array.isArray(data) ? data : data.items ?? []);
        setTotal(data.total ?? (Array.isArray(data) ? data.length : 0));
        setError(null);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [patientId, tick, JSON.stringify(params)]);

  return { docs, total, loading, error, refetch };
}
