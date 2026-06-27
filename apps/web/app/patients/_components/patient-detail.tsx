"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Patient } from "@lumen/types";
import { useAuthSession } from "../../auth/session-provider";
import { usePatientApi } from "../_lib/use-patient-api";
import { PatientForm } from "./patient-form";
import { PatientActions } from "./patient-actions";

type FetchState = "loading" | "ready" | "notfound" | "forbidden" | "error";

type Props = {
  patientId: string;
};

export function PatientDetail({ patientId }: Props) {
  const { session } = useAuthSession();
  const { fetchApi } = usePatientApi();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [state, setState] = useState<FetchState>("loading");
  const [notice, setNotice] = useState<string>("Loading patient record...");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchApi<{ patient?: Patient }>(
        `/api/v1/patients/${encodeURIComponent(patientId)}`,
      );
      if (cancelled) return;
      handleResult(result);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  function handleResult(result: {
    ok: boolean;
    status: number;
    body: { patient?: Patient } | null;
    unauthorized: boolean;
  }) {
    if (result.unauthorized) {
      setState("error");
      setNotice("Your session expired. Redirecting to sign-in...");
      return;
    }
    if (result.ok && result.body?.patient) {
      setPatient(result.body.patient);
      setState("ready");
      setNotice("Patient record loaded.");
      return;
    }
    if (result.status === 404) {
      setState("notfound");
      setNotice("We couldn't find that patient in your clinic.");
      setPatient(null);
      return;
    }
    if (result.status === 403) {
      setState("forbidden");
      setNotice("You don't have permission to view this patient.");
      setPatient(null);
      return;
    }
    setState("error");
    setNotice("We couldn't load this patient.");
  }

  if (state === "loading") {
    return (
      <main className="authPage">
        <section className="patientCard">
          <div className="authStatus authStatus--loading" aria-live="polite">
            <p>{notice}</p>
          </div>
        </section>
      </main>
    );
  }

  if (state === "notfound" || state === "forbidden" || state === "error") {
    return (
      <main className="authPage">
        <section className="patientCard">
          <div className="patientCardContent">
            <p className="eyebrow">Patient records</p>
            <h1>Patient unavailable</h1>
          </div>
          <div className="authStatus authStatus--error" aria-live="polite">
            <p>{notice}</p>
          </div>
          <div className="authFooter">
            <Link href="/patients" className="authSwitchLink">
              Back to roster
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!patient) {
    return null;
  }
  const p = patient;
  return (
    <main className="authPage">
      <article className="patientCard">
        <div className="patientCardContent">
          <p className="eyebrow">Patient · {p.identifier}</p>
          <h1>
            {p.givenName} {p.familyName}
          </h1>
          <p className="lede">
            Patient record for the {session?.role ?? "unknown"} role in clinic{" "}
            {p.clinicId}. Use the editor below to change mutable fields; the
            identifier cannot be edited.
          </p>
        </div>

        <section className="patientFacts" aria-label="Patient facts">
          <dl>
            <div>
              <dt>Status</dt>
              <dd>
                <span
                  className={`patientStatusBadge patientStatusBadge--${p.status}`}
                >
                  {p.status}
                </span>
              </dd>
            </div>
            <div>
              <dt>Born</dt>
              <dd>{p.birthDate}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{p.phone}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{p.email}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{p.address}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{new Date(p.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{new Date(p.updatedAt).toLocaleString()}</dd>
            </div>
            {p.archivedAt ? (
              <div>
                <dt>Archived at</dt>
                <dd>{new Date(p.archivedAt).toLocaleString()}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="patientEditSection">
          <h2>Edit details</h2>
          <PatientForm mode="edit" initial={p} onSuccess={setPatient} />
        </section>

        <section className="patientArchiveSection">
          <h2>Archive</h2>
          <PatientActions patient={p} onArchived={setPatient} />
        </section>

        <div className="authFooter">
          <Link href="/patients" className="authSwitchLink">
            Back to roster
          </Link>
        </div>
      </article>
    </main>
  );
}
