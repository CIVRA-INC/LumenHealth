"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { isFeatureEnabled } from "@/lib/runtime-config";
import { useAuth } from "@/providers/AuthProvider";
import { useSubscription } from "@/providers/SubscriptionProvider";

type PaymentIntent = {
  intentId: string;
  destination: string;
  amount: string;
  memo: string;
  memoType: "hash";
  expiresAt: string;
};

type PaymentStatus = "pending" | "verified" | "failed";

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const getStellarUri = (intent: PaymentIntent) =>
  `web+stellar:pay?destination=${encodeURIComponent(intent.destination)}&amount=${encodeURIComponent(
    intent.amount,
  )}&memo=${encodeURIComponent(intent.memo)}&memo_type=${encodeURIComponent(intent.memoType)}`;

export default function BillingPage() {
  const billingEnabled = isFeatureEnabled("stellarBilling");
  const { user } = useAuth();
  const { expiryDate, daysRemaining, isWriteLocked, refresh } = useSubscription();

  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!intent || paymentStatus !== "pending") {
      setIsPolling(false);
      return;
    }

    const controller = new AbortController();

    const poll = async () => {
      setIsPolling(true);
      try {
        const response = await apiFetch(`/payments/status/${intent.intentId}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          data?: { paymentStatus?: PaymentStatus };
        };
        const nextStatus = payload.data?.paymentStatus;
        if (!nextStatus) {
          return;
        }

        setPaymentStatus(nextStatus);
        if (nextStatus === "verified") {
          await refresh();
        }
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") {
          return;
        }
      } finally {
        setIsPolling(false);
      }
    };

    const timer = window.setInterval(() => {
      void poll();
    }, 10_000);
    void poll();

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [intent, paymentStatus, refresh]);

  const createIntent = async () => {
    if (!user?.clinicId) {
      return;
    }

    setError(null);
    setFeedback(null);
    setIsCreating(true);

    try {
      const response = await apiFetch("/payments/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId: user.clinicId, amount: "100" }),
      });
      if (!response.ok) {
        throw new Error("failed");
      }

      const payload = (await response.json()) as { data?: PaymentIntent };
      if (!payload.data) {
        throw new Error("invalid");
      }

      setIntent(payload.data);
      setPaymentStatus("pending");
      setFeedback("Payment intent created. Complete payment in your Stellar wallet.");
    } catch {
      setError("Unable to create payment intent.");
    } finally {
      setIsCreating(false);
    }
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(`${label} copied.`);
    } catch {
      setError(`Unable to copy ${label.toLowerCase()}.`);
    }
  };

  const statusLabel = useMemo(() => {
    if (isWriteLocked) {
      return "Expired";
    }
    return "Active";
  }, [isWriteLocked]);

  const qrImageUrl = useMemo(() => {
    if (!intent) {
      return null;
    }
    return getStellarUri(intent);
  }, [intent]);

  return (
    <main className="space-y-4 p-4 md:p-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Billing</h1>
      </header>

      {!billingEnabled ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Billing Unavailable</h2>
          <p className="mt-2 text-sm text-slate-600">
            Stellar billing is currently disabled by runtime configuration.
          </p>
        </section>
      ) : (
      <section className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Current Subscription
          </h2>
          <p className="mt-3 text-sm text-slate-700">
            Status:{" "}
            <span
              className={`rounded px-2 py-1 text-xs font-semibold ${
                statusLabel === "Active"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {statusLabel}
            </span>
          </p>
          <p className="mt-1 text-sm text-slate-700">Valid until: {formatDateTime(expiryDate)}</p>
          <p className="mt-1 text-sm text-slate-700">Days remaining: {daysRemaining ?? "N/A"}</p>

          <button
            type="button"
            data-primary-action="true"
            data-allow-when-expired="true"
            onClick={() => void createIntent()}
            disabled={isCreating || !user?.clinicId}
            className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400"
          >
            {isCreating ? "Generating..." : "Generate Stellar Payment"}
          </button>

          {isWriteLocked ? (
            <p className="mt-2 text-xs font-medium text-red-700">
              Subscription is expired. Write access is disabled until payment is verified.
            </p>
          ) : null}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Stellar Checkout</h2>
          <p className="mt-1 text-sm text-slate-600">
            You MUST include the exact memo to receive credit.
          </p>

          {!intent ? (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              Generate a payment intent to see checkout details.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
              <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-3">
                {qrImageUrl ? (
                  <div className="space-y-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Wallet Payment URI
                    </p>
                    <p className="max-w-[240px] break-all text-xs text-slate-700">{qrImageUrl}</p>
                    <a
                      href={qrImageUrl}
                      className="inline-flex rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Open Wallet Link
                    </a>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">Generating checkout link...</span>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Send To Address
                  </p>
                  <div className="mt-1 flex items-start justify-between gap-3">
                    <p className="break-all text-sm text-slate-900">{intent.destination}</p>
                    <button
                      type="button"
                      onClick={() => void copy(intent.destination, "Address")}
                      className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Amount
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{intent.amount} XLM</p>
                    <button
                      type="button"
                      onClick={() => void copy(intent.amount, "Amount")}
                      className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Memo (Required)
                  </p>
                  <div className="mt-1 flex items-start justify-between gap-3">
                    <p className="break-all text-sm font-semibold text-amber-900">{intent.memo}</p>
                    <button
                      type="button"
                      onClick={() => void copy(intent.memo, "Memo")}
                      className="rounded border border-amber-400 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-2 text-xs font-medium text-amber-800">
                    You MUST include this exact Memo in your transaction, or your payment will not
                    be credited.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm text-slate-700">
                    Status:{" "}
                    <span
                      className={`font-semibold ${
                        paymentStatus === "verified"
                          ? "text-emerald-700"
                          : paymentStatus === "failed"
                            ? "text-red-700"
                            : "text-amber-700"
                      }`}
                    >
                      {(paymentStatus ?? "pending").toUpperCase()}
                    </span>
                  </p>
                  {paymentStatus === "pending" ? (
                    <p className="mt-1 text-xs text-slate-600">
                      {isPolling
                        ? "Awaiting on-chain verification..."
                        : "Polling every 10 seconds for on-chain verification..."}
                    </p>
                  ) : null}
                  {intent.expiresAt ? (
                    <p className="mt-1 text-xs text-slate-600">
                      Intent expires: {formatDateTime(intent.expiresAt)}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {feedback ? (
            <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              {feedback}
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}
        </article>
      </section>
      )}
    </main>
  );
}
