"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthSession } from "../../../auth/session-provider";
import {
  fetchPatient,
  updatePatientDemographics,
  type PatientSummary,
  type UpdateDemographicsPayload,
} from "../api";
import { PatientDemographicsForm } from "../../../components/patient-demographics-form";

type Status = "loading" | "idle" | "error" | "saving";

export default function PatientDetailPage() {
  const { session } = useAuthSession();
  const params = useParams();
  const patientId = params.patientId as string;

  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [status, setStatus] = useState<Status>(session ? "loading" : "idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!session || !patientId) return;
    let cancelled = false;
    fetchPatient(patientId, session.accessToken)
      .then((p) => {
        if (cancelled) return;
        setPatient(p);
        setStatus("idle");
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load patient",
        );
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [session, patientId]);

  const handleSave = async (data: UpdateDemographicsPayload) => {
    if (!session || !patientId) return;
    setStatus("saving");
    try {
      const updated = await updatePatientDemographics(
        patientId,
        data,
        session.accessToken,
      );
      setPatient(updated);
      setIsEditing(false);
      setStatus("idle");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update patient",
      );
      setStatus("error");
    }
  };

  if (!session) {
    return <p className="authLead">Sign in to view patient details.</p>;
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <div className="authCardContent">
          <p className="eyebrow">Patient</p>
          <h1>
            {patient
              ? `${patient.firstName} ${patient.lastName}`
              : "Loading..."}
          </h1>
          <p className="authLead">
            View and edit patient demographics.
          </p>
        </div>

        <div className="staffDirectory">
          <p>
            <Link href="/patients">&larr; Back to patient list</Link>
          </p>

          {status === "loading" && (
            <p className="authLead">Loading patient details...</p>
          )}

          {status === "error" && (
            <div className="authStatus">
              <p>{errorMessage}</p>
            </div>
          )}

          {status === "saving" && (
            <p className="authLead">Saving changes...</p>
          )}

          {status !== "loading" && patient && !isEditing && (
            <div>
              <table className="staffTable">
                <tbody>
                  <tr>
                    <td><strong>First Name</strong></td>
                    <td>{patient.firstName}</td>
                  </tr>
                  <tr>
                    <td><strong>Last Name</strong></td>
                    <td>{patient.lastName}</td>
                  </tr>
                  <tr>
                    <td><strong>Date of Birth</strong></td>
                    <td>{patient.dateOfBirth}</td>
                  </tr>
                  <tr>
                    <td><strong>Gender</strong></td>
                    <td>{patient.gender}</td>
                  </tr>
                  <tr>
                    <td><strong>Blood Type</strong></td>
                    <td>{patient.bloodType ?? "—"}</td>
                  </tr>
                  <tr>
                    <td><strong>Emergency Contact</strong></td>
                    <td>
                      {patient.emergencyContact.name} (
                      {patient.emergencyContact.relationship}) &mdash;{" "}
                      {patient.emergencyContact.phoneNumber}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Created</strong></td>
                    <td>{new Date(patient.createdAt).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td><strong>Last Updated</strong></td>
                    <td>{new Date(patient.updatedAt).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{ marginTop: "1rem" }}
              >
                Edit Demographics
              </button>
            </div>
          )}

          {status !== "loading" && patient && isEditing && (
            <PatientDemographicsForm
              patient={patient}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
            />
          )}
        </div>
      </section>
    </main>
  );
}
