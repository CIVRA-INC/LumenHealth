"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";

type QueueStatus = "WAITING" | "TRIAGE" | "CONSULTATION";

type QueueItem = {
  id: string;
  patientName: string;
  systemId: string;
  queueStatus: QueueStatus;
  encounterStatus: "OPEN" | "IN_PROGRESS" | "CLOSED";
  openedAt: string;
  waitMinutes: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

const COLUMNS: Array<{ key: QueueStatus; label: string }> = [
  { key: "WAITING", label: "Waiting Room" },
  { key: "TRIAGE", label: "Triage" },
  { key: "CONSULTATION", label: "Consultation" },
];

const formatWaitTime = (openedAt: string, nowTick: number) => {
  const diffMs = Math.max(0, nowTick - new Date(openedAt).getTime());
  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
};

const nextStage = (current: QueueStatus): QueueStatus => {
  if (current === "WAITING") {
    return "TRIAGE";
  }
  if (current === "TRIAGE") {
    return "CONSULTATION";
  }
  return "CONSULTATION";
};

export default function QueuePage() {
  const router = useRouter();
  const { tokens } = useAuth();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selectedTargetById, setSelectedTargetById] = useState<Record<string, QueueStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchQueue = async () => {
    setError(null);

    try {
      const response = await apiFetch("/queue/today");
      if (!response.ok) {
        throw new Error("Failed to fetch queue");
      }

      const payload = (await response.json()) as { data?: QueueItem[] };
      setItems(payload.data ?? []);
    } catch {
      setError("Unable to load queue data.");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchQueue();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchQueue();
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!tokens?.accessToken) {
      return;
    }

    const stream = new EventSource(
      `${API_BASE}/queue/stream?token=${encodeURIComponent(tokens.accessToken)}`,
    );

    const onUpdate = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          item?: QueueItem;
        };

        if (payload.type !== "queue.updated" || !payload.item) {
          return;
        }

        setItems((current) => {
          const index = current.findIndex((item) => item.id === payload.item!.id);
          if (index === -1) {
            return [...current, payload.item!];
          }

          const next = [...current];
          next[index] = payload.item!;
          return next;
        });
      } catch {
        // no-op for malformed stream payloads
      }
    };

    stream.addEventListener("queue.update", onUpdate as EventListener);

    return () => {
      stream.removeEventListener("queue.update", onUpdate as EventListener);
      stream.close();
    };
  }, [tokens?.accessToken]);

  const grouped = useMemo(() => {
    const groups: Record<QueueStatus, QueueItem[]> = {
      WAITING: [],
      TRIAGE: [],
      CONSULTATION: [],
    };

    items.forEach((item) => {
      groups[item.queueStatus].push(item);
    });

    return groups;
  }, [items]);

  const moveQueueItem = async (item: QueueItem) => {
    const target = selectedTargetById[item.id] ?? nextStage(item.queueStatus);

    const response = await apiFetch(`/queue/${item.id}/route`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queueStatus: target }),
    });

    if (!response.ok) {
      setError("Failed to route patient. Please retry.");
      return;
    }

    const payload = (await response.json()) as { data?: QueueItem };
    if (!payload.data) {
      return;
    }

    setItems((current) =>
      current.map((entry) => (entry.id === payload.data!.id ? payload.data! : entry)),
    );
  };

  const claimAndOpenEncounter = async (item: QueueItem) => {
    setClaimingId(item.id);
    setError(null);

    try {
      const response = await apiFetch(`/encounters/${item.id}/claim`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Failed to claim encounter.");
      }

      const payload = (await response.json()) as { data?: { id?: string } };
      const encounterId = payload.data?.id ?? item.id;
      router.push(`/dashboard/encounters?encounterId=${encodeURIComponent(encounterId)}`);
    } catch {
      router.push(`/dashboard/encounters?encounterId=${encodeURIComponent(item.id)}`);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <main className="space-y-4 p-4 md:p-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Clinic Queue</h1>
        <p className="mt-1 text-sm text-slate-600">
          Real-time routing board for waiting room, triage, and consultation flow.
        </p>
      </header>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
          Loading queue...
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((column) => (
            <article key={column.key} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <header className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                  {column.label}
                </h2>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {grouped[column.key].length}
                </span>
              </header>

              <div className="space-y-2">
                {grouped[column.key].length === 0 ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
                    No patients in this lane.
                  </p>
                ) : (
                  grouped[column.key].map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.patientName}</p>
                          <p className="text-xs text-slate-500">{item.systemId}</p>
                        </div>
                        <span className="rounded border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          Wait {formatWaitTime(item.openedAt, nowTick)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <select
                          value={selectedTargetById[item.id] ?? nextStage(item.queueStatus)}
                          onChange={(event) =>
                            setSelectedTargetById((current) => ({
                              ...current,
                              [item.id]: event.target.value as QueueStatus,
                            }))
                          }
                          className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-xs"
                        >
                          <option value="WAITING">Waiting Room</option>
                          <option value="TRIAGE">Triage</option>
                          <option value="CONSULTATION">Consultation</option>
                        </select>
                        <button
                          type="button"
                          data-primary-action="true"
                          onClick={() => void moveQueueItem(item)}
                          className="rounded bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                        >
                          Move
                        </button>
                        <button
                          type="button"
                          onClick={() => void claimAndOpenEncounter(item)}
                          disabled={claimingId === item.id}
                          className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:bg-slate-100"
                        >
                          {claimingId === item.id ? "Opening..." : "Open Visit"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
