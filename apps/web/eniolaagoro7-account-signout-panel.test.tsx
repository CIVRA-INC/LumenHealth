import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Eniolaagoro7AccountSignoutPanel } from "./eniolaagoro7-account-signout-panel";

describe("eniolaagoro7 account sign-out panel", () => {
  it("renders account info and visible sign-out control", () => {
    render(<Eniolaagoro7AccountSignoutPanel email="a@b.com" role="clinician" onSignOut={() => undefined} signOutHref="/auth/logout" />);
    expect(screen.getByText("Account")).toBeTruthy();
    expect(screen.getByTestId("account-email").textContent).toContain("a@b.com");
    expect(screen.getByTestId("signout-button")).toBeTruthy();
    expect(screen.getByTestId("signout-link").getAttribute("href")).toBe("/auth/logout");
  });

  it("invokes sign-out action when clicked", () => {
    const onSignOut = vi.fn();
    render(<Eniolaagoro7AccountSignoutPanel onSignOut={onSignOut} />);
    fireEvent.click(screen.getByTestId("signout-button"));
    expect(onSignOut).toHaveBeenCalled();
  });
});
