"use client";

import { VitalsEntryGrid } from "@/components/vitals/VitalsEntryGrid";
import { useEncounter } from "@/providers/EncounterProvider";

export default function VitalsPage() {
  const { activeEncounterId } = useEncounter();

  return (
    <main className="space-y-4 p-4 md:p-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Triage Vitals</h1>
        <p className="mt-1 text-sm text-slate-600">
          Capture vitals quickly with dynamic age-adjusted alerting.
        </p>
      </header>

      <VitalsEntryGrid encounterId={activeEncounterId} />
    </main>
  );
}
