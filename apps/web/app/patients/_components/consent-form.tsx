"use client";

import { useState } from "react";
import type { ConsentType } from "@lumen/types";
import { useAuthSession } from "../../auth/session-provider";
import { usePatientApi } from "../_lib/use-patient-api";

type Props = {
  patientId: string;
  onGranted: () => void;
};

const CONSENT_TYPES: ConsentType[] = [
  "data_processing",
  "sharing",
  "research",
  "communications",
];

const TYPE_DESCRIPTION: Record<ConsentType, string> = {
  data_processing: "Process my medical data for treatment and billing",
  sharing: "Share my data with referred specialists",
  research: "Use my anonymised data for research",
  communications: "Send me appointment reminders and updates",
};

export function ConsentForm({ patientId, onGranted }: Props) {
  const { session } = useAuthSession();
  const { fetchApi } = usePatientApi();
  const [selected, setSelected] = useState<ConsentType>("data_processing");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await fetchApi<{ consent: { id: string } }>(
      `/api/v1/patients/${encodeURIComponent(patientId)}/consent`,
      {
        method: "POST",
        body: JSON.stringify({
          type: selected,
          scope: ["all"],
        }),
      },
    );
    if (result.unauthorized) return;
    if (result.ok && result.body?.consent) {
      setSelected("data_processing");
      onGranted();
    } else {
      setError("Failed to grant consent. Please try again.");
    }
    setLoading(false);
  }

  return (
    <form className="consentForm" onSubmit={handleSubmit}>
      <fieldset className="consentFormFieldset" disabled={loading}>
        <legend className="consentFormLegend">Grant new consent</legend>
        {CONSENT_TYPES.map((t) => (
          <label key={t} className="consentTypeOption">
            <input
              type="radio"
              name="consentType"
              value={t}
              checked={selected === t}
              onChange={() => setSelected(t)}
            />
            <span>{TYPE_DESCRIPTION[t]}</span>
          </label>
        ))}
      </fieldset>
      {error ? (
        <p className="consentError" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="primary"
        disabled={loading}
      >
        {loading ? "Granting..." : "Grant consent"}
      </button>
    </form>
  );
}
