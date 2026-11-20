import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "../app/components/copy-button";

function setClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CopyButton (#1504)", () => {
  it("copies exactly the value and announces success, then resets after two seconds", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    render(<CopyButton value="abc123" label="Copy recorded hash" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy recorded hash" }));
    });

    expect(writeText).toHaveBeenCalledWith("abc123");
    expect(screen.getByRole("status")).toHaveTextContent("Copied");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("falls back to a textarea copy when the clipboard API rejects", async () => {
    setClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    const exec = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", { value: exec, configurable: true });
    render(<CopyButton value="abc123" label="Copy hash" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy hash" }));
    });

    expect(exec).toHaveBeenCalledWith("copy");
    expect(screen.getByRole("status")).toHaveTextContent("Copied");
  });

  it("shows a fallback message instead of throwing when every copy method fails", async () => {
    setClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    Object.defineProperty(document, "execCommand", { value: vi.fn().mockReturnValue(false), configurable: true });
    render(<CopyButton value="abc123" label="Copy hash" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy hash" }));
    });

    expect(screen.getByRole("status")).toHaveTextContent(/could not copy/i);
  });
});
