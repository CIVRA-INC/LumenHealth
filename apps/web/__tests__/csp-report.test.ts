import { describe, expect, it, vi, afterEach } from "vitest";
import { POST } from "../app/csp-report/route";

function post(body: string): Request {
  return new Request("http://localhost/csp-report", {
    method: "POST",
    headers: { "Content-Type": "application/csp-report" },
    body,
  });
}

describe("POST /csp-report", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts a legacy csp-report payload and logs the violation", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await POST(
      post(
        JSON.stringify({
          "csp-report": {
            "document-uri": "https://app.example.com/audit",
            "violated-directive": "script-src-elem",
            "blocked-uri": "https://evil.example.com/x.js",
            "line-number": 12,
          },
        }),
      ),
    );

    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("script-src-elem");
    expect(warn.mock.calls[0]?.[0]).toContain("https://evil.example.com/x.js");
  });

  it("accepts a Reporting API batch payload", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await POST(
      post(
        JSON.stringify([
          {
            type: "csp-violation",
            "violated-directive": "frame-ancestors",
            "blocked-uri": "https://attacker.example.com",
            "document-uri": "https://app.example.com/",
          },
        ]),
      ),
    );

    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("frame-ancestors");
  });

  it("returns 204 without logging on malformed or non-violation bodies", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const bad = await POST(post("not json {"));
    expect(bad.status).toBe(204);

    const noDirective = await POST(post(JSON.stringify({ "csp-report": { foo: "bar" } })));
    expect(noDirective.status).toBe(204);

    const empty = await POST(post(JSON.stringify([])));
    expect(empty.status).toBe(204);

    expect(warn).not.toHaveBeenCalled();
  });
});
