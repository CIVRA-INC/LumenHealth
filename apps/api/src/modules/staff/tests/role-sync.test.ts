import { beforeEach, describe, expect, it } from "vitest";
import { StaffRepository } from "../repositories/staff.repository.js";
import { StaffService } from "../services/staff.service.js";
import { identityStore } from "../../auth/repositories/identity.repository.js";
import { sessionStore, makeSession } from "../../auth/repositories/session.repository.js";

const auditService = { recordAudit: () => ({}) } as any;

describe("Staff role change syncs identity (#1463)", () => {
  beforeEach(() => {
    identityStore._reset();
    sessionStore._reset();
  });

  it("updates identity role and revokes sessions on role change", () => {
    const staffRepo = new StaffRepository();
    staffRepo.save({ staffId: "s1", clinicId: "c1", userId: "u1", name: "U", email: "u@c.test", role: "admin", status: "active", joinedAt: "", updatedAt: "" } as any);
    staffRepo.save({ staffId: "s2", clinicId: "c1", userId: "u2", name: "Owner", email: "o@c.test", role: "owner", status: "active", joinedAt: "", updatedAt: "" } as any);
    identityStore.save({ userId: "u1", clinicId: "c1", email: "u@c.test", passwordHash: "h", role: "admin", status: "active", createdAt: "" });
    sessionStore.save(makeSession({ sessionId: "sess1", userId: "u1", clinicId: "c1", accessToken: "a1", refreshToken: "r1" }));

    const service = new StaffService(staffRepo, auditService);
    const result = service.updateStaffRole("s1", { role: "cashier" } as any, "c1", "u2", "owner");

    expect((result as any).role).toBe("cashier");
    expect(identityStore.findById("u1")?.role).toBe("cashier");
    expect(sessionStore.findByAccessToken("a1")).toBeUndefined();
  });
});
