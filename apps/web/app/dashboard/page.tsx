"use client";

import { useSubscription } from "@/providers/SubscriptionProvider";

export default function DashboardPage() {
  const { isWriteLocked } = useSubscription();

  return (
    <main className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-sm text-slate-600">Clinic command center.</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          data-primary-action="true"
          disabled={isWriteLocked}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400"
        >
          New Patient
        </button>
        <button
          type="button"
          data-primary-action="true"
          disabled={isWriteLocked}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400"
        >
          Edit Profile
        </button>
      </div>
    </main>
  );
}
