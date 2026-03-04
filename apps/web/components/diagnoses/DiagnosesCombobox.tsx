"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type DiagnosisStatus = "SUSPECTED" | "CONFIRMED" | "RESOLVED";

type DiagnosisOption = {
  code: string;
  description: string;
};

type SelectedDiagnosis = DiagnosisOption & {
  status: DiagnosisStatus;
};

export const DiagnosesCombobox = ({ encounterId }: { encounterId: string }) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<DiagnosisOption[]>([]);
  const [selected, setSelected] = useState<SelectedDiagnosis[]>([]);
  const [statusByCode, setStatusByCode] = useState<Record<string, DiagnosisStatus>>({});
  const [error, setError] = useState<string | null>(null);

  const normalizedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!normalizedQuery) {
      setOptions([]);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiFetch(`/diagnoses/search?q=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("search failed");
        }

        const payload = (await response.json()) as { data?: DiagnosisOption[] };
        setOptions(payload.data ?? []);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") {
          return;
        }

        setOptions([]);
        setError("Unable to search diagnoses.");
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery]);

  const attachDiagnosis = async (option: DiagnosisOption) => {
    const currentStatus = statusByCode[option.code] ?? "CONFIRMED";

    const response = await apiFetch(`/encounters/${encounterId}/diagnoses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: option.code,
        description: option.description,
        status: currentStatus,
      }),
    });

    if (!response.ok) {
      setError("Failed to attach diagnosis.");
      return;
    }

    setSelected((current) => {
      if (current.some((item) => item.code === option.code)) {
        return current;
      }

      return [...current, { ...option, status: currentStatus }];
    });

    setQuery("");
    setOptions([]);
  };

  const removeDiagnosis = (code: string) => {
    setSelected((current) => current.filter((item) => item.code !== code));
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Diagnosis Selection</h2>
      <p className="mt-1 text-sm text-slate-600">Search ICD-10 and add diagnosis badges.</p>

      <div className="mt-4 grid gap-2 md:grid-cols-[1fr_180px]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search ICD-10 code or description..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />

        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          value={statusByCode[normalizedQuery] ?? "CONFIRMED"}
          onChange={(event) =>
            setStatusByCode((current) => ({
              ...current,
              [normalizedQuery]: event.target.value as DiagnosisStatus,
            }))
          }
        >
          <option value="SUSPECTED">SUSPECTED</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="RESOLVED">RESOLVED</option>
        </select>
      </div>

      {error ? (
        <p className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      {normalizedQuery ? (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          {isLoading ? (
            <p className="text-xs text-slate-500">Searching...</p>
          ) : options.length === 0 ? (
            <p className="text-xs text-slate-500">No diagnosis matches found.</p>
          ) : (
            <ul className="space-y-1">
              {options.map((option) => (
                <li key={option.code}>
                  <button
                    type="button"
                    onClick={() => void attachDiagnosis(option)}
                    className="flex w-full items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:border-teal-300"
                  >
                    <span className="font-semibold text-slate-800">{option.code}</span>
                    <span className="ml-2 flex-1 text-slate-600">{option.description}</span>
                    <span className="ml-2 text-teal-700">Add</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {selected.map((item) => (
          <span
            key={item.code}
            className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800"
          >
            {item.code} - {item.description}
            <button
              type="button"
              onClick={() => removeDiagnosis(item.code)}
              className="rounded-full bg-white px-1 text-[10px] font-bold text-teal-700"
              aria-label={`Remove ${item.code}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </section>
  );
};
