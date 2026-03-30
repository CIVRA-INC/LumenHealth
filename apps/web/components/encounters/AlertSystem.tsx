"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type ClinicalAlert = {
  id: string;
  encounterId: string;
  message: string;
  source: "GEMINI" | "RULE_ENGINE";
  createdAt: string | null;
};

type Props = {
  encounterId: string;
};

const formatTimestamp = (value: string | null) => {
  if (!value) {
    return "Now";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
};

export const AlertSystem = ({ encounterId }: Props) => {
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Record<string, true>>({});

  useEffect(() => {
    if (!encounterId) {
      return;
    }

    let active = true;

    const poll = async () => {
      try {
        const response = await apiFetch(`/ai/alerts/encounter/${encodeURIComponent(encounterId)}`);
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { data?: ClinicalAlert[] };
        if (!active) {
          return;
        }

        setAlerts(payload.data ?? []);
      } catch {
        // Keep polling silently to avoid interrupting encounter workflow.
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 10_000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [encounterId]);

  const visibleAlerts = useMemo(
    () => alerts.filter((item) => !dismissedIds[item.id]),
    [alerts, dismissedIds],
  );

  const dismissAlert = async (alertId: string) => {
    setDismissedIds((current) => ({ ...current, [alertId]: true }));

    try {
      await apiFetch(`/ai/alerts/${encodeURIComponent(alertId)}/dismiss`, {
        method: "PATCH",
      });
      setAlerts((current) => current.filter((alert) => alert.id !== alertId));
    } catch {
      // Keep UI dismissed locally even if network fails.
    }
  };

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <aside className="fixed bottom-4 right-4 z-40 w-[min(420px,calc(100vw-2rem))] space-y-2">
      {visibleAlerts.slice(0, 3).map((alert) => (
        <article
          key={alert.id}
          className="rounded-xl border border-amber-300 bg-amber-50 p-3 shadow-lg"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                AI Clinical Alert
              </p>
              <p className="mt-1 text-sm text-amber-900">{alert.message}</p>
              <p className="mt-1 text-xs text-amber-700">
                {alert.source} • {formatTimestamp(alert.createdAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void dismissAlert(alert.id)}
              className="rounded border border-amber-400 bg-white px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              Dismiss
            </button>
          </div>
        </article>
      ))}
    </aside>
  );
};
