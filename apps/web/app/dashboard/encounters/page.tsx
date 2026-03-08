"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ActiveEncounterHeader } from "@/components/encounters/ActiveEncounterHeader";
import { CloseEncounterModal } from "@/components/encounters/CloseEncounterModal";
import { EncounterLockOverlay } from "@/components/encounters/EncounterLockOverlay";
import { AlertSystem } from "@/components/encounters/AlertSystem";
import { Summarizer } from "@/components/ai/Summarizer";

type EncounterStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";

type EncounterPayload = {
  id: string;
  patientId: string;
  providerId: string;
  clinicId: string;
  status: EncounterStatus;
  openedAt: string;
  closedAt: string | null;
};

const DEMO_ENCOUNTER: EncounterPayload = {
  id: "demo-encounter",
  patientId: "mock-patient-123",
  providerId: "current-user",
  clinicId: "mock-clinic",
  status: "IN_PROGRESS",
  openedAt: new Date().toISOString(),
  closedAt: null,
};

export default function EncountersPage() {
  const [encounter, setEncounter] = useState<EncounterPayload>(DEMO_ENCOUNTER);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isLocked = encounter.status === "CLOSED";

  const closeEncounter = async () => {
    if (encounter.id === "demo-encounter") {
      setEncounter((current) => ({
        ...current,
        status: "CLOSED",
        closedAt: new Date().toISOString(),
      }));
      setIsModalOpen(false);
      setMessage("Encounter closed locally (demo mode). All inputs are now locked.");
      return;
    }

    setIsSubmittingClose(true);
    setMessage(null);
    try {
      const response = await apiFetch(`/encounters/${encounter.id}/close`, {
        method: "PATCH",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        setMessage(payload?.message ?? "Unable to close encounter.");
        return;
      }

      const payload = (await response.json()) as { data?: EncounterPayload };
      if (payload.data) {
        setEncounter(payload.data);
      }
      setIsModalOpen(false);
      setMessage("Encounter closed successfully.");
    } catch {
      setMessage("Network error while closing encounter.");
    } finally {
      setIsSubmittingClose(false);
    }
  };

  return (
    <main className="space-y-4 p-4 md:p-6">
      <AlertSystem encounterId={encounter.id} />

      <ActiveEncounterHeader
        openedAt={encounter.openedAt}
        isClosed={isLocked}
        onCloseClick={() => setIsModalOpen(true)}
      />

      {message ? (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            isLocked
              ? "border-slate-300 bg-slate-100 text-slate-700"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {message}
        </div>
      ) : null}

      <section className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <EncounterLockOverlay isLocked={isLocked} />

        <header>
          <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Active Encounter</h1>
          <p className="mt-1 text-sm text-slate-600">
            Structured clinical workspace. Closing the encounter permanently locks write access.
          </p>
        </header>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-700">
            Chief Complaint
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Patient reports fever for 3 days"
              disabled={isLocked}
            />
          </label>

          <label className="text-sm text-slate-700">
            Provisional Diagnosis
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Malaria (suspected)"
              disabled={isLocked}
            />
          </label>

          <label className="text-sm text-slate-700 md:col-span-2">
            Notes
            <textarea
              className="mt-1 h-32 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Clinical observations..."
              disabled={isLocked}
            />
          </label>
        </div>
      </section>

      <Summarizer encounterId={encounter.id} />

      <CloseEncounterModal
        isOpen={isModalOpen}
        isSubmitting={isSubmittingClose}
        onCancel={() => setIsModalOpen(false)}
        onConfirm={() => void closeEncounter()}
      />
    </main>
  );
}
