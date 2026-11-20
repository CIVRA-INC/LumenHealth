import { describe, expect, it } from "vitest";
import {
  AcceptInvitationRequestSchema,
  CreateClinicRequestSchema,
  SendInvitationRequestSchema,
  UpdateClinicRequestSchema,
  UpdateStaffRoleRequestSchema,
} from "../index.js";

const clinic = { name: "North Star", address: "1 Main", phone: "555", email: "a@b.co" };

describe("clinic schemas", () => {
  it("accepts a valid create request and rejects bad fields with stable messages", () => {
    expect(CreateClinicRequestSchema.safeParse(clinic).success).toBe(true);
    const short = CreateClinicRequestSchema.safeParse({ ...clinic, name: "x" });
    expect(short.success).toBe(false);
    expect(!short.success && short.error.issues[0]?.message).toBe("name must be at least 2 characters");
    expect(CreateClinicRequestSchema.safeParse({ ...clinic, name: "x".repeat(121) }).success).toBe(false);
    expect(CreateClinicRequestSchema.safeParse({ ...clinic, email: "nope" }).success).toBe(false);
    expect(CreateClinicRequestSchema.safeParse({ ...clinic, address: "" }).success).toBe(false);
  });

  it("allows partial updates and still validates the fields present", () => {
    expect(UpdateClinicRequestSchema.safeParse({}).success).toBe(true);
    expect(UpdateClinicRequestSchema.safeParse({ phone: "123" }).success).toBe(true);
    expect(UpdateClinicRequestSchema.safeParse({ email: "bad" }).success).toBe(false);
  });
});

describe("staff and invitation schemas", () => {
  it("does not allow assigning the owner role", () => {
    expect(UpdateStaffRoleRequestSchema.safeParse({ role: "admin" }).success).toBe(true);
    expect(UpdateStaffRoleRequestSchema.safeParse({ role: "owner" }).success).toBe(false);
    expect(SendInvitationRequestSchema.safeParse({ email: "a@b.co", role: "owner" }).success).toBe(false);
    expect(SendInvitationRequestSchema.safeParse({ email: "a@b.co", role: "cashier" }).success).toBe(true);
  });

  it("enforces the invitation acceptance rules", () => {
    const ok = { token: "t", password: "longenough", name: "Ann" };
    expect(AcceptInvitationRequestSchema.safeParse(ok).success).toBe(true);
    expect(AcceptInvitationRequestSchema.safeParse({ ...ok, password: "short" }).success).toBe(false);
    expect(AcceptInvitationRequestSchema.safeParse({ ...ok, name: "A" }).success).toBe(false);
    expect(AcceptInvitationRequestSchema.safeParse({ ...ok, token: "" }).success).toBe(false);
  });
});
