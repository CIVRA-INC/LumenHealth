// Issue #423 – contract, service, and integration tests for access policies and auditability

import { evaluateAccess } from "../access-policy.service";
import { AccessPolicyModel } from "../models/access-policy.model";

jest.mock("../models/access-policy.model");

const CLINIC = "clinic-001";
const SUBJECT = "user-abc";
const RESOURCE = "patient-records";

const mockFind = AccessPolicyModel.find as jest.Mock;

function makePolicy(effect: "ALLOW" | "DENY", actions: string[], expiresAt?: Date) {
  return { effect, actions, status: "ACTIVE", expiresAt: expiresAt ?? null };
}

beforeEach(() => jest.clearAllMocks());

describe("evaluateAccess", () => {
  it("returns allowed when an ALLOW policy matches", async () => {
    mockFind.mockReturnValue({ lean: () => [makePolicy("ALLOW", ["read"])] });
    const result = await evaluateAccess(CLINIC, SUBJECT, RESOURCE, "read");
    expect(result.allowed).toBe(true);
  });

  it("returns denied when a DENY policy matches", async () => {
    mockFind.mockReturnValue({ lean: () => [makePolicy("DENY", ["read"])] });
    const result = await evaluateAccess(CLINIC, SUBJECT, RESOURCE, "read");
    expect(result.allowed).toBe(false);
  });

  it("DENY wins over ALLOW when both match", async () => {
    mockFind.mockReturnValue({
      lean: () => [makePolicy("ALLOW", ["read"]), makePolicy("DENY", ["read"])],
    });
    const result = await evaluateAccess(CLINIC, SUBJECT, RESOURCE, "read");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/DENY/);
  });

  it("returns not allowed when no policy matches the action", async () => {
    mockFind.mockReturnValue({ lean: () => [makePolicy("ALLOW", ["write"])] });
    const result = await evaluateAccess(CLINIC, SUBJECT, RESOURCE, "read");
    expect(result.allowed).toBe(false);
  });

  it("ignores expired policies", async () => {
    const past = new Date(Date.now() - 1000);
    mockFind.mockReturnValue({ lean: () => [makePolicy("ALLOW", ["read"], past)] });
    const result = await evaluateAccess(CLINIC, SUBJECT, RESOURCE, "read");
    expect(result.allowed).toBe(false);
  });

  it("returns not allowed when no policies exist", async () => {
    mockFind.mockReturnValue({ lean: () => [] });
    const result = await evaluateAccess(CLINIC, SUBJECT, RESOURCE, "read");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("No matching policy");
  });
});
