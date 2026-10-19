import { beforeEach, describe, expect, it } from "vitest";
import { LastOwnerError, StaffRepository } from "../repositories/staff.repository.js";
import { InvitationRepository } from "../repositories/invitation.repository.js";
import { ClinicRepository } from "../../clinic/repositories/clinic.repository.js";
import { ClinicService } from "../../clinic/services/clinic.service.js";
import type { Invitation, StaffMember } from "@lumen/types";

const owner = (staffId: string): StaffMember => ({
  staffId, clinicId: "c1", userId: `u-${staffId}`, name: staffId, email: `${staffId}@x.com`,
  role: "owner", status: "active", joinedAt: "", updatedAt: "",
});

describe("last owner invariant", () => {
  let repo: StaffRepository;
  beforeEach(() => (repo = new StaffRepository()));

  it("blocks demoting the only owner but allows it with a second owner", () => {
    repo.save(owner("a"));
    expect(() => repo.save({ ...owner("a"), role: "doctor" } as StaffMember)).toThrow(LastOwnerError);
    repo.save(owner("b"));
    repo.save({ ...owner("a"), role: "doctor" } as StaffMember);
    expect(() => repo.save({ ...owner("b"), status: "archived" } as StaffMember)).toThrow(LastOwnerError);
  });
});

describe("invitation hardening", () => {
  const inv = (over: Partial<Invitation> = {}): Invitation => ({
    invitationId: "i1", clinicId: "c1", email: "N@x.com", role: "doctor", token: "raw-token", status: "pending",
    invitedBy: "u1", expiresAt: new Date(Date.now() + 60_000).toISOString(), createdAt: "", ...over,
  } as Invitation);

  it("stores only a token hash and claims once", () => {
    const repo = new InvitationRepository();
    repo.create(inv());
    expect(repo.findById("i1")?.token).not.toBe("raw-token");
    expect("invitation" in repo.claim("raw-token")).toBe(true);
    expect(repo.claim("raw-token")).toEqual({ error: "ACCEPTED" });
  });

  it("refuses expired invitations and allows one pending per email", () => {
    const repo = new InvitationRepository();
    repo.create(inv({ expiresAt: new Date(Date.now() - 1).toISOString() }));
    expect(repo.claim("raw-token")).toEqual({ error: "EXPIRED" });
    expect(repo.findPendingByEmail("c1", "n@x.com")).toBeUndefined();
  });
});

describe("clinic registration", () => {
  it("persists the submitted clinic name", () => {
    const repo = new ClinicRepository();
    const clinic = new ClinicService(repo).registerClinic("Sunrise Clinic", "u1", "c1");
    expect(repo.findById("c1")?.name).toBe(clinic.name);
    expect(clinic.name).toBe("Sunrise Clinic");
  });
});
