import { beforeEach, describe, expect, it } from "vitest";
import { StaffRepository } from "../repositories/staff.repository.js";
import { StaffService } from "../services/staff.service.js";
import type { StaffMember } from "@lumen/types";

const mk = (over: Partial<StaffMember> & Pick<StaffMember, "staffId" | "clinicId" | "userId" | "email" | "role" | "status">): StaffMember => ({
  staffId: over.staffId,
  clinicId: over.clinicId,
  userId: over.userId,
  name: over.name ?? over.email.split("@")[0],
  email: over.email,
  role: over.role,
  status: over.status,
  joinedAt: over.joinedAt ?? "2026-01-01T00:00:00.000Z",
  updatedAt: over.updatedAt ?? "2026-01-01T00:00:00.000Z",
});

describe("staff list filters (#1474)", () => {
  let repo: StaffRepository;
  let service: StaffService;

  beforeEach(() => {
    repo = new StaffRepository();
    service = new StaffService(repo, { recordAudit: () => ({}) } as any);
    repo.save(mk({ staffId: "s1", clinicId: "c1", userId: "u1", email: "alice@a.test", name: "Alice", role: "admin", status: "active", joinedAt: "2026-01-01T00:00:00.000Z" }));
    repo.save(mk({ staffId: "s2", clinicId: "c1", userId: "u2", email: "bob@a.test", name: "Bob", role: "clinician", status: "deactivated", joinedAt: "2026-01-02T00:00:00.000Z" }));
    repo.save(mk({ staffId: "s3", clinicId: "c1", userId: "u3", email: "carol@a.test", name: "Carol", role: "cashier", status: "active", joinedAt: "2026-01-03T00:00:00.000Z" }));
    repo.save(mk({ staffId: "s4", clinicId: "c2", userId: "u4", email: "dave@b.test", name: "Dave", role: "admin", status: "active", joinedAt: "2026-01-01T00:00:00.000Z" }));
  });

  it("defaults to active status", () => {
    const list = service.listStaff("c1");
    expect(list.map((m) => m.staffId)).toEqual(["s1", "s3"]);
  });

  it("filters by status, role and q", () => {
    expect(service.listStaff("c1", { status: "deactivated" }).map((m) => m.staffId)).toEqual(["s2"]);
    expect(service.listStaff("c1", { status: "active", role: "admin" }).map((m) => m.staffId)).toEqual(["s1"]);
    expect(service.listStaff("c1", { status: "active", q: "car" }).map((m) => m.staffId)).toEqual(["s3"]);
  });

  it("isolates by clinic", () => {
    expect(service.listStaff("c2").map((m) => m.staffId)).toEqual(["s4"]);
    expect(service.listStaff("c1", { q: "dave" })).toEqual([]);
  });

  it("returns deterministically sorted results", () => {
    const list = service.listStaff("c1", { status: "active" });
    expect(list.map((m) => m.joinedAt)).toEqual(["2026-01-01T00:00:00.000Z", "2026-01-03T00:00:00.000Z"]);
  });
});
