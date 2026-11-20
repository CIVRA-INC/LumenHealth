import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadJson, REVOKE_DELAY_MS } from "../lib/download";

describe("downloadJson (#1503)", () => {
  const createObjectURL = vi.fn(() => "blob:fake");
  const revokeObjectURL = vi.fn();
  let clicked: HTMLAnchorElement | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    clicked = null;
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked = this;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("clicks an anchor with the filename and a JSON blob", async () => {
    downloadJson("report.json", { a: 1 });

    expect(clicked?.download).toBe("report.json");
    expect(clicked?.href).toBe("blob:fake");
    const blob = createObjectURL.mock.calls[0][0] as unknown as Blob;
    expect(blob.type).toBe("application/json");
    expect(await blob.text()).toBe(JSON.stringify({ a: 1 }, null, 2));
    expect(document.querySelector("a[download]")).toBeNull();
  });

  it("revokes the object URL only after the delay", () => {
    downloadJson("report.json", {});

    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(REVOKE_DELAY_MS - 1);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  it("honors a custom delay", () => {
    downloadJson("report.json", {}, { revokeDelayMs: 10 });
    vi.advanceTimersByTime(10);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});
