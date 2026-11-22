import { beforeEach, describe, expect, it } from "vitest";
import { InvitationRepository } from "../repositories/invitation.repository.js";
import { InvitationService } from "../services/invitation.service.js";
import { identityStore } from "../../auth/repositories/identity.repository.js";

describe("invitation role hierarchy (#1470)", () => {
  let service: InvitationService;
  beforeEach(() => {
    identityStore._reset();
    service = new InvitationService(new InvitationRepository());
  });

  it("blocks admin inviting admin", () => {
    const res = service.sendInvitation({ email: "a@test.com", role: "admin" } as any, "clinic-1", "inviter-1", "admin");
    expect(res).toMatchObject({ error: "STAFF_ACCESS_DENIED" });
  });

  it("allows owner inviting admin", () => {
    const res = service.sendInvitation({ email: "a@test.com", role: "admin" } as any, "clinic-1", "inviter-1", "owner");
    expect("invitation" in res).toBe(true);
  });

  it("allows admin inviting clinician", () => {
    const res = service.sendInvitation({ email: "b@test.com", role: "clinician" } as any, "clinic-1", "inviter-1", "admin");
    expect("invitation" in res).toBe(true);
  });
});
