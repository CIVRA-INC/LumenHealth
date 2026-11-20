import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InvitationRepository } from "../repositories/invitation.repository.js";
import { InvitationService } from "../services/invitation.service.js";
import { identityStore } from "../../auth/repositories/identity.repository.js";

const T0 = new Date("2026-01-01T00:00:00.000Z");
const EXPIRES_AT = new Date(T0.getTime() + 72 * 3_600_000);

describe("invitation expiry", () => {
  let repo: InvitationRepository;
  let service: InvitationService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    identityStore._reset();
    repo = new InvitationRepository();
    service = new InvitationService(repo);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const send = () => {
    const sent = service.sendInvitation(
      { email: "new@clinic.test", role: "clinician" },
      "c1",
      "owner-1",
    );
    if ("error" in sent) throw new Error(sent.error);
    return sent.invitation;
  };

  it("accepts an invitation just before expiresAt and creates an identity", async () => {
    const inv = send();
    expect(inv.expiresAt).toBe(EXPIRES_AT.toISOString());
    vi.setSystemTime(new Date(EXPIRES_AT.getTime() - 1));

    const result = await service.acceptInvitation(inv.token, "a-strong-password-1", "New User");

    expect("ok" in result).toBe(true);
    expect(identityStore.findByEmail("new@clinic.test")).toBeDefined();
  });

  it("returns INVITATION_EXPIRED exactly at and after expiresAt, and creates no identity", async () => {
    const inv = send();

    vi.setSystemTime(EXPIRES_AT);
    const atExpiry = await service.acceptInvitation(inv.token, "a-strong-password-1", "New User");
    expect(atExpiry).toMatchObject({ error: "INVITATION_EXPIRED" });

    vi.setSystemTime(new Date(EXPIRES_AT.getTime() + 60_000));
    const after = await service.acceptInvitation(inv.token, "a-strong-password-1", "New User");
    expect(after).toMatchObject({ error: "INVITATION_EXPIRED" });

    expect(identityStore.findByEmail("new@clinic.test")).toBeUndefined();
  });
});
