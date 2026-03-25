"use client";

import { useEffect, useState } from "react";
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

type EncounterSummaryState = {
  vitalsCount: number;
  notesCount: number;
  diagnosesCount: number | null;
  alertsCount: number;
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
  const [summary, setSummary] = useState<EncounterSummaryState>({
    vitalsCount: 0,
    notesCount: 0,
    diagnosesCount: 0,
    alertsCount: 0,
  });
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const isLocked = encounter.status === "CLOSED";

  useEffect(() => {
    let isCancelled = false;

    const loadSummary = async () => {
      setIsSummaryLoading(true);

      if (encounter.id === "demo-encounter") {
        setSummary({
          vitalsCount: 0,
          notesCount: 0,
          diagnosesCount: null,
          alertsCount: 0,
        });
        setIsSummaryLoading(false);
        return;
      }

      try {
        const [vitalsResponse, notesResponse, diagnosesResponse, alertsResponse] =
          await Promise.all([
            apiFetch(`/vitals/encounter/${encounter.id}`),
            apiFetch(`/notes/encounter/${encounter.id}`),
            apiFetch(`/encounters/${encounter.id}/diagnoses`),
            apiFetch(`/ai/alerts/encounter/${encounter.id}`),
          ]);

        const [vitalsPayload, notesPayload, alertsPayload] = await Promise.all([
          vitalsResponse.ok ? vitalsResponse.json() : Promise.resolve({}),
          notesResponse.ok ? notesResponse.json() : Promise.resolve({}),
          alertsResponse.ok ? alertsResponse.json() : Promise.resolve({}),
        ]);

        const diagnosesPayload = diagnosesResponse.ok
          ? await diagnosesResponse.json()
          : null;

        if (isCancelled) {
          return;
        }

        setSummary({
          vitalsCount: Array.isArray((vitalsPayload as { data?: unknown[] }).data)
            ? (vitalsPayload as { data: unknown[] }).data.length
            : 0,
          notesCount: Array.isArray((notesPayload as { data?: unknown[] }).data)
            ? (notesPayload as { data: unknown[] }).data.length
            : 0,
          diagnosesCount: diagnosesPayload
            ? Array.isArray((diagnosesPayload as { data?: unknown[] }).data)
              ? (diagnosesPayload as { data: unknown[] }).data.length
              : 0
            : null,
          alertsCount: Array.isArray((alertsPayload as { data?: unknown[] }).data)
            ? (alertsPayload as { data: unknown[] }).data.length
            : 0,
        });
      } catch {
        if (!isCancelled) {
          setSummary({
            vitalsCount: 0,
            notesCount: 0,
            diagnosesCount: null,
            alertsCount: 0,
          });
        }
      } finally {
        if (!isCancelled) {
          setIsSummaryLoading(false);
        }
      }
    };

    void loadSummary();

    return () => {
      isCancelled = true;
    };
  }, [encounter.id]);

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

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_320px]">
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

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Encounter Summary</h2>
          <p className="mt-1 text-sm text-slate-600">
            Quick status snapshot for the current visit.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Vitals Entries
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {isSummaryLoading ? "..." : summary.vitalsCount}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Notes
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {isSummaryLoading ? "..." : summary.notesCount}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Diagnoses
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {isSummaryLoading
                  ? "..."
                  : summary.diagnosesCount === null
                    ? "N/A"
                    : summary.diagnosesCount}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Active Alerts
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {isSummaryLoading ? "..." : summary.alertsCount}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Encounter ID: <span className="font-semibold text-slate-800">{encounter.id}</span>
          </div>
        </aside>
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
