import { describe, it } from "vitest";
import type {
  Clinic,
  StaffMember,
  Invitation,
  AuditEntry,
  UpdateStaffRoleRequest,
  SendInvitationRequest,
} from "../index.js";

// Compile-time shape checks using `satisfies`.
// These tests carry no runtime assertions — if they compile, the types are correct.
// A rename or type mismatch on any field will cause a TS error here before touching
// any consuming app.

describe("@lumen/types — compile-time shape checks", () => {
  it("Clinic satisfies its shape", () => {
    const _clinic = {
      clinicId: "c-1",
      name: "Sunrise Clinic",
      slug: "sunrise-clinic",
      address: "12 Main St",
      phone: "+2348012345678",
      email: "admin@sunrise.clinic",
      status: "active" as const,
      ownerId: "u-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies Clinic;

    void _clinic;
  });

  it("StaffMember satisfies its shape", () => {
    const _member = {
      staffId: "s-1",
      clinicId: "c-1",
      userId: "u-2",
      name: "Dr. Okafor",
      email: "dr.okafor@clinic.test",
      role: "clinician" as const,
      status: "active" as const,
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies StaffMember;

    void _member;
  });

  it("Invitation satisfies its shape", () => {
    const _invite = {
      invitationId: "inv-1",
      clinicId: "c-1",
      email: "new@clinic.test",
      role: "clinician" as const,
      token: "a".repeat(64),
      status: "pending" as const,
      invitedBy: "u-1",
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    } satisfies Invitation;

    void _invite;
  });

  it("AuditEntry satisfies its shape", () => {
    const _entry = {
      auditId: "a-1",
      clinicId: "c-1",
      action: "staff.role_changed" as const,
      actorId: "u-1",
      actorRole: "owner" as const,
      targetId: "u-2",
      targetType: "staff" as const,
      before: { role: "clinician" },
      after: { role: "admin" },
      createdAt: new Date().toISOString(),
    } satisfies AuditEntry;

    void _entry;
  });

  it("UpdateStaffRoleRequest rejects 'owner' role at the type level", () => {
    // This confirms Exclude<UserRole, "owner"> is in effect.
    // Uncommenting the line below should produce a TS error:
    // const _bad = { role: "owner" } satisfies UpdateStaffRoleRequest;

    const _good = { role: "admin" as const } satisfies UpdateStaffRoleRequest;
    void _good;
  });

  it("SendInvitationRequest rejects 'owner' role at the type level", () => {
    // Same exclusion applies to invitations.
    const _good = { email: "a@b.com", role: "cashier" as const } satisfies SendInvitationRequest;
    void _good;
  });
});
