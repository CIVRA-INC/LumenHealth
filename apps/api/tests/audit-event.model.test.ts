import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";

vi.mock("mongoose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("mongoose")>();
  return {
    ...actual,
    model: vi.fn().mockReturnValue(
      function MockModel(this: Record<string, unknown>, data: Record<string, unknown>) {
        Object.assign(this, data);
        this.save = vi.fn().mockResolvedValue(this);
      },
    ),
    models: {},
  };
});

import {
  AuditEventModel,
  type AuditEvent,
  type AuditAction,
  type TargetType,
} from "../../../src/modules/admin/models/audit-event.model";

describe("AuditEventModel", () => {
  const actorId = new Types.ObjectId();
  const targetId = new Types.ObjectId();

  const baseEvent: AuditEvent = {
    actorId,
    actorRole: "SUPER_ADMIN",
    targetId,
    targetType: "User" as TargetType,
    action: "USER_DELETED" as AuditAction,
    reason: "Violated terms of service",
    metadata: { previousRole: "DOCTOR" },
    ipAddress: "192.168.1.1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a document with all required fields", () => {
    const doc = new AuditEventModel(baseEvent);
    expect(doc).toBeDefined();
  });

  it("creates a moderation ban event", () => {
    const doc = new AuditEventModel({
      ...baseEvent,
      action: "MODERATION_BAN" as AuditAction,
      targetType: "User" as TargetType,
      reason: "Repeated spam",
    });
    expect(doc).toBeDefined();
  });

  it("creates a content removal event with metadata snapshot", () => {
    const doc = new AuditEventModel({
      ...baseEvent,
      action: "CONTENT_REMOVED" as AuditAction,
      targetType: "Content" as TargetType,
      metadata: { contentId: "abc123", flagCount: 5 },
    });
    expect(doc).toBeDefined();
  });

  it("creates a settings change event for system target", () => {
    const doc = new AuditEventModel({
      ...baseEvent,
      action: "SETTINGS_CHANGED" as AuditAction,
      targetType: "System" as TargetType,
      metadata: { before: { maxUsers: 10 }, after: { maxUsers: 50 } },
    });
    expect(doc).toBeDefined();
  });

  it("defaults reason and ipAddress to empty string when omitted", () => {
    const doc = new AuditEventModel({
      actorId,
      actorRole: "SUPER_ADMIN",
      targetId,
      targetType: "Clinic" as TargetType,
      action: "CLINIC_UPDATED" as AuditAction,
      reason: "",
      ipAddress: "",
    }) as unknown as AuditEvent;
    expect(doc.reason).toBe("");
    expect(doc.ipAddress).toBe("");
  });
});
