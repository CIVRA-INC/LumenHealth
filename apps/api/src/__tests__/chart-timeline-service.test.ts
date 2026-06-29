import { createChartService, fixtures as svcFixtures } from "../chart-timeline/service";
import type { Request, Response } from "express";

const service = createChartService();

export function handleServiceAddEntry(req: Request, res: Response) {
  const result = service.addEntry(req.params.patientId, req.body);
  if (!result.ok) { res.status(400).json(result); return; }
  res.status(201).json(result);
}

export function handleServiceGetTimeline(req: Request, res: Response) {
  const result = service.getTimeline(req.params.patientId);
  if (!result.ok) { res.status(404).json(result); return; }
  res.json(result);
}

describe("Chart Timeline Service", () => {
  beforeEach(() => service.reset());

  it("adds an entry", () => {
    const result = service.addEntry("pat_svc_01", svcFixtures.validInput);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.patientId).toBe("pat_svc_01");
  });

  it("rejects entry without required fields", () => {
    const result = service.addEntry("pat_svc_01", { date: "" } as unknown as typeof svcFixtures.validInput);
    expect(result.ok).toBe(false);
  });

  it("retrieves timeline", () => {
    service.addEntry("pat_svc_01", svcFixtures.validInput);
    const result = service.getTimeline("pat_svc_01");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it("returns not found for unknown patient", () => {
    const result = service.getTimeline("pat_unknown");
    expect(result.ok).toBe(false);
  });

  it("gets latest entry", () => {
    service.addEntry("pat_svc_01", { ...svcFixtures.validInput, date: "2026-06-01" });
    service.addEntry("pat_svc_01", { ...svcFixtures.validInput, date: "2026-07-01" });
    const result = service.getLatest("pat_svc_01");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.date).toBe("2026-07-01");
  });

  it("deletes an entry", () => {
    const added = service.addEntry("pat_svc_01", svcFixtures.validInput);
    if (!added.ok) throw new Error("setup failed");
    const deleted = service.deleteEntry("pat_svc_01", added.data.id);
    expect(deleted.ok).toBe(true);
    const timeline = service.getTimeline("pat_svc_01");
    expect(timeline.ok).toBe(false);
  });
});
