import { describe, expect, it } from "vitest";
import { forbidden, unauthorized } from "../response-helpers.js";

function makeResponse() {
  const res = {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.payload = body;
      return this;
    },
  };

  return res;
}

describe("auth response helpers", () => {
  it("returns a 401 payload for unauthorized responses", () => {
    const res = makeResponse();
    unauthorized(res as never);

    expect(res.statusCode).toBe(401);
    expect(res.payload).toEqual({ error: "AUTH_TOKEN_INVALID", message: "unauthorized" });
  });

  it("returns a 403 payload for forbidden responses", () => {
    const res = makeResponse();
    forbidden(res as never, "access denied");

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ error: "AUTH_FORBIDDEN", message: "access denied" });
  });
});
