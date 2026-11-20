import { describe, expect, it } from "vitest";
import type { AuditEntry } from "@lumen/types";
import { AuditRepository } from "../repositories/audit.repository.js";
import { AuditService } from "../services/audit.service.js";

const entry: AuditEntry = {
  auditId: "a-1",
  clinicId: "clinic-1",
  action: "staff.invited",
  actorId: "actor-1",
  actorRole: "owner",
  createdAt: "2026-03-31T10:00:00.000Z",
  sha256Hash: "hash",
  before: { x: 1 },
};

function serviceWith(found: AuditEntry | undefined): AuditService {
  const retention = { findEntryIncludingArchive: async () => found };
  return new AuditService(new AuditRepository(), {} as never, retention as never);
}

describe("AuditService.getAuditEntry", () => {
  it("returns the complete entry for the owning clinic", async () => {
    await expect(serviceWith(entry).getAuditEntry("clinic-1", "a-1")).resolves.toEqual(entry);
  });

  it("returns null for another clinic's id", async () => {
    await expect(serviceWith(entry).getAuditEntry("clinic-2", "a-1")).resolves.toBeNull();
  });

  it("returns null when the entry does not exist", async () => {
    await expect(serviceWith(undefined).getAuditEntry("clinic-1", "missing")).resolves.toBeNull();
  });
});
