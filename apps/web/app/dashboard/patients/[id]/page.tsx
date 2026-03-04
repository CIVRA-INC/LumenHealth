"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type TimelineVitals = {
  id: string;
  timestamp: string;
  bpSystolic: number;
  bpDiastolic: number;
  heartRate: number;
  temperature: number;
  respirationRate: number;
  spO2: number;
  weight: number;
};

type TimelineNote = {
  id: string;
  type: string;
  authorId: string;
  timestamp: string;
  content: string;
};

type TimelineDiagnosis = {
  id: string;
  code: string;
  description: string;
  status: string;
};

type TimelineEncounter = {
  id: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  providerId: string;
  vitals: TimelineVitals[];
  notes: TimelineNote[];
  diagnoses: TimelineDiagnosis[];
};

type HistoryResponse = {
  data?: {
    id: string;
    systemId: string;
    firstName: string;
    lastName: string;
    sex: string;
    dateOfBirth: string;
  };
  encounters?: TimelineEncounter[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    source: "db" | "mock";
  };
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const getPatientIdFromPath = () => {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((part) => part === "patients");
  if (idx === -1) {
    return "";
  }
  return parts[idx + 1] ?? "";
};

export default function PatientTimelinePage() {
  const [patientId, setPatientId] = useState("");
  const [patient, setPatient] = useState<HistoryResponse["data"] | null>(null);
  const [encounters, setEncounters] = useState<TimelineEncounter[]>([]);
  const [meta, setMeta] = useState<HistoryResponse["meta"] | null>(null);
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = useMemo(() => {
    if (!meta) {
      return false;
    }
    return meta.page < meta.totalPages;
  }, [meta]);

  const loadPage = async (id: string, page: number, append: boolean) => {
    if (!id) {
      return;
    }

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setError(null);
    }

    try {
      const response = await apiFetch(`/patients/${id}/history?page=${page}&limit=5`);
      if (!response.ok) {
        throw new Error("Failed to load timeline");
      }

      const payload = (await response.json()) as HistoryResponse;
      if (!payload.data) {
        throw new Error("Invalid history payload");
      }

      setPatient(payload.data);
      setMeta(payload.meta ?? null);

      const newEncounters = payload.encounters ?? [];
      if (append) {
        setEncounters((current) => {
          const existing = new Set(current.map((entry) => entry.id));
          const deduped = newEncounters.filter((entry) => !existing.has(entry.id));
          return [...current, ...deduped];
        });
      } else {
        setEncounters(newEncounters);
      }
    } catch {
      setError("Unable to load patient history timeline.");
      if (!append) {
        setEncounters([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const id = getPatientIdFromPath();
    setPatientId(id);
    if (id) {
      void loadPage(id, 1, false);
    }
  }, []);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || !meta || !patientId) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (!first.isIntersecting || isLoadingMore) {
        return;
      }

      void loadPage(patientId, meta.page + 1, true);
    });

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, meta, patientId]);

  return (
    <main className="space-y-4 p-4 md:p-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Patient Timeline</h1>
        {patient ? (
          <p className="mt-1 text-sm text-slate-600">
            {patient.firstName} {patient.lastName} ({patient.systemId})
          </p>
        ) : null}
        {meta ? (
          <p className="mt-1 text-xs text-slate-500">
            Source: {meta.source.toUpperCase()} • Loaded {encounters.length} of {meta.total} encounters
          </p>
        ) : null}
      </header>

      {isLoading ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
          Loading timeline...
        </section>
      ) : error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {error}
        </section>
      ) : encounters.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
          No historical encounters found.
        </section>
      ) : (
        <section className="relative pl-4">
          <div className="absolute left-[11px] top-0 h-full w-px bg-slate-300" />

          <div className="space-y-4">
            {encounters.map((encounter) => {
              const expanded = expandedById[encounter.id] ?? false;
              return (
                <article key={encounter.id} className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className="absolute -left-[10px] top-5 h-4 w-4 rounded-full border-2 border-white bg-teal-600" />

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedById((current) => ({
                        ...current,
                        [encounter.id]: !expanded,
                      }))
                    }
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Encounter #{encounter.id.slice(0, 8)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Opened {formatDateTime(encounter.openedAt)} • Closed {formatDateTime(encounter.closedAt)}
                      </p>
                    </div>
                    <span className="rounded border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {expanded ? "Collapse" : "Expand"}
                    </span>
                  </button>

                  {expanded ? (
                    <div className="mt-4 space-y-4">
                      <section>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Vitals</h3>
                        <div className="mt-2 space-y-2">
                          {encounter.vitals.length === 0 ? (
                            <p className="text-xs text-slate-500">No vitals recorded.</p>
                          ) : (
                            encounter.vitals.map((vital) => (
                              <div key={vital.id} className="rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                                {formatDateTime(vital.timestamp)} • BP {vital.bpSystolic}/{vital.bpDiastolic} • HR {vital.heartRate} • Temp {vital.temperature}°C • SpO2 {vital.spO2}%
                              </div>
                            ))
                          )}
                        </div>
                      </section>

                      <section>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Notes</h3>
                        <div className="mt-2 space-y-2">
                          {encounter.notes.length === 0 ? (
                            <p className="text-xs text-slate-500">No notes recorded.</p>
                          ) : (
                            encounter.notes.map((note) => (
                              <div key={note.id} className="rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                                <p className="font-semibold text-slate-800">{note.type}</p>
                                <p className="mt-1 whitespace-pre-wrap">{note.content}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </section>

                      <section>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Diagnoses</h3>
                        <div className="mt-2 space-y-2">
                          {encounter.diagnoses.length === 0 ? (
                            <p className="text-xs text-slate-500">No diagnoses linked.</p>
                          ) : (
                            encounter.diagnoses.map((diagnosis) => (
                              <div key={diagnosis.id} className="rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                                {diagnosis.code} - {diagnosis.description} ({diagnosis.status})
                              </div>
                            ))
                          )}
                        </div>
                      </section>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div ref={sentinelRef} className="h-8" />

          {isLoadingMore ? (
            <p className="text-xs text-slate-500">Loading more encounters...</p>
          ) : hasMore ? (
            <p className="text-xs text-slate-400">Scroll to load more encounters</p>
          ) : (
            <p className="text-xs text-slate-400">End of timeline</p>
          )}
        </section>
      )}
    </main>
  );
}
