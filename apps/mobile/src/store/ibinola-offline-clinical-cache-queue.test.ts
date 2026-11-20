import { describe, expect, it } from "vitest";
import {
  beginReplay,
  cacheClinicalRecord,
  createIbinolaOfflineState,
  enqueueClinicalWrite,
  markReplaySuccess,
  readCachedRecord,
  wipeIbinolaOfflineState,
} from "./ibinola-offline-clinical-cache-queue";

describe("ibinola offline clinical cache and queue", () => {
  it("serves cached records within TTL", () => {
    let t = 1000;
    const opts = { ttlMs: 100, nowMs: () => t };
    let state = createIbinolaOfflineState();
    state = cacheClinicalRecord(state, { id: "p1", kind: "patient", clinicId: "c1", data: { name: "A" } }, opts);
    expect(readCachedRecord(state, "p1", opts)?.data.name).toBe("A");
    t = 1205;
    expect(readCachedRecord(state, "p1", opts)).toBeNull();
  });

  it("queues writes idempotently and replays once", () => {
    let state = createIbinolaOfflineState();
    state = enqueueClinicalWrite(state, { id: "w1", kind: "encounter", clinicId: "c1", payload: {}, idempotencyKey: "k1" });
    state = enqueueClinicalWrite(state, { id: "w2", kind: "encounter", clinicId: "c1", payload: {}, idempotencyKey: "k1" });
    expect(state.queue).toHaveLength(1);
    expect(beginReplay(state).toSend).toHaveLength(1);
    state = markReplaySuccess(state, "k1");
    expect(beginReplay(state).toSend).toHaveLength(0);
  });

  it("wipes state on logout intent", () => {
    let state = createIbinolaOfflineState();
    state = cacheClinicalRecord(state, { id: "p1", kind: "patient", clinicId: "c1", data: {} });
    state = wipeIbinolaOfflineState();
    expect(state.records).toEqual({});
    expect(state.queue).toEqual([]);
  });
});
