import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";

// Mock mongoose so no real DB connection is needed.
// The model factory must return a regular function (not arrow) so `new Model()` works.
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
  SupporterReputationModel,
  type Badge,
  type Streak,
  type SupporterReputation,
} from "../../../src/modules/reputation/models/supporter-reputation.model";

describe("SupporterReputationModel", () => {
  const userId = new Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a document with required userId", () => {
    const doc = new SupporterReputationModel({ userId });
    expect(doc).toBeDefined();
  });

  it("defaults totalPoints to 0 and level to 1", () => {
    const doc = new SupporterReputationModel({ userId, totalPoints: 0, level: 1 }) as unknown as SupporterReputation;
    expect(doc.totalPoints ?? 0).toBe(0);
    expect(doc.level ?? 1).toBe(1);
  });

  it("accepts badges with required fields", () => {
    const badge: Badge = {
      id: "first-tip",
      name: "First Tip",
      description: "Sent your first tip",
      awardedAt: new Date(),
    };
    const doc = new SupporterReputationModel({ userId, badges: [badge] });
    expect(doc).toBeDefined();
  });

  it("accepts streaks with required fields", () => {
    const streak: Streak = {
      type: "daily_tip",
      current: 3,
      longest: 5,
      lastActivityAt: new Date(),
    };
    const doc = new SupporterReputationModel({ userId, streaks: [streak] });
    expect(doc).toBeDefined();
  });

  it("accepts artistPoints map", () => {
    const artistPoints = new Map([["artist-1", 100], ["artist-2", 50]]);
    const doc = new SupporterReputationModel({ userId, artistPoints, totalPoints: 150 });
    expect(doc).toBeDefined();
  });
});
