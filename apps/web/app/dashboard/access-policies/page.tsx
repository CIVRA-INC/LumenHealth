"use client";

// Issue #421 – Access Policies and Auditability: operator-facing workflow
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type PolicyEffect = "ALLOW" | "DENY";
type PolicyStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

type AccessPolicy = {
  _id: string;
  subjectId: string;
  resource: string;
  actions: string[];
  effect: PolicyEffect;
  status: PolicyStatus;
  expiresAt?: string;
  createdAt: string;
};

const EFFECT_STYLES: Record<PolicyEffect, string> = {
  ALLOW: "border border-emerald-200 bg-emerald-50 text-emerald-800",
  DENY:  "border border-red-200 bg-red-50 text-red-800",
};

export default function AccessPoliciesPage() {
  const [policies, setPolicies] = useState<AccessPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/access-policies");
      if (!res.ok) throw new Error("Failed to load policies");
      const json = (await res.json()) as { data: AccessPolicy[] };
      setPolicies(json.data ?? []);
    } catch {
      setError("Unable to load access policies. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const revoke = async (id: string) => {
    setRevoking(id);
    try {
      const res = await apiFetch(`/access-policies/${id}/transition`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transition: "revoke" }),
      });
      if (!res.ok) throw new Error("Revoke failed");
      setPolicies((prev) => prev.map((p) => p._id === id ? { ...p, status: "REVOKED" } : p));
    } catch {
      setError("Could not revoke policy. Please try again.");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <section className="mx-auto max-w-7xl space-y-4">
        <header className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Access Policies</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage fine-grained ALLOW / DENY rules for clinic staff and resources.
          </p>
        </header>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Actions</th>
                  <th className="px-4 py-3">Effect</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-800">
                {isLoading ? (
                  <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={7}>Loading policies…</td></tr>
                ) : policies.length === 0 ? (
                  <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={7}>No active policies found.</td></tr>
                ) : policies.map((p) => (
                  <tr key={p._id}>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{p.subjectId}</td>
                    <td className="px-4 py-3 font-medium">{p.resource}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{p.actions.join(", ")}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${EFFECT_STYLES[p.effect]}`}>
                        {p.effect}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{p.status}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.status === "ACTIVE" && (
                        <button
                          type="button"
                          disabled={revoking === p._id}
                          onClick={() => void revoke(p._id)}
                          className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {revoking === p._id ? "Revoking…" : "Revoke"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
