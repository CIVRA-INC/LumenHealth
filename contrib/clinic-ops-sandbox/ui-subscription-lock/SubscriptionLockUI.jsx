import { getSubscriptionState } from "./subscription-state";

function Banner({ state, onPayNow }) {
  if (state.status === "active") {
    return null;
  }

  const isExpired = state.status === "expired";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 14px",
        borderBottom: `1px solid ${isExpired ? "#fecaca" : "#fde68a"}`,
        background: isExpired ? "#fef2f2" : "#fffbeb",
        color: isExpired ? "#991b1b" : "#92400e",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600 }}>
        {isExpired
          ? "Subscription Expired. Write access is disabled. Please renew via Stellar to restore full functionality."
          : `Subscription expiring soon (${state.daysRemaining} day${
              state.daysRemaining === 1 ? "" : "s"
            } remaining).`}
      </span>

      <button
        type="button"
        onClick={onPayNow}
        style={{
          border: "none",
          borderRadius: 8,
          padding: "7px 12px",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          background: isExpired ? "#dc2626" : "#d97706",
          color: "#ffffff",
        }}
      >
        Pay Now
      </button>
    </div>
  );
}

export function ActionLock({ state, children }) {
  if (!state.writeLocked) {
    return <>{children}</>;
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ opacity: 0.45, pointerEvents: "none", filter: "grayscale(0.35)" }}>
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Write actions disabled until subscription renewal
        </span>
      </div>
    </div>
  );
}

export function SubscriptionLayout({ expiryIso, nowIso, onPayNow, children }) {
  const state = getSubscriptionState(expiryIso, nowIso);

  return (
    <div>
      <Banner state={state} onPayNow={onPayNow} />
      <ActionLock state={state}>{children}</ActionLock>
    </div>
  );
}
