import { useState, useCallback } from "react";

export interface Demographics {
  patientId: string;
  dateOfBirth?: string;
  gender?: string;
  ethnicity?: string;
  nationality?: string;
  preferredLanguage?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  phoneNumber?: string;
  occupation?: string;
}

interface UseDemographicsOptions {
  patientId: string;
}

export function useDemographics({ patientId }: UseDemographicsOptions) {
  const [demographics, setDemographics] = useState<Demographics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDemographics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/demographics`);
      if (!res.ok) throw new Error("Failed to fetch demographics");
      const data = await res.json();
      setDemographics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  const updateDemographics = useCallback(
    async (data: Partial<Demographics>) => {
      const res = await fetch(`/api/patients/${patientId}/demographics`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update demographics");
      await fetchDemographics();
    },
    [patientId, fetchDemographics]
  );

  return { demographics, loading, error, fetchDemographics, updateDemographics };
}
