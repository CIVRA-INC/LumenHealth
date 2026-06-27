import { getPublicRuntimeConfig } from "@lumen/config/public";
import type { StaffMember, UpdateStaffRoleRequest } from "@lumen/types";

function headers(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchStaff(token: string): Promise<StaffMember[]> {
  const { apiBaseUrl } = getPublicRuntimeConfig();
  const res = await fetch(`${apiBaseUrl}/api/v1/staff`, {
    headers: headers(token),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ??
        `Failed to fetch staff (${res.status})`,
    );
  }

  const body = await res.json();
  return (body as { staff: StaffMember[] }).staff;
}

export async function updateStaffRole(
  staffId: string,
  data: UpdateStaffRoleRequest,
  token: string,
): Promise<StaffMember> {
  const { apiBaseUrl } = getPublicRuntimeConfig();
  const res = await fetch(`${apiBaseUrl}/api/v1/staff/${staffId}/role`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ??
        `Failed to update role (${res.status})`,
    );
  }

  const body = await res.json();
  return (body as { staff: StaffMember }).staff;
}
