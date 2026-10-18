import { describe, expect, it } from "vitest";
import { CRITICAL_AUDIT_ACTIONS, isCriticalAuditAction } from "../audit.js";

/**
 * Pins the membership decided in docs/adr/0002-critical-audit-actions.md:
 * privilege-granting and irreversible governance events anchor immediately,
 * everything else — including anything unknown — batches.
 */
describe("CRITICAL_AUDIT_ACTIONS (ADR 0002)", () => {
  // The full AuditAction union as declared in ../audit.ts. If you add an
  // action to the union you do NOT need to touch anchoring behaviour; if
  // you add one here, amend ADR 0002 in the same PR.
  const ALL_AUDIT_ACTIONS = [
    "staff.invited",
    "staff.invitation_accepted",
    "staff.invitation_revoked",
    "staff.role_changed",
    "staff.deactivated",
    "staff.reactivated",
    "clinic.updated",
    "clinic.archived",
    "auth.password_reset_requested",
    "auth.password_reset_completed",
    "batch.anchored",
  ];

  it("contains exactly the actions decided critical by ADR 0002", () => {
    expect([...CRITICAL_AUDIT_ACTIONS].sort()).toEqual([
      "clinic.archived",
      "staff.invitation_accepted",
      "staff.role_changed",
    ]);
  });

  it("only lists actions that exist in the AuditAction union", () => {
    for (const action of CRITICAL_AUDIT_ACTIONS) {
      expect(ALL_AUDIT_ACTIONS).toContain(action);
    }
  });

  it("treats privilege-granting and destructive events as critical", () => {
    expect(isCriticalAuditAction("staff.role_changed")).toBe(true);
    expect(isCriticalAuditAction("clinic.archived")).toBe(true);
    expect(isCriticalAuditAction("staff.invitation_accepted")).toBe(true);
  });

  it("batches the actions ADR 0002 explicitly moves off the immediate path", () => {
    expect(isCriticalAuditAction("staff.invited")).toBe(false);
    expect(isCriticalAuditAction("staff.invitation_revoked")).toBe(false);
    expect(isCriticalAuditAction("staff.deactivated")).toBe(false);
    expect(isCriticalAuditAction("batch.anchored")).toBe(false);
  });

  it("pre-decides future actions per ADR 0002 §3 (exports batch, no silent criticals)", () => {
    // "audit.exported" and friends don't exist in AuditAction yet; the
    // string-level check is exactly what the runtime does for unknown
    // actions today, and pins the export-generation stance.
    expect(isCriticalAuditAction("audit.exported")).toBe(false);
    expect(isCriticalAuditAction("auth.password_reset_completed")).toBe(false);
  });

  it("defaults unknown actions to batched (ADR 0002 §4)", () => {
    expect(isCriticalAuditAction("staff.archived")).toBe(false); // never a valid action
    expect(isCriticalAuditAction("")).toBe(false);
    expect(isCriticalAuditAction("totally.made.up")).toBe(false);
  });
});
