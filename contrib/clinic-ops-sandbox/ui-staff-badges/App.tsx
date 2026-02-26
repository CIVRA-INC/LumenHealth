import { RoleBadge, StatusBadge } from "./StaffBadges";
import type { StaffRole, StaffStatus } from "./types";

const roles: StaffRole[] = [
  "CLINIC_ADMIN",
  "DOCTOR",
  "NURSE",
  "ASSISTANT",
  "READ_ONLY",
];

const statuses: StaffStatus[] = ["ACTIVE", "INACTIVE"];

export default function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "Inter, Roboto, sans-serif",
        color: "#0f172a",
        padding: 24,
      }}
    >
      <h1 style={{ margin: 0, fontSize: 22 }}>Staff Badge System</h1>
      <p style={{ marginTop: 6, color: "#475569", fontSize: 13 }}>
        Standalone role and status badges for staff management UI.
      </p>

      <section style={{ marginTop: 18 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 14, color: "#334155" }}>Roles</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {roles.map((role) => (
            <RoleBadge key={role} role={role} />
          ))}
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 14, color: "#334155" }}>Statuses</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {statuses.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </section>

      <section style={{ marginTop: 22 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 14, color: "#334155" }}>
          Table Row Example
        </h2>
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            background: "#ffffff",
            padding: 12,
            display: "grid",
            gap: 8,
            gridTemplateColumns: "2fr 2fr 1.5fr 1.5fr",
            alignItems: "center",
            fontSize: 13,
          }}
        >
          <div>Dr Jane Doe</div>
          <div>jane.doe@clinic.org</div>
          <RoleBadge role="DOCTOR" />
          <StatusBadge status="ACTIVE" />
        </div>
      </section>
    </main>
  );
}
