'use client';

import React from 'react';
import { usePatient, useUpdatePatient } from '../../hooks/use-patient-demographics';
import { PatientDemographicsForm } from '../../components/patient-demographics-form';
import { useRouter } from 'next/navigation';
import type { UpdatePatientInput } from '@qyou/shared';

interface PatientEditPageProps {
  patientId: string;
}

export default function PatientEditPage({ patientId }: PatientEditPageProps) {
  const router = useRouter();
  const { data: patient, isLoading, error } = usePatient(patientId);
  const updatePatient = useUpdatePatient(patientId);

  const handleSubmit = async (data: UpdatePatientInput) => {
    await updatePatient.mutateAsync(data);
    router.push(`/patients/${patientId}`);
  };

  if (isLoading) {
    return (
      <main className="authPage">
        <div className="authCard">
          <p style={{ color: '#5d6a73' }}>Loading patient data...</p>
        </div>
      </main>
    );
  }

  if (error || !patient) {
    return (
      <main className="authPage">
        <div className="authCard">
          <h2>Patient not found</h2>
          <p style={{ color: '#5d6a73' }}>The requested patient could not be loaded.</p>
          <div className="actions">
            <button className="secondary" onClick={() => router.back()}>
              Go Back
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="authPage">
      <div className="authCard" style={{ padding: '32px' }}>
        <PatientDemographicsForm
          patient={patient}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isSubmitting={updatePatient.isPending}
        />
      </div>
    </main>
  );
}
