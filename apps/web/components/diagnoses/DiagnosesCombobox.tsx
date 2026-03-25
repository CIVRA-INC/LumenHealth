"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";

type DiagnosisStatus = "SUSPECTED" | "CONFIRMED" | "RESOLVED";

type DiagnosisOption = {
  code: string;
  description: string;
};

type Diagnosis = DiagnosisOption & {
  id: string;
  encounterId: string;
  status: DiagnosisStatus;
  createdAt: string;
  updatedAt: string;
};

const STATUS_BADGE_CLASSES: Record<DiagnosisStatus, string> = {
  CONFIRMED: "border-green-200 bg-green-50 text-green-700",
  RESOLVED: "border-slate-200 bg-slate-50 text-slate-700",
  SUSPECTED: "border-amber-200 bg-amber-50 text-amber-700",
};

export const DiagnosesCombobox = ({ encounterId }: { encounterId: string }) => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [options, setOptions] = useState<DiagnosisOption[]>([]);
  const [attachedDiagnoses, setAttachedDiagnoses] = useState<Diagnosis[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<DiagnosisStatus>("CONFIRMED");
  const [error, setError] = useState<string | null>(null);
  const [duplicateCode, setDuplicateCode] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const normalizedQuery = useMemo(() => query.trim(), [query]);

  const fetchAttachedDiagnoses = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const response = await apiFetch(`/encounters/${encounterId}/diagnoses`);
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as { data: Diagnosis[] };
      setAttachedDiagnoses(payload.data);
    } catch {
      setError("Failed to load attached diagnoses.");
    } finally {
      setIsLoadingList(false);
    }
  }, [encounterId]);

  useEffect(() => {
    void fetchAttachedDiagnoses();
  }, [fetchAttachedDiagnoses]);

  useEffect(() => {
    if (!normalizedQuery) {
      setOptions([]);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        const response = await apiFetch(`/diagnoses/search?q=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error();

        const payload = (await response.json()) as { data?: DiagnosisOption[] };
        setOptions(payload.data ?? []);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setOptions([]);
        setError("Unable to search diagnoses.");
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery]);

  const attachDiagnosis = async (option: DiagnosisOption) => {
    setError(null);
    setDuplicateCode(null);

    try {
      const response = await apiFetch(`/encounters/${encounterId}/diagnoses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: option.code,
          description: option.description,
          status: selectedStatus,
        }),
      });

      const payload = (await response.json()) as { data: Diagnosis; duplicate?: boolean };

      if (!response.ok) {
        setError("Failed to attach diagnosis.");
        return;
      }

      if (payload.duplicate) {
        setDuplicateCode(option.code);
        // Ensure it's in the list if not already
        setAttachedDiagnoses((current) => {
          if (current.some((d) => d.id === payload.data.id)) return current;
          return [payload.data, ...current];
        });
      } else {
        setAttachedDiagnoses((current) => [payload.data, ...current]);
        setQuery("");
        setOptions([]);
      }
    } catch {
      setError("Network error while attaching diagnosis.");
    }
  };

  const updateDiagnosisStatus = async (id: string, nextStatus: DiagnosisStatus) => {
    const previous = attachedDiagnoses.find((d) => d.id === id)?.status;
    if (!previous) return;

    setUpdatingId(id);
    // Optimistic update
    setAttachedDiagnoses((current) =>
      current.map((d) => (d.id === id ? { ...d, status: nextStatus } : d)),
    );

    try {
      const response = await apiFetch(`/diagnoses/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) throw new Error();
    } catch {
      setError("Failed to update status. Reverting.");
      setAttachedDiagnoses((current) =>
        current.map((d) => (d.id === id ? { ...d, status: previous } : d)),
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Diagnosis Selection</h2>
        <p className="mt-1 text-sm text-slate-600">Search ICD-10 and add diagnosis badges.</p>

        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_180px]">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (duplicateCode) setDuplicateCode(null);
            }}
            placeholder="Search ICD-10 code or description..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />

          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value as DiagnosisStatus)}
          >
            <option value="SUSPECTED">SUSPECTED</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
        </div>

        {error ? (
          <p className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
            <button
              onClick={() => void fetchAttachedDiagnoses()}
              className="ml-2 font-semibold underline"
            >
              Retry
            </button>
          </p>
        ) : null}

        {duplicateCode ? (
          <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Diagnosis <strong>{duplicateCode}</strong> is already attached to this encounter.
          </p>
        ) : null}

        {normalizedQuery && options.length > 0 ? (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
            <ul className="max-h-60 overflow-y-auto divide-y divide-slate-100">
              {options.map((option) => (
                <li key={option.code}>
                  <button
                    type="button"
                    onClick={() => void attachDiagnosis(option)}
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{option.code}</span>
                      <span className="ml-2 text-slate-600">{option.description}</span>
                    </div>
                    <span className="text-teal-600 font-semibold text-xs">Attach</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : normalizedQuery && !isSearching ? (
          <div className="mt-2 p-4 text-center text-sm text-slate-500 border border-dashed rounded-lg">
            No results found for "{normalizedQuery}"
          </div>
        ) : null}

        {isSearching && (
          <div className="mt-2 text-center py-2 text-xs text-slate-400 italic">Searching...</div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Attached Diagnoses</h2>
        {isLoadingList ? (
          <div className="mt-4 space-y-2 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-lg" />
            ))}
          </div>
        ) : attachedDiagnoses.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 italic">
            No diagnoses attached to this encounter yet.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {attachedDiagnoses.map((item) => (
              <div
                key={item.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
                  duplicateCode === item.code
                    ? "border-amber-400 bg-amber-50 ring-2 ring-amber-100"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{item.code}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        STATUS_BADGE_CLASSES[item.status]
                      }`}
                    >
                      {item.status}
                    </span>
                    {updatingId === item.id && (
                      <span className="text-[10px] text-slate-400 animate-pulse">Saving...</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{item.description}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Added {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={item.status}
                    disabled={updatingId === item.id}
                    onChange={(e) =>
                      void updateDiagnosisStatus(item.id, e.target.value as DiagnosisStatus)
                    }
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-100 disabled:opacity-50"
                  >
                    <option value="SUSPECTED">SUSPECTED</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
