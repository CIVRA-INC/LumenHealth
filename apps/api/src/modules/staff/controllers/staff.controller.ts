import type { Request, Response } from "express";
import type { UpdateStaffRoleRequest } from "@lumen/types";
import { listStaff, updateStaffRole } from "../services/staff.service.js";

export function list(req: Request, res: Response): void {
  const staff = listStaff(req.auth!.clinicId);
  res.json({ staff });
}

export function updateRole(req: Request, res: Response): void {
  const role = req.auth!.role;
  if (role !== "owner" && role !== "admin") {
    res.status(403).json({ error: "AUTH_FORBIDDEN", message: "only owner or admin can update staff roles" });
    return;
  }

  const body = req.body as UpdateStaffRoleRequest;
  if (!body.role || !["admin", "clinician", "cashier"].includes(body.role)) {
    res.status(400).json({ error: "STAFF_INVALID_INPUT", message: "role must be one of: admin, clinician, cashier", field: "role" });
    return;
  }

  const result = updateStaffRole(String(req.params.staffId), body, req.auth!.clinicId, req.auth!.userId);

  if ("error" in result) {
    const status = result.error === "STAFF_NOT_FOUND" ? 404 : 403;
    res.status(status).json(result);
    return;
  }

  res.json({ staff: result });
}
