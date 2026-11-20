import { getPublicRuntimeConfig } from "@lumen/config/public";
import type { StaffMember, UpdateStaffRoleRequest } from "@lumen/types";
import { authHeaders, jsonHeaders, pathSegment, type RequestOptions } from "../../lib/http";

export async function fetchStaff(token: string, options: RequestOptions = {}): Promise<StaffMember[]> {
  const { apiBaseUrl } = getPublicRuntimeConfig();
  const res = await fetch(`${apiBaseUrl}/api/v1/staff`, {
    headers: authHeaders(token),
    signal: options.signal,
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
  options: RequestOptions = {},
): Promise<StaffMember> {
  const { apiBaseUrl } = getPublicRuntimeConfig();
  const res = await fetch(`${apiBaseUrl}/api/v1/staff/${pathSegment(staffId)}/role`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify(data),
    signal: options.signal,
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
