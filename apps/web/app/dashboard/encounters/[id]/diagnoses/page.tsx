"use client";

import { useParams } from "next/navigation";
import { DiagnosesCombobox } from "@/components/diagnoses/DiagnosesCombobox";

export default function DiagnosesPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  if (!id) {
    return (
      <main className="p-4 md:p-6 text-center text-slate-500">
        Encounter context missing.
      </main>
    );
  }

  return (
    <main className="space-y-4 p-4 md:p-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Diagnoses</h1>
        <p className="mt-1 text-sm text-slate-600">
          Search and attach ICD-10 diagnoses to the active encounter.
        </p>
      </header>

      <DiagnosesCombobox encounterId={id} />
    </main>
  );
}
