import React from "react";
import { describe, expect, it, vi } from "vitest";
import { AbdulrcrtwRootErrorBoundary } from "./abdulrcrtw-root-error-boundary";

function Boom(): React.ReactElement {
  throw new Error("boom");
}

describe("abdulrcrtw root error boundary", () => {
  it("exposes a boundary class that catches render errors and reports", () => {
    const onError = vi.fn();
    const el = React.createElement(AbdulrcrtwRootErrorBoundary, { onError, children: React.createElement(Boom) });
    expect(el.type).toBe(AbdulrcrtwRootErrorBoundary);
    const inst = new (AbdulrcrtwRootErrorBoundary as any)({ onError, children: null });
    inst.componentDidCatch(new Error("boom"), { componentStack: "stack" });
    expect(onError).toHaveBeenCalled();
    expect(AbdulrcrtwRootErrorBoundary.getDerivedStateFromError()).toEqual({ hasError: true });
  });
});
