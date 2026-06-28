import { useState, useCallback } from "react";

export interface ConsentRecord {
  id: string;
  patientId: string;
  type: ConsentType;
  status: ConsentStatus;
  grantedAt?: string;
  revokedAt?: string;
  expiresAt?: string;
  scope: string[];
}

export type ConsentType = "data_processing" | "sharing" | "research" | "communications";
export type ConsentStatus = "active" | "revoked" | "expired";

interface UseConsentOptions {
  patientId: string;
}

export function useConsent({ patientId }: UseConsentOptions) {
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConsents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/consent`);
      if (!res.ok) throw new Error("Failed to fetch consent records");
      const data = await res.json();
      setConsents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  const grantConsent = useCallback(
    async (type: ConsentType, scope: string[]) => {
      const res = await fetch(`/api/patients/${patientId}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, scope }),
      });
      if (!res.ok) throw new Error("Failed to grant consent");
      await fetchConsents();
    },
    [patientId, fetchConsents]
  );

  const revokeConsent = useCallback(
    async (consentId: string) => {
      const res = await fetch(`/api/patients/${patientId}/consent/${consentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke consent");
      await fetchConsents();
    },
    [patientId, fetchConsents]
  );

  return { consents, loading, error, fetchConsents, grantConsent, revokeConsent };
}
