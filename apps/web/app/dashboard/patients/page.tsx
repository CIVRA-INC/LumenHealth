import { NewPatientForm } from "@/components/patients/NewPatientForm";
import { PatientSearchBar } from "@/components/patients/PatientSearchBar";

export default function PatientsPage() {
  return (
    <main className="space-y-4 p-4 md:p-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Patient Registry</h1>
        <p className="mt-1 text-sm text-slate-600">
          Register new patients and search quickly across the clinic registry.
        </p>
      </header>

      <PatientSearchBar />
      <NewPatientForm />
    </main>
  );
}
