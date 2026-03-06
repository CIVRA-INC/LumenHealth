"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type AuditAction = "CREATE" | "UPDATE" | "DELETE";

type AuditLogRecord = {
  _id: string;
  timestamp: string;
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  ipAddress: string;
};

type AuditLogsResponse = {
  data?: AuditLogRecord[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const ACTION_STYLES: Record<AuditAction, string> = {
  CREATE: "border border-emerald-200 bg-emerald-50 text-emerald-800",
  UPDATE: "border border-amber-200 bg-amber-50 text-amber-800",
  DELETE: "border border-red-200 bg-red-50 text-red-800",
};

const toIsoStartOfDay = (date: string) =>
  date ? new Date(`${date}T00:00:00.000Z`).toISOString() : undefined;

const toIsoEndOfDay = (date: string) =>
  date ? new Date(`${date}T23:59:59.999Z`).toISOString() : undefined;

const formatTimestamp = (isoDate: string) => {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const buildQueryString = (params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  return searchParams.toString();
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [action, setAction] = useState<AuditAction | "">("");
  const [selectedUserId, setSelectedUserId] = useState("");

  const [debouncedFilters, setDebouncedFilters] = useState({
    startDate: "",
    endDate: "",
    action: "" as AuditAction | "",
    selectedUserId: "",
  });
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    setIsDebouncing(true);
    const timer = window.setTimeout(() => {
      setDebouncedFilters({
        startDate,
        endDate,
        action,
        selectedUserId,
      });
      setMeta((current) => ({ ...current, page: 1 }));
      setIsDebouncing(false);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [action, endDate, selectedUserId, startDate]);

  useEffect(() => {
    const controller = new AbortController();

    const loadLogs = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const queryString = buildQueryString({
          page: meta.page,
          limit: meta.limit,
          startDate: toIsoStartOfDay(debouncedFilters.startDate),
          endDate: toIsoEndOfDay(debouncedFilters.endDate),
          action: debouncedFilters.action || undefined,
          userId: debouncedFilters.selectedUserId || undefined,
        });

        const response = await apiFetch(`/audit-logs?${queryString}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not load audit logs.");
        }

        const payload = (await response.json()) as AuditLogsResponse;
        setLogs(payload.data ?? []);
        setMeta((current) => ({
          ...current,
          page: payload.meta?.page ?? current.page,
          limit: payload.meta?.limit ?? current.limit,
          total: payload.meta?.total ?? 0,
          totalPages: payload.meta?.totalPages ?? 1,
        }));
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }

        setLogs([]);
        setErrorMessage("Unable to fetch audit logs. Check your network and try again.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadLogs();

    return () => controller.abort();
  }, [debouncedFilters, meta.limit, meta.page]);

  const userOptions = useMemo(() => {
    const values = new Set<string>();
    logs.forEach((log) => values.add(log.userId));
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [logs]);

  const canGoPrevious = meta.page > 1;
  const canGoNext = meta.page < meta.totalPages;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <section className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">System Audit Logs</h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor all create, update, and delete events for compliance.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Start Date
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                End Date
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                User
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
              >
                <option value="">All users</option>
                {userOptions.map((userId) => (
                  <option key={userId} value={userId}>
                    {userId}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Action
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                value={action}
                onChange={(event) => setAction(event.target.value as AuditAction | "")}
              >
                <option value="">All actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {isDebouncing ? "Applying filters..." : "Filters applied"}
            </p>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setAction("");
                setSelectedUserId("");
              }}
            >
              Clear filters
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-800">
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                      Loading audit logs...
                    </td>
                  </tr>
                ) : errorMessage ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-red-600" colSpan={6}>
                      {errorMessage}
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                      No logs found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id}>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium">{log.userId}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ACTION_STYLES[log.action]}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{log.resource}</span>
                        {log.resourceId ? (
                          <span className="ml-1 text-xs text-slate-500">#{log.resourceId}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {`${log.userId} [${log.action}] ${log.resource}${
                          log.resourceId ? ` #${log.resourceId}` : ""
                        } at ${formatTimestamp(log.timestamp)}`}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                        {log.ipAddress}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <footer className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-600">
              Showing page {meta.page} of {Math.max(meta.totalPages, 1)} ({meta.total} total logs)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setMeta((current) => ({ ...current, page: current.page - 1 }))}
                disabled={!canGoPrevious || isLoading}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setMeta((current) => ({ ...current, page: current.page + 1 }))}
                disabled={!canGoNext || isLoading}
              >
                Next
              </button>
            </div>
          </footer>
        </section>
      </section>
    </main>
  );
}
