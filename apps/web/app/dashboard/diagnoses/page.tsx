"use client";

import { DiagnosesCombobox } from "@/components/diagnoses/DiagnosesCombobox";
import { useEncounter } from "@/providers/EncounterProvider";

export default function DiagnosesPage() {
  const { activeEncounterId } = useEncounter();

  return (
    <main className="space-y-4 p-4 md:p-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Diagnoses</h1>
        <p className="mt-1 text-sm text-slate-600">
          Search and attach ICD-10 diagnoses to the active encounter.
        </p>
      </header>

      {activeEncounterId ? (
        <DiagnosesCombobox encounterId={activeEncounterId} />
      ) : (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
          Open or select an encounter to search and attach diagnoses.
        </section>
      )}
    </main>
  );
}
