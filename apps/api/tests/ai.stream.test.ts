import { describe, expect, it } from "vitest";
import { splitTextForSse, toSsePayload } from "../src/modules/ai/stream.utils";

describe("ai stream helpers", () => {
  it("splits text into non-empty SSE chunks", () => {
    const chunks = splitTextForSse("alpha   beta\n\n gamma");
    expect(chunks).toEqual(["alpha", "beta", "gamma"]);
  });

  it("formats chunk payload as SSE data frame", () => {
    const payload = toSsePayload("hello");
    expect(payload).toBe('data: {"chunk":"hello"}\n\n');
  });
});
