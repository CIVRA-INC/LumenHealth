"use client";

import { useRouter } from "next/navigation";
import type { Patient } from "@lumen/types";
import { PatientForm } from "../_components/patient-form";

export default function NewPatientPage() {
  const router = useRouter();
  return (
    <main className="authPage">
      <PatientForm
        mode="create"
        onSuccess={(patient: Patient) =>
          router.push(`/patients/${patient.patientId}`)
        }
      />
    </main>
  );
}
