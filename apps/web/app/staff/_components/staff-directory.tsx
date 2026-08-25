"use client";

import { useCallback, useEffect, useState } from "react";
import type { StaffMember, UserRole } from "@lumen/types";
import { useAuthSession } from "../../auth/session-provider";
import { fetchStaff, updateStaffRole } from "../api";

type Status = "loading" | "idle" | "error";

const ASSIGNABLE_ROLES: Exclude<UserRole, "owner">[] = [
  "admin",
  "clinician",
  "cashier",
];

export function StaffDirectory() {
  const { session } = useAuthSession();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [status, setStatus] = useState<Status>(session ? "loading" : "idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchStaff(session.accessToken)
      .then((members) => {
        if (cancelled) return;
        setStaff(members);
        setStatus("idle");
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load staff",
        );
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const canManageRoles =
    session?.role === "owner" || session?.role === "admin";

  const handleRoleChange = useCallback(
    async (staffId: string, role: Exclude<UserRole, "owner">) => {
      if (!session) return;
      setUpdatingId(staffId);
      try {
        const updated = await updateStaffRole(
          staffId,
          { role },
          session.accessToken,
        );
        setStaff((prev) =>
          prev.map((m) => (m.staffId === staffId ? updated : m)),
        );
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to update role",
        );
      } finally {
        setUpdatingId(null);
      }
    },
    [session],
  );

  if (!session) {
    return <p className="authLead">Sign in to view the staff directory.</p>;
  }

  if (status === "loading") {
    return <p className="authLead">Loading staff directory...</p>;
  }

  if (status === "error") {
    return (
      <div className="authStatus">
        <p>{errorMessage}</p>
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <p className="authLead">
        No staff members yet. Send an invitation to get started.
      </p>
    );
  }

  return (
    <div className="staffDirectory">
      {errorMessage && (
        <div className="authStatus">
          <p>{errorMessage}</p>
        </div>
      )}
      <table className="staffTable">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            {canManageRoles && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => {
            const isSelf = member.userId === session.userId;
            return (
              <tr key={member.staffId}>
                <td>{member.name}</td>
                <td>{member.email}</td>
                <td>{member.role}</td>
                <td>{member.status}</td>
                {canManageRoles && (
                  <td>
                    {isSelf ? (
                      <span className="muted">&mdash;</span>
                    ) : member.role === "owner" ? (
                      <span className="muted">&mdash;</span>
                    ) : (
                      <select
                        value={member.role}
                        disabled={updatingId === member.staffId}
                        onChange={(e) =>
                          handleRoleChange(
                            member.staffId,
                            e.target.value as Exclude<UserRole, "owner">,
                          )
                        }
                      >
                        {ASSIGNABLE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
