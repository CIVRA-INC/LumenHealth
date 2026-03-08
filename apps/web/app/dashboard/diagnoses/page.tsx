import { DiagnosesCombobox } from "@/components/diagnoses/DiagnosesCombobox";

export default function DiagnosesPage() {
  const encounterId = "mock-enc-123";

  return (
    <main className="space-y-4 p-4 md:p-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Diagnoses</h1>
        <p className="mt-1 text-sm text-slate-600">
          Search and attach ICD-10 diagnoses to the active encounter.
        </p>
      </header>

      <DiagnosesCombobox encounterId={encounterId} />
    </main>
  );
}
