"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { useSubscription } from "@/providers/SubscriptionProvider";

type DashboardSnapshot = {
  patientCount: number;
  openEncounterCount: number;
  queueCount: number;
};

export default function DashboardPage() {
  const { isWriteLocked, daysRemaining } = useSubscription();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>({
    patientCount: 0,
    openEncounterCount: 0,
    queueCount: 0,
  });

  useEffect(() => {
    const loadSnapshot = async () => {
      try {
        const [queueResponse, encounterResponse] = await Promise.all([
          apiFetch("/queue/today"),
          apiFetch("/encounters?status=OPEN&limit=50"),
        ]);

        const queuePayload = queueResponse.ok ? await queueResponse.json() : { data: [] };
        const encounterPayload = encounterResponse.ok ? await encounterResponse.json() : { data: [] };

        setSnapshot({
          patientCount: 0,
          queueCount: Array.isArray(queuePayload.data) ? queuePayload.data.length : 0,
          openEncounterCount: Array.isArray(encounterPayload.data) ? encounterPayload.data.length : 0,
        });
      } catch {
        setSnapshot({
          patientCount: 0,
          queueCount: 0,
          openEncounterCount: 0,
        });
      }
    };

    void loadSnapshot();
  }, []);

  return (
    <main className="space-y-4 p-4 md:p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Clinic command center.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Queue</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{snapshot.queueCount}</p>
          <Link href="/dashboard/queue" className="mt-3 inline-block text-sm font-semibold text-teal-700">
            Open queue
          </Link>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open Encounters</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{snapshot.openEncounterCount}</p>
          <Link href="/dashboard/encounters" className="mt-3 inline-block text-sm font-semibold text-teal-700">
            View encounters
          </Link>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patients</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{snapshot.patientCount}</p>
          <Link href="/dashboard/patients" className="mt-3 inline-block text-sm font-semibold text-teal-700">
            Open registry
          </Link>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subscription</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {daysRemaining === null ? "N/A" : `${daysRemaining}d`}
          </p>
          <Link href="/dashboard/billing" className="mt-3 inline-block text-sm font-semibold text-teal-700">
            Billing details
          </Link>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard/patients"
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              isWriteLocked
                ? "bg-slate-300 text-slate-600"
                : "bg-teal-700 text-white hover:bg-teal-800"
            }`}
          >
            New Patient
          </Link>
          <Link
            href="/dashboard/settings/staff"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Manage Staff
          </Link>
          <Link
            href="/dashboard/audit"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Review Audit Logs
          </Link>
        </div>
      </section>
    </main>
  );
}
