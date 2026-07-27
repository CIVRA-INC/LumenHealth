"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthSession } from "../../auth/session-provider";
import { fetchPatients, type PatientSummary } from "./api";

type Status = "loading" | "idle" | "error";

export default function PatientListPage() {
  const { session } = useAuthSession();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [status, setStatus] = useState<Status>(session ? "loading" : "idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchPatients(session.accessToken)
      .then((result) => {
        if (cancelled) return;
        setPatients(result.patients);
        setStatus("idle");
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load patients",
        );
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.gender.toLowerCase().includes(q),
    );
  }, [patients, search]);

  if (!session) {
    return <p className="authLead">Sign in to view patients.</p>;
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <div className="authCardContent">
          <p className="eyebrow">Patients</p>
          <h1>Patient Directory</h1>
          <p className="authLead">
            View and manage patient demographics for your clinic.
          </p>
        </div>

        <div className="staffDirectory">
          <div className="auditFilters">
            <label>
              Search
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or gender..."
              />
            </label>
          </div>

          {status === "loading" && (
            <p className="authLead">Loading patients...</p>
          )}

          {status === "error" && (
            <div className="authStatus">
              <p>{errorMessage}</p>
            </div>
          )}

          {status === "idle" && filtered.length === 0 && (
            <p className="authLead">
              No patients found. Create your first patient record to get started.
            </p>
          )}

          {status === "idle" && filtered.length > 0 && (
            <table className="staffTable">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Date of Birth</th>
                  <th>Gender</th>
                  <th>Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((patient) => (
                  <tr key={patient.patientId}>
                    <td>
                      <Link href={`/patients/${patient.patientId}`}>
                        {patient.firstName} {patient.lastName}
                      </Link>
                    </td>
                    <td>{patient.dateOfBirth}</td>
                    <td>{patient.gender}</td>
                    <td>
                      {patient.lastVisitAt
                        ? new Date(patient.lastVisitAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p className="muted">{filtered.length} patients</p>
        </div>
      </section>
    </main>
  );
}
