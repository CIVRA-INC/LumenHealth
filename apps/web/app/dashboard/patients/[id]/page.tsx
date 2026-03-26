"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

type HistoryVitals = {
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

type HistoryNote = {
  id: string;
  timestamp: string;
  authorId: string;
  type: "SOAP" | "FREE_TEXT" | "AI_SUMMARY" | "CORRECTION";
  content: string;
  correctionOfNoteId?: string;
};

type HistoryDiagnosis = {
  id: string;
  code: string;
  description: string;
  status: "SUSPECTED" | "CONFIRMED" | "RESOLVED";
};

type HistoryEncounter = {
  id: string;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  vitals: HistoryVitals[];
  notes: HistoryNote[];
  diagnoses: HistoryDiagnosis[];
};

type HistoryPatient = {
  id: string;
  systemId: string;
  firstName: string;
  lastName: string;
  sex: "M" | "F" | "O";
  dateOfBirth: string;
  isActive: boolean;
};

type HistoryResponse = {
  status: "success";
  data: HistoryPatient;
  encounters: HistoryEncounter[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
};

const PAGE_SIZE = 5;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const statusBadgeClass = (status: HistoryDiagnosis["status"]) => {
  if (status === "CONFIRMED") return "border-green-200 bg-green-50 text-green-700";
  if (status === "RESOLVED") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
};

export default function PatientHistoryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const patientId = params?.id ?? "";

  const [patient, setPatient] = useState<HistoryPatient | null>(null);
  const [encounters, setEncounters] = useState<HistoryEncounter[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isStartingEncounter, setIsStartingEncounter] = useState(false);

  const loaderRef = useRef<HTMLDivElement | null>(null);
  const inFlightRef = useRef(false);

  const loadPage = useCallback(
    async (nextPage: number, replace = false) => {
      if (!patientId || inFlightRef.current) return;
      inFlightRef.current = true;
      setError(null);

      if (replace) setIsInitialLoading(true);
      else setIsLoadingMore(true);

      try {
        const res = await apiFetch(
          `/patients/${encodeURIComponent(patientId)}/history?page=${nextPage}&limit=${PAGE_SIZE}`,
        );

        if (!res.ok) {
          if (res.status === 404) throw new Error("Patient not found.");
          throw new Error("Unable to load patient history.");
        }

        const payload = (await res.json()) as HistoryResponse;

        setPatient(payload.data);
        setHasNextPage(payload.meta.hasNextPage);
        setPage(payload.meta.page);

        setEncounters((current) => {
          if (replace) return payload.encounters;

          const existing = new Map(current.map((item) => [item.id, item]));
          for (const encounter of payload.encounters) {
            existing.set(encounter.id, encounter);
          }
          return Array.from(existing.values()).sort(
            (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
          );
        });
      } catch (err) {
        setError((err as Error).message || "Unable to load patient history.");
      } finally {
        inFlightRef.current = false;
        setIsInitialLoading(false);
        setIsLoadingMore(false);
      }
    },
    [patientId],
  );

  useEffect(() => {
    setPatient(null);
    setEncounters([]);
    setExpanded({});
    setHasNextPage(true);
    setPage(1);
    void loadPage(1, true);
  }, [loadPage]);

  useEffect(() => {
    if (!loaderRef.current || !hasNextPage) return;

    const target = loaderRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || inFlightRef.current || isInitialLoading) return;
        void loadPage(page + 1, false);
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasNextPage, isInitialLoading, loadPage, page]);

  const fullName = useMemo(() => {
    if (!patient) return "";
    return `${patient.firstName} ${patient.lastName}`.trim();
  }, [patient]);

  const patientAge = useMemo(() => {
    if (!patient?.dateOfBirth) return null;
    const dob = new Date(patient.dateOfBirth);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDelta = now.getMonth() - dob.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
      age -= 1;
    }
    return age;
  }, [patient?.dateOfBirth]);

  const activeEncounter = useMemo(
    () => encounters.find((encounter) => encounter.status !== "CLOSED") ?? null,
    [encounters],
  );

  const startEncounter = async () => {
    if (!patientId) {
      return;
    }

    setIsStartingEncounter(true);
    setError(null);
    try {
      const response = await apiFetch("/encounters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });

      if (!response.ok) {
        throw new Error("Unable to start encounter.");
      }

      const payload = (await response.json()) as { data?: { id?: string } };
      const encounterId = payload.data?.id;
      if (!encounterId) {
        throw new Error("Encounter could not be opened.");
      }

      router.push(`/dashboard/encounters?encounterId=${encodeURIComponent(encounterId)}`);
    } catch (err) {
      setError((err as Error).message || "Unable to start encounter.");
    } finally {
      setIsStartingEncounter(false);
    }
  };

  return (
    <main className="space-y-4 p-4 md:p-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Patient Timeline</h1>
        {patient ? (
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                {fullName} ({patient.systemId}) · {patient.sex}
                {patientAge !== null ? ` · ${patientAge}y` : ""}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span
                  className={`rounded-full border px-2.5 py-1 font-semibold ${
                    patient.isActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {patient.isActive ? "Active Record" : "Inactive Record"}
                </span>
                {activeEncounter ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                    Active Encounter
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {activeEncounter ? (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/dashboard/encounters?encounterId=${encodeURIComponent(activeEncounter.id)}`,
                    )
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Continue Encounter
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void startEncounter()}
                disabled={isStartingEncounter}
                className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400"
              >
                {isStartingEncounter ? "Starting..." : "Start Encounter"}
              </button>
              <Link
                href="/dashboard/billing"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Billing
              </Link>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-600">Loading patient profile...</p>
        )}
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {isInitialLoading ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading medical history...
        </section>
      ) : encounters.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          No encounter history found.
        </section>
      ) : (
        <section className="space-y-3">
          {encounters.map((encounter) => {
            const isOpen = expanded[encounter.id] ?? false;
            return (
              <article key={encounter.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((current) => ({ ...current, [encounter.id]: !isOpen }))
                  }
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Encounter · {formatDateTime(encounter.openedAt)}
                    </p>
                    <p className="text-xs text-slate-600">
                      Status: {encounter.status}
                      {encounter.closedAt ? ` · Closed: ${formatDateTime(encounter.closedAt)}` : ""}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-teal-700">{isOpen ? "Collapse" : "Expand"}</span>
                </button>

                {isOpen ? (
                  <div className="space-y-4 border-t border-slate-200 px-4 py-4">
                    <section>
                      <h3 className="text-sm font-semibold text-slate-900">Vitals</h3>
                      {encounter.vitals.length === 0 ? (
                        <p className="mt-1 text-xs text-slate-500">No vitals recorded.</p>
                      ) : (
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          {encounter.vitals.map((vital) => (
                            <div key={vital.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                              <p className="font-medium text-slate-700">{formatDateTime(vital.timestamp)}</p>
                              <p className="mt-1 text-slate-600">
                                BP {vital.bpSystolic}/{vital.bpDiastolic} · HR {vital.heartRate} · Temp{" "}
                                {vital.temperature}°C · RR {vital.respirationRate} · SpO2 {vital.spO2}% · Wt{" "}
                                {vital.weight}kg
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section>
                      <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
                      {encounter.notes.length === 0 ? (
                        <p className="mt-1 text-xs text-slate-500">No notes recorded.</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {encounter.notes.map((note) => (
                            <div key={note.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                              <p className="font-medium text-slate-700">
                                {note.type} · {formatDateTime(note.timestamp)}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-slate-700">{note.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section>
                      <h3 className="text-sm font-semibold text-slate-900">Diagnoses</h3>
                      {encounter.diagnoses.length === 0 ? (
                        <p className="mt-1 text-xs text-slate-500">No diagnoses recorded.</p>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {encounter.diagnoses.map((diagnosis) => (
                            <span
                              key={diagnosis.id}
                              className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${statusBadgeClass(
                                diagnosis.status,
                              )}`}
                            >
                              {diagnosis.code} - {diagnosis.description} ({diagnosis.status})
                            </span>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                ) : null}
              </article>
            );
          })}

          <div ref={loaderRef} className="h-8">
            {isLoadingMore ? (
              <p className="text-center text-xs text-slate-500">Loading more encounters...</p>
            ) : hasNextPage ? null : (
              <p className="text-center text-xs text-slate-400">End of timeline.</p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
