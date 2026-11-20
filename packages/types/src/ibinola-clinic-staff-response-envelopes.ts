import type { Clinic } from "./clinic.js";
import type { Invitation, StaffMember } from "./staff.js";

/** Standalone shared response envelope types for clinic, staff and invitation endpoints. */
export type IbinolaClinicResponse = { clinic: Clinic };
export type IbinolaListClinicsResponse = { clinics: Clinic[] };

export type IbinolaStaffResponse = { staff: StaffMember };
export type IbinolaStaffListResponse = { staff: StaffMember[] };

export type IbinolaInvitationResponse = { invitation: Invitation };
export type IbinolaInvitationListResponse = { invitations: Invitation[] };
