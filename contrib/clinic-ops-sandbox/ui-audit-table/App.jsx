import { useState } from "react";
import { AuditTable } from "./AuditTable";
import { auditRows } from "./auditData";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: 24,
        fontFamily: "Inter, Roboto, sans-serif",
        color: "#0f172a",
      }}
    >
      <header style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>System Audit Logs</h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#475569" }}>
          Standalone high-density audit table demo.
        </p>
      </header>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => setLoading((prev) => !prev)}
          style={{ padding: "6px 10px", borderRadius: 8 }}
        >
          Toggle Loading
        </button>
        <button
          type="button"
          onClick={() => setEmpty((prev) => !prev)}
          style={{ padding: "6px 10px", borderRadius: 8 }}
        >
          Toggle Empty
        </button>
      </div>

      <AuditTable rows={empty ? [] : auditRows} loading={loading} />
    </main>
  );
}
