"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiFetch } from "@/lib/api-client";

type StaffRole =
  | "SUPER_ADMIN"
  | "CLINIC_ADMIN"
  | "DOCTOR"
  | "NURSE"
  | "ASSISTANT"
  | "READ_ONLY";

type StaffUser = {
  _id?: string;
  id?: string;
  fullName: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  clinicId: string;
  generatedTemporaryPassword?: string | null;
};

const PAGE_SIZE = 8;

const createStaffSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  role: z.enum([
    "CLINIC_ADMIN",
    "DOCTOR",
    "NURSE",
    "ASSISTANT",
    "READ_ONLY",
  ]),
  password: z
    .string()
    .trim()
    .min(8, "Password must be at least 8 characters.")
    .optional()
    .or(z.literal("")),
});

type CreateStaffForm = z.infer<typeof createStaffSchema>;

type ToastState = {
  tone: "success" | "error" | "warning";
  message: string;
};

const roleLabelMap: Record<StaffRole, string> = {
  SUPER_ADMIN: "Super Admin",
  CLINIC_ADMIN: "Clinic Admin",
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  ASSISTANT: "Assistant",
  READ_ONLY: "Read-Only",
};

const roleBadgeStyle: Record<StaffRole, { bg: string; color: string }> = {
  SUPER_ADMIN: { bg: "#ede9fe", color: "#5b21b6" },
  CLINIC_ADMIN: { bg: "#dbeafe", color: "#1d4ed8" },
  DOCTOR: { bg: "#dcfce7", color: "#166534" },
  NURSE: { bg: "#fef3c7", color: "#92400e" },
  ASSISTANT: { bg: "#e2e8f0", color: "#334155" },
  READ_ONLY: { bg: "#f1f5f9", color: "#475569" },
};

