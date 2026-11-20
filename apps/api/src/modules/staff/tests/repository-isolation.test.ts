import { beforeEach, describe, expect, it } from "vitest";
import type { Invitation, StaffMember } from "@lumen/types";
import { StaffRepository } from "../repositories/staff.repository.js";
import { InvitationRepository } from "../repositories/invitation.repository.js";

const member = (over: Partial<StaffMember> = {}): StaffMember => ({
  staffId: "s1",
  clinicId: "c1",
  userId: "u1",
  name: "Ann",
  email: "ann@clinic.test",
  role: "clinician",
  status: "active",
  joinedAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

const invitation = (over: Partial<Invitation> = {}): Invitation => ({
  invitationId: "i1",
  clinicId: "c1",
  email: "new@clinic.test",
  role: "clinician",
  token: "raw-token",
  status: "pending",
  invitedBy: "u1",
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("StaffRepository isolation", () => {
  let repo: StaffRepository;
  beforeEach(() => {
    repo = new StaffRepository();
  });

  it("mutating a returned record does not change the store", () => {
    repo.save(member());
    repo.findById("s1")!.role = "admin";
    repo.findByUserId("u1")!.name = "Hacked";
    repo.listByClinic("c1")[0]!.status = "deactivated";
    expect(repo.findById("s1")).toMatchObject({ role: "clinician", name: "Ann", status: "active" });
  });

  it("mutating the object passed to save() does not change the stored copy", () => {
    const input = member();
    const saved = repo.save(input);
    input.role = "admin";
    saved.name = "Hacked";
    expect(repo.findById("s1")).toMatchObject({ role: "clinician", name: "Ann" });
  });
});

describe("InvitationRepository isolation", () => {
  let repo: InvitationRepository;
  beforeEach(() => {
    repo = new InvitationRepository();
  });

  it("mutating returned invitations does not change the store", () => {
    repo.create(invitation());
    repo.findById("i1")!.status = "revoked";
    repo.findByToken("raw-token")!.role = "admin";
    repo.listByClinic("c1")[0]!.email = "evil@x.test";
    repo.findPendingByEmail("c1", "new@clinic.test")!.status = "accepted";
    expect(repo.findById("i1")).toMatchObject({
      status: "pending",
      role: "clinician",
      email: "new@clinic.test",
    });
  });

  it("mutating the object passed to save() does not change the stored copy", () => {
    const input = invitation();
    repo.save(input);
    input.status = "revoked";
    expect(repo.findById("i1")!.status).toBe("pending");
  });
});
