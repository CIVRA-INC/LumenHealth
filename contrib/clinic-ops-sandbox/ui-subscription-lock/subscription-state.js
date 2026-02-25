export function getSubscriptionState(expiryIso, nowIso = new Date().toISOString()) {
  const expiry = new Date(expiryIso);
  const now = new Date(nowIso);

  const msRemaining = expiry.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

  if (msRemaining < 0) {
    return {
      status: "expired",
      daysRemaining: 0,
      writeLocked: true,
    };
  }

  if (daysRemaining < 7) {
    return {
      status: "expiring",
      daysRemaining,
      writeLocked: false,
    };
  }

  return {
    status: "active",
    daysRemaining,
    writeLocked: false,
  };
}
