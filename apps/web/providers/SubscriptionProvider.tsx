"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type SubscriptionContextValue = {
  expiryDate: string | null;
  daysRemaining: number | null;
  isExpired: boolean;
  isWriteLocked: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

const calcDaysRemaining = (expiryDate: string | null): number | null => {
  if (!expiryDate) {
    return null;
  }

  const diff = new Date(expiryDate).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
};

const Banner = ({ isExpired, daysRemaining }: { isExpired: boolean; daysRemaining: number | null }) => {
  if (isExpired) {
    return (
      <div className="sticky top-0 z-50 border-b border-red-300 bg-red-600 px-4 py-3 text-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <p className="text-sm font-semibold">
            Subscription Expired. Write access is disabled. Please renew via Stellar to restore
            full functionality.
          </p>
          <Link
            href="/dashboard/billing"
            className="rounded-md border border-white/50 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            Pay Now
          </Link>
        </div>
      </div>
    );
  }

  if (daysRemaining !== null && daysRemaining < 7) {
    return (
      <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-100 px-4 py-3 text-amber-900">
        <div className="mx-auto w-full max-w-7xl text-sm font-semibold">
          Subscription expires in {daysRemaining} day{daysRemaining === 1 ? "" : "s"}.
        </div>
      </div>
    );
  }

  return null;
};

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPaymentRequiredSignal, setHasPaymentRequiredSignal] = useState(false);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch("/clinics/me");
      if (!response.ok) {
        setExpiryDate(null);
        return;
      }

      const payload = (await response.json()) as {
        data?: { subscriptionExpiryDate?: string | null };
      };

      const nextExpiryDate = payload.data?.subscriptionExpiryDate ?? null;
      setExpiryDate(nextExpiryDate);

      if (nextExpiryDate && new Date(nextExpiryDate).getTime() > Date.now()) {
        setHasPaymentRequiredSignal(false);
      }
    } catch {
      setExpiryDate(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const daysRemaining = calcDaysRemaining(expiryDate);
  const isExpired = daysRemaining !== null && daysRemaining < 0;
  const isWriteLocked = isExpired || hasPaymentRequiredSignal;

  useEffect(() => {
    const onPaymentRequired = () => {
      setHasPaymentRequiredSignal(true);
    };

    window.addEventListener("lumen:payment-required", onPaymentRequired);
    return () => {
      window.removeEventListener("lumen:payment-required", onPaymentRequired);
    };
  }, []);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      expiryDate,
      daysRemaining,
      isExpired,
      isWriteLocked,
      isLoading,
      refresh,
    }),
    [expiryDate, daysRemaining, isExpired, isWriteLocked, isLoading],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      <Banner isExpired={isWriteLocked} daysRemaining={daysRemaining} />
      <div className={isWriteLocked ? "subscription-write-locked" : undefined}>{children}</div>
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return ctx;
};
