"use client";

import { useState } from "react";
import type { Patient } from "@lumen/types";
import { useAuthSession } from "../../auth/session-provider";
import { usePatientApi } from "../_lib/use-patient-api";
import { parsePatientError, patientErrorCopy } from "../_lib/error-copy";
import type { PatientErrorCode } from "@lumen/types";

type Props = {
  patient: Patient;
  onArchived: (patient: Patient) => void;
};

type ArchiveStatus = "idle" | "loading" | "success" | "error";

export function PatientActions({ patient, onArchived }: Props) {
  const { session } = useAuthSession();
  const { fetchApi } = usePatientApi();
  // Mirror the controller's inline role gate from PR #739:
  // DELETE /api/v1/patients/:patientId requires owner|admin in addition
  // to the route-level `patient:write` permission. We hide the button for
  // clinician/cashier so they don't even issue a doomed DELETE.
  const canArchive =
    session?.role === "owner" || session?.role === "admin";
  const isAlreadyArchived = patient.status === "archived";
  const [status, setStatus] = useState<ArchiveStatus>("idle");
  const [notice, setNotice] = useState<string | null>(null);

  async function archive() {
    if (!canArchive || isAlreadyArchived) return;
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Archive ${patient.givenName} ${patient.familyName}? ` +
          "This sets status to archived and stamps archivedAt.",
      );
      if (!ok) return;
    }
    setStatus("loading");
    setNotice("Archiving patient...");
    const result = await fetchApi<{ patient?: Patient }>(
      `/api/v1/patients/${encodeURIComponent(patient.patientId)}`,
      { method: "DELETE" },
    );
    if (result.unauthorized) {
      setStatus("error");
      setNotice("Your session expired. Redirecting to sign-in...");
      return;
    }
    if (result.ok && result.body?.patient) {
      setStatus("success");
      setNotice("Patient archived.");
      onArchived(result.body.patient);
      return;
    }
    const fallback: PatientErrorCode =
      result.status === 403 ? "PATIENT_ACCESS_DENIED" : "PATIENT_NOT_FOUND";
    const err = parsePatientError(result.body, fallback);
    setStatus("error");
    setNotice(patientErrorCopy[err.error] ?? err.message);
  }

  if (!canArchive) {
    return (
      <div className="patientActions">
        <p className="patientActionsHint">
          Only clinic owners and admins can archive a patient.
        </p>
      </div>
    );
  }

  return (
    <div className="patientActions">
      <button
        type="button"
        className="primary patientActionsArchive"
        onClick={() => void archive()}
        disabled={status === "loading" || isAlreadyArchived}
      >
        {status === "loading"
          ? "Archiving..."
          : isAlreadyArchived
            ? "Already archived"
            : "Archive patient"}
      </button>
      {notice ? (
        <p
          className={`patientActionsNotice patientActionsNotice--${status}`}
          aria-live="polite"
        >
          {notice}
        </p>
      ) : null}
    </div>
  );
}
