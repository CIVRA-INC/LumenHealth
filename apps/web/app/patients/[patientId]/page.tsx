"use client";

import { use } from "react";
import { useState, useEffect } from "react";
import type { PatientDemographics } from "../../../src/types/patient-demographics.types";

export default function PatientDetailPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const [patient, setPatient] = useState<PatientDemographics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/patients/${patientId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Patient not found");
        return res.json();
      })
      .then((body: { patient: PatientDemographics }) => setPatient(body.patient))
      .catch((err) => setError(err.message));
  }, [patientId]);

  if (error) return <main className="authPage"><p>{error}</p></main>;
  if (!patient) return <main className="authPage"><p>Loading…</p></main>;

  return (
    <main className="authPage">
      <h1>
        {patient.firstName} {patient.lastName}
      </h1>

      <dl>
        <dt>Patient ID</dt>
        <dd>{patient.patientId}</dd>
        <dt>Date of Birth</dt>
        <dd>{patient.dateOfBirth}</dd>
        <dt>Gender</dt>
        <dd>{patient.gender}</dd>
        {patient.bloodType && (
          <>
            <dt>Blood Type</dt>
            <dd>{patient.bloodType}</dd>
          </>
        )}
        <dt>Phone</dt>
        <dd>{patient.phone}</dd>
        <dt>Email</dt>
        <dd>{patient.email}</dd>
        <dt>Address</dt>
        <dd>{patient.address}</dd>
        <dt>MRN</dt>
        <dd>{patient.medicalRecordNumber}</dd>
        <dt>Clinic ID</dt>
        <dd>{patient.clinicId}</dd>

        <dt>Emergency Contact</dt>
        <dd>
          {patient.emergencyContact.name} ({patient.emergencyContact.relationship}) –{" "}
          {patient.emergencyContact.phoneNumber}
        </dd>

        <dt>Insurance</dt>
        <dd>
          {patient.insuranceInfo.provider} – Policy {patient.insuranceInfo.policyNumber}
          {patient.insuranceInfo.groupNumber && ` / Group ${patient.insuranceInfo.groupNumber}`}
        </dd>

        <dt>Created</dt>
        <dd>{patient.createdAt}</dd>
        <dt>Updated</dt>
        <dd>{patient.updatedAt}</dd>
      </dl>
    </main>
  );
}
