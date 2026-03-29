"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import type { Patient } from "@lumen/types";

const getAge = (dobIso: string) => {
  const dob = new Date(dobIso);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
};

export const PatientSearchBar = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Patient[]>([]);
  const [launchingPatientId, setLaunchingPatientId] = useState<string | null>(null);

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!trimmedQuery) {
      setResults([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiFetch(
          `/patients/search?q=${encodeURIComponent(trimmedQuery)}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error("Search request failed");
        }

        const payload = (await response.json()) as { data?: Patient[] };
        setResults(payload.data ?? []);
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }

        setError("Unable to fetch patients.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmedQuery]);

  const launchEncounter = async (patientId: string) => {
    setLaunchingPatientId(patientId);
    setError(null);

    try {
      const response = await apiFetch("/encounters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });

      if (!response.ok) {
        throw new Error("Unable to start encounter");
      }

      const payload = (await response.json()) as { data?: { id?: string } };
      const encounterId = payload.data?.id;
      if (!encounterId) {
        throw new Error("Invalid encounter response");
      }

      router.push(`/dashboard/encounters?encounterId=${encodeURIComponent(encounterId)}`);
    } catch {
      setError("Unable to start encounter for this patient.");
    } finally {
      setLaunchingPatientId(null);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
        Global Patient Search
      </h2>
      <div className="mt-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or System ID..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      {trimmedQuery ? (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          {isLoading ? (
            <p className="text-xs text-slate-500">Searching...</p>
          ) : error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-slate-500">No patients found.</p>
          ) : (
            <ul className="space-y-1">
              {results.map((patient) => (
                <li
                  key={patient.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {patient.sex} • {getAge(patient.dateOfBirth)}y
                    </p>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {patient.systemId}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/patients/${patient.id}`}
                      className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => void launchEncounter(patient.id)}
                      disabled={launchingPatientId === patient.id}
                      className="rounded bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400"
                    >
                      {launchingPatientId === patient.id ? "Starting..." : "Start Encounter"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
};
