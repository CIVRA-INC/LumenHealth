"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PatientListItem, PatientListPage } from "@lumen/types";
import { useAuthSession } from "../../auth/session-provider";
import { usePatientApi } from "../_lib/use-patient-api";

type ListStatus = "idle" | "loading" | "success" | "error";
type Props = {
  limit?: number;
};

export function PatientList({ limit = 25 }: Props) {
  const { session } = useAuthSession();
  const { fetchApi } = usePatientApi();
  const canCreate =
    session?.role === "owner" ||
    session?.role === "admin" ||
    session?.role === "clinician";
  const [page, setPage] = useState<PatientListPage | null>(null);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<ListStatus>("loading");
  const [notice, setNotice] = useState<string>("Loading patient roster...");
  const [details, setDetails] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setStatus("loading");
      setNotice("Loading patient roster...");
      const qs = `?limit=${limit}&offset=${offset}`;
      const result = await fetchApi<PatientListPage>(
        `/api/v1/patients${qs}`,
      );
      if (cancelled) return;
      handleResult(result);
    })();
    return () => {
      cancelled = true;
    };
    // fetchApi is stable for the lifetime of this component (depends only
    // on session token); spread operator diff is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, limit]);

  function handleResult(result: {
    ok: boolean;
    status: number;
    body: PatientListPage | null;
    unauthorized: boolean;
  }) {
    if (result.unauthorized) {
      setStatus("error");
      setNotice("Your session expired. Redirecting to sign-in...");
      return;
    }
    if (result.ok && result.body) {
      setPage(result.body);
      setStatus("success");
      setNotice("Patient roster loaded.");
      setDetails(null);
      return;
    }
    if (result.status === 403) {
      setStatus("error");
      setNotice("You don't have permission to view patients.");
      setDetails("Ask a clinic owner to grant access.");
      setPage(null);
      return;
    }
    setStatus("error");
    setNotice("We couldn't load the patient roster.");
    setDetails("Please try again in a moment.");
    setPage(null);
  }

  function refresh() {
    setStatus("loading");
    setNotice("Reloading patient roster...");
    setDetails(null);
    void (async () => {
      const qs = `?limit=${limit}&offset=${offset}`;
      const result = await fetchApi<PatientListPage>(
        `/api/v1/patients${qs}`,
      );
      handleResult(result);
    })();
  }

  const items: PatientListItem[] = page?.items ?? [];
  const total = page?.total ?? 0;
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(total, offset + limit);
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;

  return (
    <section className="patientCard">
      <div className="patientCardContent">
        <p className="eyebrow">Patient records</p>
        <h1>Patient roster</h1>
        <p className="lede">
          Roster is scoped to your clinic. Click a row to view or edit a
          record. Listings show only the fields needed for identification;
          full records load on demand.
        </p>
      </div>

      <div className="patientToolbar">
        {canCreate ? (
          <Link href="/patients/new" className="primary">
            New patient
          </Link>
        ) : null}
        <button type="button" className="secondary" onClick={refresh}>
          Refresh
        </button>
      </div>

      <div className="patientTable" role="table" aria-label="Patients">
        <div className="patientTableHead" role="row">
          <span role="columnheader">MRN</span>
          <span role="columnheader">Name</span>
          <span role="columnheader">Status</span>
        </div>
        {items.length === 0 ? (
          <p className="patientEmpty" role="row">
            {status === "loading"
              ? "Loading patient roster..."
              : "No patients yet. Create the first one."}
          </p>
        ) : (
          items.map((item) => (
            <Link
              key={item.patientId}
              href={`/patients/${item.patientId}`}
              className="patientRow"
              role="row"
            >
              <span
                role="cell"
                className="patientCell patientCell--mrn"
              >
                {item.identifier}
              </span>
              <span
                role="cell"
                className="patientCell patientCell--name"
              >
                {item.familyName}, {item.givenName}
              </span>
              <span
                role="cell"
                className="patientCell patientCell--status"
              >
                <span
                  className={`patientStatusBadge patientStatusBadge--${item.status}`}
                >
                  {item.status}
                </span>
              </span>
            </Link>
          ))
        )}
      </div>

      <div className="patientPagination" aria-live="polite">
        <button
          type="button"
          className="secondary"
          onClick={() => setOffset((o) => Math.max(0, o - limit))}
          disabled={!hasPrev || status === "loading"}
        >
          Previous
        </button>
        <p className="patientPaginationText">
          {total === 0 ? "0 patients" : `Showing ${start}–${end} of ${total}`}
        </p>
        <button
          type="button"
          className="secondary"
          onClick={() => setOffset((o) => o + limit)}
          disabled={!hasNext || status === "loading"}
        >
          Next
        </button>
      </div>

      <div className={`authStatus authStatus--${status}`} aria-live="polite">
        <p>{notice}</p>
        {details ? <p className="authStatusDetail">{details}</p> : null}
        {status === "error" ? (
          <button type="button" className="authRetry" onClick={refresh}>
            Retry
          </button>
        ) : null}
      </div>

      <div className="authFooter">
        <Link href="/" className="authSwitchLink">
          Back to home
        </Link>
      </div>
    </section>
  );
}
