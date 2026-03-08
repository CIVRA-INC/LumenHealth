"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiFetch } from "@/lib/api-client";
import { useSubscription } from "@/providers/SubscriptionProvider";

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

const PAGE_SIZE = 10;

const createStaffSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  role: z.enum(["CLINIC_ADMIN", "DOCTOR", "NURSE", "ASSISTANT", "READ_ONLY"]),
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

const roleBadgeClass: Record<StaffRole, string> = {
  SUPER_ADMIN: "bg-violet-100 text-violet-800 border border-violet-200",
  CLINIC_ADMIN: "bg-blue-100 text-blue-800 border border-blue-200",
  DOCTOR: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  NURSE: "bg-amber-100 text-amber-800 border border-amber-200",
  ASSISTANT: "bg-slate-200 text-slate-700 border border-slate-300",
  READ_ONLY: "bg-slate-100 text-slate-600 border border-slate-200",
};

function RoleBadge({ role }: { role: StaffRole }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClass[role]}`}>
      {roleLabelMap[role]}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isActive
          ? "border border-emerald-200 bg-emerald-100 text-emerald-800"
          : "border border-red-200 bg-red-100 text-red-700"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

export default function StaffManagementPage() {
  const { isWriteLocked } = useSubscription();
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
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
      setToast({ tone: "success", message: "Staff member deactivated." });
    } catch {
      setToast({ tone: "warning", message: "Network error while deactivating staff." });
    } finally {
      setIsDeactivateSubmitting(false);
    }
  };

  return (
    <main className="space-y-4 p-4 md:p-6">
      <header className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Staff Management</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage clinic users, permissions, and account status.
          </p>
        </div>

        <button
          type="button"
          data-primary-action="true"
          disabled={isWriteLocked}
          onClick={() => setIsCreateOpen(true)}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          Add Staff Member
        </button>
      </header>

      {toast ? (
        <div
          className={`rounded-lg border px-3 py-2 text-sm font-medium ${
            toast.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : toast.tone === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Loading staff roster...
                  </td>
                </tr>
              ) : pagedStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No staff members found.
                  </td>
                </tr>
              ) : (
                pagedStaff.map((row) => {
                  const rowId = row.id ?? row._id ?? row.email;
                  return (
                    <tr key={rowId}>
                      <td className="px-4 py-3">{row.fullName}</td>
                      <td className="px-4 py-3">{row.email}</td>
                      <td className="px-4 py-3">
                        <RoleBadge role={row.role} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge isActive={row.isActive} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          data-primary-action="true"
                          disabled={!row.isActive || isWriteLocked}
                          onClick={() => setDeactivateTarget(row)}
                          className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-xs text-slate-600">
            Page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </footer>
      </section>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Add Staff Member</h2>
            <p className="mt-1 text-sm text-slate-600">
              Create a new clinic account and assign the appropriate role.
            </p>

            <form onSubmit={onCreateStaff} className="mt-4 grid gap-3">
              <label className="text-sm text-slate-700">
                Name
                <input
                  {...register("fullName")}
                  placeholder="Full name"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {errors.fullName ? (
                  <span className="mt-1 block text-xs text-red-600">{errors.fullName.message}</span>
                ) : null}
              </label>

              <label className="text-sm text-slate-700">
                Email
                <input
                  {...register("email")}
                  type="email"
                  placeholder="name@clinic.org"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {errors.email ? (
                  <span className="mt-1 block text-xs text-red-600">{errors.email.message}</span>
                ) : null}
              </label>

              <label className="text-sm text-slate-700">
                Role
                <select
                  {...register("role")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="CLINIC_ADMIN">Clinic Admin</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="NURSE">Nurse</option>
                  <option value="ASSISTANT">Assistant</option>
                  <option value="READ_ONLY">Read-Only</option>
                </select>
              </label>

              <label className="text-sm text-slate-700">
                Password (optional)
                <input
                  {...register("password")}
                  type="password"
                  placeholder="Leave blank to auto-generate"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {errors.password ? (
                  <span className="mt-1 block text-xs text-red-600">{errors.password.message}</span>
                ) : null}
              </label>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    reset();
                  }}
                  disabled={isCreateSubmitting}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-primary-action="true"
                  disabled={isCreateSubmitting || isWriteLocked}
                  className="rounded bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isCreateSubmitting ? "Creating..." : "Create Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deactivateTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Deactivate Staff</h2>
            <p className="mt-2 text-sm text-slate-600">
              Deactivate <span className="font-semibold">{deactivateTarget.fullName}</span>? They
              will lose access immediately.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeactivateTarget(null)}
                disabled={isDeactivateSubmitting}
                className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                data-primary-action="true"
                onClick={() => void onConfirmDeactivate()}
                disabled={isDeactivateSubmitting || isWriteLocked}
                className="rounded bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
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
