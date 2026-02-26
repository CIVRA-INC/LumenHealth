import { useMemo, useState } from "react";
import { SubscriptionLayout } from "./SubscriptionLockUI";

const modes = {
  active: "2026-03-20T12:00:00.000Z",
  expiring: "2026-03-02T12:00:00.000Z",
  expired: "2026-02-20T12:00:00.000Z",
};

const NOW = "2026-02-25T12:00:00.000Z";

export default function App() {
  const [mode, setMode] = useState("active");

  const expiryIso = useMemo(() => modes[mode], [mode]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "Inter, Roboto, sans-serif",
        color: "#0f172a",
      }}
    >
      <div style={{ padding: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Subscription Lock UI Demo</h1>
        <p style={{ marginTop: 6, color: "#475569", fontSize: 13 }}>
          Toggle states to test active, expiring, and expired behavior.
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 14 }}>
          {Object.keys(modes).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: mode === key ? "#0f766e" : "#ffffff",
                color: mode === key ? "#ffffff" : "#0f172a",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <SubscriptionLayout
        expiryIso={expiryIso}
        nowIso={NOW}
        onPayNow={() => window.alert("Redirect to Stellar checkout")}
      >
        <section style={{ padding: 16 }}>
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              background: "#ffffff",
              padding: 16,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18 }}>Clinic Dashboard</h2>
            <p style={{ margin: "8px 0 14px", color: "#475569", fontSize: 13 }}>
              Primary actions should be disabled when subscription is expired.
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                style={{
                  border: "none",
                  borderRadius: 8,
                  background: "#0f766e",
                  color: "#ffffff",
                  padding: "8px 12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                New Patient
              </button>
              <button
                type="button"
                style={{
                  border: "none",
                  borderRadius: 8,
                  background: "#0369a1",
                  color: "#ffffff",
                  padding: "8px 12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Edit Profile
              </button>
            </div>
          </div>
        </section>
      </SubscriptionLayout>
    </main>
  );
}