function RoleBadge({ role }: { role: StaffRole }) {
  const style = roleBadgeStyle[role];

  return (
    <span
      style={{
        display: "inline-flex",
        borderRadius: 999,
        padding: "2px 8px",
        fontSize: 12,
        fontWeight: 600,
        background: style.bg,
        color: style.color,
      }}
    >
      {roleLabelMap[role]}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        borderRadius: 999,
        padding: "2px 8px",
        fontSize: 12,
        fontWeight: 600,
        background: isActive ? "#dcfce7" : "#fee2e2",
        color: isActive ? "#166534" : "#b91c1c",
      }}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
  const [actionMenuUserId, setActionMenuUserId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<StaffUser | null>(null);
  const [isDeactivateSubmitting, setIsDeactivateSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [page, setPage] = useState(1);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateStaffForm>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "DOCTOR",
      password: "",
    },
  });

  useEffect(() => {
    const loadStaff = async () => {
      setIsLoading(true);
      setToast(null);

      try {
        const response = await apiFetch("/users", { method: "GET" });
        if (!response.ok) {
          setToast({ tone: "error", message: "Failed to load staff members." });
          setIsLoading(false);
          return;
        }

        const payload = (await response.json()) as { data?: StaffUser[] };
        setStaff(payload.data ?? []);
      } catch {
        setToast({ tone: "warning", message: "Network error while loading staff." });
      } finally {
        setIsLoading(false);
      }
    };

    void loadStaff();
  }, []);

  const pagedStaff = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return staff.slice(start, end);
  }, [page, staff]);

  const pageCount = Math.max(1, Math.ceil(staff.length / PAGE_SIZE));

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setActionMenuUserId(null);
      setDeactivateTarget(null);
      setIsCreateOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onCreateStaff = handleSubmit(async (values) => {
    setIsCreateSubmitting(true);
    setToast(null);

    try {
      const response = await apiFetch("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.fullName,
          email: values.email,
          role: values.role,
          password: values.password || undefined,
        }),
      });

      if (!response.ok) {
        setToast({ tone: "error", message: "Unable to create staff member." });
        return;
      }

      const payload = (await response.json()) as { data?: StaffUser };
      const created = payload.data;
      if (!created) {
        setToast({ tone: "error", message: "Invalid create-staff response." });
        return;
      }

      setStaff((previous) => [created, ...previous]);
      setPage(1);
      setIsCreateOpen(false);
      reset();

      if (created.generatedTemporaryPassword) {
        setToast({
          tone: "success",
          message: `Staff created. Temporary password: ${created.generatedTemporaryPassword}`,
        });
      } else {
        setToast({ tone: "success", message: "Staff member created successfully." });
      }
    } catch {
      setToast({ tone: "warning", message: "Network error while creating staff." });
    } finally {
      setIsCreateSubmitting(false);
    }
  });

  const onConfirmDeactivate = async () => {
    if (!deactivateTarget) {
      return;
    }

    setIsDeactivateSubmitting(true);
    setToast(null);

    const targetId = deactivateTarget.id ?? deactivateTarget._id;
    if (!targetId) {
      setToast({ tone: "error", message: "Cannot deactivate: missing user id." });
      setIsDeactivateSubmitting(false);
      return;
    }

    try {
      const response = await apiFetch(`/users/${targetId}/status`, {
        method: "PATCH",
      });

      if (!response.ok) {
        setToast({ tone: "error", message: "Failed to deactivate staff member." });
        return;
      }

      setStaff((previous) =>
        previous.map((item) => {
          const itemId = item.id ?? item._id;
          if (itemId === targetId) {
            return { ...item, isActive: false };
          }
          return item;
        }),
      );

      setDeactivateTarget(null);
      setActionMenuUserId(null);
      setToast({ tone: "success", message: "Staff member deactivated." });
    } catch {
      setToast({ tone: "warning", message: "Network error while deactivating staff." });
    } finally {
      setIsDeactivateSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", padding: 20 }}>
      <section style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 24, color: "#0f172a" }}>Staff Management</h1>
            <p style={{ margin: "6px 0 0", color: "#475569", fontSize: 13 }}>
              Manage clinic users, permissions, and account status.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            style={{
              border: "none",
              borderRadius: 8,
              background: "#0f766e",
              color: "#ffffff",
              padding: "10px 14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Add Staff Member
          </button>
        </header>

        {toast ? (
          <div
            style={{
              marginBottom: 12,
              border: `1px solid ${
                toast.tone === "success"
                  ? "#86efac"
                  : toast.tone === "warning"
                    ? "#fde68a"
                    : "#fecaca"
              }`,
              background:
                toast.tone === "success"
                  ? "#f0fdf4"
                  : toast.tone === "warning"
                    ? "#fffbeb"
                    : "#fef2f2",
              color:
                toast.tone === "success"
                  ? "#166534"
                  : toast.tone === "warning"
                    ? "#92400e"
                    : "#991b1b",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {toast.message}
          </div>
        ) : null}

        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            background: "#ffffff",
            overflow: "hidden",
          }}
        >
          {isLoading ? (
            <div style={{ padding: 16, color: "#475569", fontSize: 13 }}>
              Loading staff roster...
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", color: "#334155", textAlign: "left" }}>
                      <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>Name</th>
                      <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>Email</th>
                      <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>Role</th>
                      <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>Status</th>
                      <th style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedStaff.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{ padding: 14, color: "#64748b", borderBottom: "1px solid #f1f5f9" }}
                        >
                          No staff members found.
                        </td>
                      </tr>
                    ) : (
                      pagedStaff.map((row) => {
                        const rowId = row.id ?? row._id ?? row.email;
                        const isMenuOpen = actionMenuUserId === rowId;

                        return (
                          <tr key={rowId} style={{ color: "#0f172a" }}>
                            <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>
                              {row.fullName}
                            </td>
                            <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>
                              {row.email}
                            </td>
                            <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>
                              <RoleBadge role={row.role} />
                            </td>
                            <td style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>
                              <StatusBadge isActive={row.isActive} />
                            </td>
                            <td
                              style={{
                                padding: "10px 12px",
                                borderBottom: "1px solid #f1f5f9",
                                position: "relative",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => setActionMenuUserId(isMenuOpen ? null : rowId)}
                                style={{
                                  border: "1px solid #cbd5e1",
                                  background: "#ffffff",
                                  borderRadius: 8,
                                  width: 32,
                                  height: 32,
                                  cursor: "pointer",
                                  fontWeight: 700,
                                }}
                                aria-label={`Open actions for ${row.fullName}`}
                              >
                                ...
                              </button>

                              {isMenuOpen ? (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: 42,
                                    right: 12,
                                    background: "#ffffff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 8,
                                    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
                                    minWidth: 160,
                                    zIndex: 10,
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDeactivateTarget(row);
                                      setActionMenuUserId(null);
                                    }}
                                    disabled={!row.isActive}
                                    style={{
                                      width: "100%",
                                      textAlign: "left",
                                      padding: "9px 10px",
                                      border: "none",
                                      borderRadius: 8,
                                      background: "transparent",
                                      color: row.isActive ? "#b91c1c" : "#94a3b8",
                                      cursor: row.isActive ? "pointer" : "not-allowed",
                                      fontSize: 13,
                                      fontWeight: 600,
                                    }}
                                  >
                                    Deactivate
                                  </button>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <footer
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid #e2e8f0",
                  padding: "10px 12px",
                  background: "#f8fafc",
                }}
              >
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  Page {page} of {pageCount}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      borderRadius: 8,
                      padding: "6px 10px",
                      cursor: page === 1 ? "not-allowed" : "pointer",
                      color: page === 1 ? "#94a3b8" : "#0f172a",
                    }}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={page === pageCount}
                    style={{
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      borderRadius: 8,
                      padding: "6px 10px",
                      cursor: page === pageCount ? "not-allowed" : "pointer",
                      color: page === pageCount ? "#94a3b8" : "#0f172a",
                    }}
                  >
                    Next
                  </button>
                </div>
              </footer>
            </>
          )}
        </section>
      </section>

      {isCreateOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 540,
              background: "#ffffff",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 14px 36px rgba(15, 23, 42, 0.15)",
              padding: 16,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>Add Staff Member</h2>
            <p style={{ margin: "6px 0 14px", color: "#64748b", fontSize: 13 }}>
              Create a new clinic account and assign the appropriate role.
            </p>

            <form onSubmit={onCreateStaff} style={{ display: "grid", gap: 10 }}>
              <label style={{ fontSize: 13, color: "#334155" }}>
                Name
                <input
                  {...register("fullName")}
                  placeholder="Full name"
                  style={{ width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 8 }}
                />
                {errors.fullName ? (
                  <span style={{ display: "block", marginTop: 4, color: "#b91c1c", fontSize: 12 }}>
                    {errors.fullName.message}
                  </span>
                ) : null}
              </label>

              <label style={{ fontSize: 13, color: "#334155" }}>
                Email
                <input
                  {...register("email")}
                  type="email"
                  placeholder="name@clinic.org"
                  style={{ width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 8 }}
                />
                {errors.email ? (
                  <span style={{ display: "block", marginTop: 4, color: "#b91c1c", fontSize: 12 }}>
                    {errors.email.message}
                  </span>
                ) : null}
              </label>

              <label style={{ fontSize: 13, color: "#334155" }}>
                Role
                <select
                  {...register("role")}
                  style={{ width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 8 }}
                >
                  <option value="CLINIC_ADMIN">Clinic Admin</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="NURSE">Nurse</option>
                  <option value="ASSISTANT">Assistant</option>
                  <option value="READ_ONLY">Read-Only</option>
                </select>
              </label>

              <label style={{ fontSize: 13, color: "#334155" }}>
                Password (optional)
                <input
                  {...register("password")}
                  type="password"
                  placeholder="Leave blank to generate temporary password"
                  style={{ width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 8 }}
                />
                {errors.password ? (
                  <span style={{ display: "block", marginTop: 4, color: "#b91c1c", fontSize: 12 }}>
                    {errors.password.message}
                  </span>
                ) : null}
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    reset();
                  }}
                  disabled={isCreateSubmitting}
                  style={{
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    borderRadius: 8,
                    padding: "8px 12px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreateSubmitting}
                  style={{
                    border: "none",
                    background: isCreateSubmitting ? "#94a3b8" : "#0f766e",
                    color: "#ffffff",
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontWeight: 700,
                    cursor: isCreateSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  {isCreateSubmitting ? "Creating..." : "Create Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deactivateTarget ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 55,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 430,
              background: "#ffffff",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              padding: 16,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>Deactivate Staff</h2>
            <p style={{ margin: "8px 0 14px", color: "#475569", fontSize: 13 }}>
              Deactivate <strong>{deactivateTarget.fullName}</strong>? They will lose access immediately.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setDeactivateTarget(null)}
                disabled={isDeactivateSubmitting}
                style={{
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onConfirmDeactivate()}
                disabled={isDeactivateSubmitting}
                style={{
                  border: "none",
                  background: isDeactivateSubmitting ? "#94a3b8" : "#dc2626",
                  color: "#ffffff",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontWeight: 700,
                  cursor: isDeactivateSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {isDeactivateSubmitting ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
