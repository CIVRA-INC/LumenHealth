"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";

type ClinicProfile = {
  _id?: string;
  name: string;
  location?: string;
  contact?: string;
  stellarWalletAddress?: string;
  subscriptionExpiryDate?: string | null;
};

export default function ClinicSettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "CLINIC_ADMIN" || user?.role === "SUPER_ADMIN";

  const [form, setForm] = useState({
    name: "",
    location: "",
    contact: "",
    stellarWalletAddress: "",
  });
  const [subscriptionExpiryDate, setSubscriptionExpiryDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadClinic = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiFetch("/clinics/me");
        if (!response.ok) {
          throw new Error("Unable to load clinic profile.");
        }

        const payload = (await response.json()) as { data?: ClinicProfile };
        const clinic = payload.data;
        if (!clinic) {
          throw new Error("Clinic profile not found.");
        }

        setForm({
          name: clinic.name ?? "",
          location: clinic.location ?? "",
          contact: clinic.contact ?? "",
          stellarWalletAddress: clinic.stellarWalletAddress ?? "",
        });
        setSubscriptionExpiryDate(clinic.subscriptionExpiryDate ?? null);
      } catch (err) {
        setError((err as Error).message || "Unable to load clinic profile.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadClinic();
  }, []);

  const saveClinic = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await apiFetch("/clinics/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Unable to save clinic settings.");
      }

      setMessage("Clinic settings updated.");
    } catch (err) {
      setError((err as Error).message || "Unable to save clinic settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="space-y-4 p-4 md:p-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Clinic Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage clinic profile details and review subscription metadata.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_320px]">
        <form onSubmit={saveClinic} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading clinic settings...</p>
          ) : !isAdmin ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              You can view clinic details, but only administrators can update settings.
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-700 md:col-span-2">
              Clinic Name
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                disabled={!isAdmin || isLoading}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              Location
              <input
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({ ...current, location: event.target.value }))
                }
                disabled={!isAdmin || isLoading}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm text-slate-700">
              Contact
              <input
                value={form.contact}
                onChange={(event) => setForm((current) => ({ ...current, contact: event.target.value }))}
                disabled={!isAdmin || isLoading}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm text-slate-700 md:col-span-2">
              Stellar Wallet Address
              <input
                value={form.stellarWalletAddress}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    stellarWalletAddress: event.target.value,
                  }))
                }
                disabled={!isAdmin || isLoading}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          {message ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!isAdmin || isLoading || isSaving}
            className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </form>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Subscription</h2>
          <p className="mt-1 text-sm text-slate-600">Current clinic billing metadata.</p>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Expiry Date
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {subscriptionExpiryDate
                ? new Date(subscriptionExpiryDate).toLocaleString()
                : "No active subscription"}
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
