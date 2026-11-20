import { describe, expect, it } from "vitest";
import type { Clinic } from "../clinic.js";
import type { Invitation, StaffMember } from "../staff.js";
import type {
  IbinolaClinicResponse,
  IbinolaInvitationListResponse,
  IbinolaInvitationResponse,
  IbinolaListClinicsResponse,
  IbinolaStaffListResponse,
  IbinolaStaffResponse,
} from "../ibinola-clinic-staff-response-envelopes.js";

describe("ibinola clinic/staff/invitation response envelopes", () => {
  it("provides named clinic envelopes", () => {
    const clinic = {
      clinicId: "c-1",
      name: "Sunrise Clinic",
      slug: "sunrise-clinic",
      address: "12 Main St",
      phone: "+2348012345678",
      email: "admin@sunrise.clinic",
      status: "active",
      ownerId: "u-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    } satisfies Clinic;
    const one: IbinolaClinicResponse = { clinic };
    const many: IbinolaListClinicsResponse = { clinics: [clinic] };
    expect(one.clinic.clinicId).toBe("c-1");
    expect(many.clinics[0]?.slug).toBe("sunrise-clinic");
  });

  it("provides named staff and invitation envelopes", () => {
    const staff = {
      staffId: "s-1",
      clinicId: "c-1",
      userId: "u-2",
      name: "Dr. Okafor",
      email: "dr.okafor@clinic.test",
      role: "clinician",
      status: "active",
      joinedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    } satisfies StaffMember;
    const invitation = {
      invitationId: "inv-1",
      clinicId: "c-1",
      email: "new@clinic.test",
      role: "clinician",
      token: "tok",
      status: "pending",
      invitedBy: "u-1",
      expiresAt: "2026-02-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    } satisfies Invitation;
    const sr: IbinolaStaffResponse = { staff };
    const sl: IbinolaStaffListResponse = { staff: [staff] };
    const ir: IbinolaInvitationResponse = { invitation };
    const il: IbinolaInvitationListResponse = { invitations: [invitation] };
    expect(sr.staff.userId).toBe("u-2");
    expect(sl.staff).toHaveLength(1);
    expect(ir.invitation.invitationId).toBe("inv-1");
    expect(il.invitations[0]?.status).toBe("pending");
  });
});
