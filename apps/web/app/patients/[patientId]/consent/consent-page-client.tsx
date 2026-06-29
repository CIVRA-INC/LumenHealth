"use client";

import { useState, useEffect, useCallback } from "react";
import type { ConsentRecord } from "@lumen/types";
import { useAuthSession } from "../../../auth/session-provider";
import { usePatientApi } from "../../_lib/use-patient-api";
import { ConsentList } from "../../_components/consent-list";
import { ConsentForm } from "../../_components/consent-form";

type Props = {
  patientId: string;
};

export function ConsentPageClient({ patientId }: Props) {
  const { session } = useAuthSession();
  const { fetchApi } = usePatientApi();
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadConsents = useCallback(async () => {
    const result = await fetchApi<{ consents: ConsentRecord[] }>(
      `/api/v1/patients/${encodeURIComponent(patientId)}/consent`,
    );
    if (result.ok && result.body) {
      setConsents(result.body.consents);
    }
  }, [fetchApi, patientId]);

  useEffect(() => {
    loadConsents();
  }, [loadConsents]);

  async function handleRevoke(consentId: string) {
    setRevoking(consentId);
    const result = await fetchApi<{ consent: ConsentRecord }>(
      `/api/v1/patients/${encodeURIComponent(patientId)}/consent/${consentId}`,
      { method: "DELETE" },
    );
    if (result.ok) {
      await loadConsents();
    }
    setRevoking(null);
  }

  return (
    <div className="consentPage">
      <ConsentForm patientId={patientId} onGranted={loadConsents} />
      <section className="consentSection">
        <h2>Consent records</h2>
        <ConsentList
          consents={consents}
          onRevoke={handleRevoke}
          revoking={revoking}
        />
      </section>
    </div>
  );
}
