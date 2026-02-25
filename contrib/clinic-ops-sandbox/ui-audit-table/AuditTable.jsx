import { useMemo, useState } from "react";

const actionBadgeStyles = {
  CREATE: "#dcfce7",
  UPDATE: "#dbeafe",
  DELETE: "#fee2e2",
};

const actionTextStyles = {
  CREATE: "#166534",
  UPDATE: "#1d4ed8",
  DELETE: "#b91c1c",
};

const toLocalTimestamp = (isoString) =>
  new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(isoString));

export function AuditTable({ rows, loading = false }) {
  const [actionFilter, setActionFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return rows.filter((row) => {
      const actionMatch = actionFilter === "ALL" || row.action === actionFilter;
      const searchMatch =
        normalizedSearch.length === 0 ||
        row.user.toLowerCase().includes(normalizedSearch) ||
        row.resource.toLowerCase().includes(normalizedSearch) ||
        row.ipAddress.toLowerCase().includes(normalizedSearch);

      return actionMatch && searchMatch;
    });
  }, [actionFilter, rows, searchText]);

  return (
    <section
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "#ffffff",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          padding: "12px 14px",
          borderBottom: "1px solid #e2e8f0",
          background: "#f8fafc",
        }}
      >
        <label style={{ fontSize: 12, color: "#475569" }}>
          Action
          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            style={{ marginLeft: 8, padding: "4px 8px", borderRadius: 8 }}
          >
            <option value="ALL">All</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
          </select>
        </label>

        <label style={{ fontSize: 12, color: "#475569" }}>
          Search
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search user, resource, or IP"
            style={{
              marginLeft: 8,
              padding: "4px 8px",
              borderRadius: 8,
              minWidth: 240,
            }}
          />
        </label>
      </header>

      {loading ? (
        <div style={{ padding: 18, fontSize: 13, color: "#475569" }}>
          Loading audit logs...
        </div>
      ) : filteredRows.length === 0 ? (
        <div style={{ padding: 18, fontSize: 13, color: "#64748b" }}>
          No logs found for the selected filters.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "#f8fafc", color: "#334155" }}>
                <th style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>
                  Timestamp
                </th>
                <th style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>
                  User
                </th>
                <th style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>
                  Action
                </th>
                <th style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>
                  Resource
                </th>
                <th style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} style={{ color: "#0f172a" }}>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>
                    {toLocalTimestamp(row.timestamp)}
                  </td>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>
                    {row.user}
                  </td>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>
                    <span
                      style={{
                        display: "inline-block",
                        fontWeight: 600,
                        borderRadius: 999,
                        padding: "2px 8px",
                        background: actionBadgeStyles[row.action] || "#e2e8f0",
                        color: actionTextStyles[row.action] || "#334155",
                      }}
                    >
                      {row.action}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>
                    {row.resource}
                  </td>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #f1f5f9" }}>
                    {row.ipAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
