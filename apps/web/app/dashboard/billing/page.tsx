"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";

type ClinicInfo = {
  _id: string;
  name: string;
  subscriptionExpiryDate: string;
};

type PaymentIntent = {
  intentId: string;
  destination: string;
  amount: string;
  asset: string;
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

const daysUntil = (dateIso?: string | null) => {
  if (!dateIso) {
    return null;
  }

  const distance = new Date(dateIso).getTime() - Date.now();
  return Math.ceil(distance / (24 * 60 * 60 * 1000));
};

const buildStellarUri = (intent: PaymentIntent) =>
  `web+stellar:pay?destination=${encodeURIComponent(intent.destination)}&amount=${encodeURIComponent(
    intent.amount,
  )}&memo=${encodeURIComponent(intent.memo)}&memo_type=${encodeURIComponent(intent.memoType)}`;

export default function BillingPage() {
  const { user } = useAuth();

  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [clinicLoading, setClinicLoading] = useState(true);

  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadClinic = async () => {
      setClinicLoading(true);
      setError(null);

      try {
        const response = await apiFetch("/clinics/me");
        if (!response.ok) {
          throw new Error("Unable to fetch clinic status");
        }

        const payload = (await response.json()) as { data?: ClinicInfo };
        if (payload.data) {
          setClinic(payload.data);
        }
      } catch {
        setError("Failed to load current subscription status.");
      } finally {
        setClinicLoading(false);
      }
    };

    void loadClinic();
  }, []);

  useEffect(() => {
    if (!intent) {
      setQrCodeDataUrl(null);
      return;
    }

    const generateQrCode = async () => {
      const uri = buildStellarUri(intent);
      const dataUrl = await QRCode.toDataURL(uri, {
        margin: 1,
        width: 280,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });
      setQrCodeDataUrl(dataUrl);
    };

    void generateQrCode();
  }, [intent]);

  useEffect(() => {
    if (!intent || paymentStatus !== "pending") {
      setIsPolling(false);
      return;
    }

    let isCancelled = false;

    const checkPaymentStatus = async () => {
      if (isCancelled) {
        return;
      }

      setIsPolling(true);
      try {
        const response = await apiFetch(`/payments/status/${intent.intentId}`);
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          data?: {
            paymentStatus?: PaymentStatus;
            subscriptionExpiryDate?: string | null;
          };
        };

        const nextStatus = payload.data?.paymentStatus;
        if (!nextStatus) {
          return;
        }

        setPaymentStatus(nextStatus);

        if (payload.data?.subscriptionExpiryDate && clinic) {
          setClinic({
            ...clinic,
            subscriptionExpiryDate: payload.data.subscriptionExpiryDate,
          });
        }
      } catch {
        // Polling failures are transient; keep polling.
      } finally {
        if (!isCancelled) {
          setIsPolling(false);
        }
      }
    };

    const timer = window.setInterval(() => {
      void checkPaymentStatus();
    }, 10_000);

    void checkPaymentStatus();

    return () => {
      isCancelled = true;
      window.clearInterval(timer);
    };
  }, [clinic, intent, paymentStatus]);

  const createIntent = async () => {
    if (!user?.clinicId) {
      return;
    }

    setError(null);
    setFeedback(null);
    setIsCreatingIntent(true);

    try {
      const response = await apiFetch("/payments/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId: user.clinicId, amount: "100" }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate payment intent");
      }

      const payload = (await response.json()) as { data?: PaymentIntent };
      if (!payload.data) {
        throw new Error("Invalid payment intent response");
      }

      setIntent(payload.data);
      setPaymentStatus("pending");
      setFeedback("Payment intent created. Complete the transaction in your Stellar wallet.");
    } catch {
      setError("Could not create payment intent. Please try again.");
    } finally {
      setIsCreatingIntent(false);
    }
  };

  const copyField = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(`${label} copied.`);
    } catch {
      setError(`Failed to copy ${label.toLowerCase()}.`);
    }
  };

  const subscriptionDaysRemaining = daysUntil(clinic?.subscriptionExpiryDate);
  const subscriptionState = useMemo(() => {
    if (!clinic?.subscriptionExpiryDate) {
      return "Unknown";
    }

    if (new Date(clinic.subscriptionExpiryDate).getTime() <= Date.now()) {
      return "Expired";
    }

    return "Active";
  }, [clinic?.subscriptionExpiryDate]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <section className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[1.1fr_1.4fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Billing & Stellar Checkout</h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage subscription status and complete renewal using Stellar.
          </p>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Current Subscription
            </h2>
            {clinicLoading ? (
              <p className="mt-3 text-sm text-slate-500">Loading subscription status...</p>
            ) : (
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>
                  <span className="font-medium text-slate-900">Status:</span>{" "}
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      subscriptionState === "Active"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {subscriptionState}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-slate-900">Valid Until:</span>{" "}
                  {formatDateTime(clinic?.subscriptionExpiryDate)}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Days Remaining:</span>{" "}
                  {subscriptionDaysRemaining ?? "N/A"}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void createIntent()}
            disabled={isCreatingIntent || !user?.clinicId}
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isCreatingIntent ? "Generating..." : "Generate Stellar Payment"}
          </button>

          {feedback ? (
            <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              {feedback}
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Checkout Details</h2>
          <p className="mt-1 text-sm text-slate-600">
            Copy the exact values below into your Stellar wallet.
          </p>

          {intent ? (
            <div className="mt-4 space-y-3">
              <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {qrCodeDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrCodeDataUrl} alt="Stellar payment QR code" className="h-[240px] w-[240px]" />
                  ) : (
                    <span className="text-xs text-slate-500">Generating QR code...</span>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Send To Address
                    </label>
                    <div className="mt-1 flex items-start justify-between gap-3">
                      <p className="break-all text-sm text-slate-900">{intent.destination}</p>
                      <button
                        type="button"
                        onClick={() => void copyField(intent.destination, "Address")}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-3">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Amount
                    </label>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{intent.amount} XLM</p>
                      <button
                        type="button"
                        onClick={() => void copyField(intent.amount, "Amount")}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                    <label className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Memo (Required)
                    </label>
                    <div className="mt-1 flex items-start justify-between gap-3">
                      <p className="break-all text-sm font-semibold text-amber-900">{intent.memo}</p>
                      <button
                        type="button"
                        onClick={() => void copyField(intent.memo, "Memo")}
                        className="rounded-md border border-amber-400 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="mt-2 text-xs font-medium text-amber-800">
                      You MUST include this exact Memo in your transaction, or your payment will
                      not be credited.
                    </p>
                  </div>

                  <p className="text-xs text-slate-500">
                    Intent expires at {formatDateTime(intent.expiresAt)}.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm text-slate-800">
                  Payment status:{" "}
                  <span
                    className={`font-semibold ${
                      paymentStatus === "verified"
                        ? "text-emerald-700"
                        : paymentStatus === "failed"
                          ? "text-red-700"
                          : "text-amber-700"
                    }`}
                  >
                    {paymentStatus?.toUpperCase() ?? "PENDING"}
                  </span>
                </p>
                {paymentStatus === "pending" ? (
                  <p className="mt-1 text-xs text-slate-600">
                    {isPolling
                      ? "Awaiting on-chain verification..."
                      : "Polling every 10 seconds for on-chain verification..."}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              Generate a payment intent to see Stellar checkout instructions and QR code.
            </p>
          )}
        </article>
      </section>
    </main>
  );
}
